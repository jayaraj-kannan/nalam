// Check Medication Adherence Lambda Function
// Requirements: 2.2, 2.3, 2.5
// Triggered periodically to check for missed medications and adherence compliance

import { EventBridgeEvent } from 'aws-lambda';
import { getMedicationsByUser, updateMedicationStatus, updateAdherenceScore } from '../shared/data-access/medications';
import { createAlert } from '../shared/data-access/alerts';
import { getCareCircleMembers } from '../shared/data-access/care-circle';
import { sendNotificationToCareCircle } from '../shared/notification-service';
import { HealthAlert, MedicationRecord } from '../shared/types';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodbClient = new DynamoDBClient({});

const MISSED_MEDICATION_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const ADHERENCE_THRESHOLD = 80; // 80% adherence threshold
const ADHERENCE_WINDOW_DAYS = 7; // Calculate adherence over 7 days

interface AdherenceCheckEvent {
  source: string;
  'detail-type': string;
  detail?: {
    checkTime?: string;
  };
}

/**
 * Get all users who have medications
 */
async function getAllUsersWithMedications(): Promise<string[]> {
  const userIds = new Set<string>();
  
  try {
    const result = await dynamodbClient.send(new ScanCommand({
      TableName: process.env.MEDICATIONS_TABLE || 'healthcare-medications-dev',
      ProjectionExpression: 'userId',
    }));

    if (result.Items) {
      result.Items.forEach(item => {
        const unmarshalled = unmarshall(item);
        if (unmarshalled.userId) {
          userIds.add(unmarshalled.userId as string);
        }
      });
    }
  } catch (error) {
    console.error('Error scanning medications table:', error);
  }

  return Array.from(userIds);
}

/**
 * Check if medication is missed (30 minutes past scheduled time)
 */
function isMedicationMissed(scheduledTime: Date, currentTime: Date): boolean {
  const timeDiff = currentTime.getTime() - scheduledTime.getTime();
  return timeDiff >= MISSED_MEDICATION_THRESHOLD_MS;
}

/**
 * Calculate adherence score for a user over the past week
 */
function calculateAdherenceScore(medications: MedicationRecord[]): number {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - ADHERENCE_WINDOW_DAYS);

  // Filter medications from the past week
  const recentMedications = medications.filter(
    med => med.scheduledTime >= weekAgo
  );

  if (recentMedications.length === 0) {
    return 100; // No medications scheduled, perfect adherence
  }

  // Count taken medications
  const takenCount = recentMedications.filter(
    med => med.status === 'taken'
  ).length;

  // Calculate percentage
  const adherenceScore = (takenCount / recentMedications.length) * 100;
  return Math.round(adherenceScore);
}

/**
 * Mark medication as missed and notify care circle
 */
async function handleMissedMedication(
  userId: string,
  medication: MedicationRecord
): Promise<void> {
  try {
    // Update medication status to missed
    await updateMedicationStatus(
      userId,
      medication.id,
      'missed'
    );

    // Create alert for missed medication
    const alertId = await createAlert({
      userId,
      type: 'medication',
      severity: 'medium',
      message: `Missed medication: ${medication.medication.name} (${medication.medication.dosage}) scheduled at ${medication.scheduledTime.toLocaleTimeString()}`,
      timestamp: new Date(),
      acknowledged: false,
      escalated: false,
      relatedData: {
        medicationId: medication.id,
        medicationName: medication.medication.name,
        dosage: medication.medication.dosage,
        scheduledTime: medication.scheduledTime.toISOString(),
      },
    });

    // Get care circle members
    const careCircleMembers = await getCareCircleMembers(userId);
    
    if (careCircleMembers.length > 0) {
      // Notify care circle
      const alert: HealthAlert = {
        id: alertId,
        userId,
        type: 'medication',
        severity: 'medium',
        message: `${medication.medication.name} medication was missed`,
        timestamp: new Date(),
        acknowledged: false,
        escalated: false,
      };

      await sendNotificationToCareCircle(
        careCircleMembers.map(m => m.secondaryUserId),
        alert,
        ['push', 'sms', 'email']
      );
    }

    console.log(`Marked medication ${medication.id} as missed for user ${userId}`);
  } catch (error) {
    console.error('Error handling missed medication:', error);
  }
}

/**
 * Check adherence compliance and generate alert if below threshold
 */
async function checkAdherenceCompliance(
  userId: string,
  adherenceScore: number
): Promise<void> {
  try {
    if (adherenceScore < ADHERENCE_THRESHOLD) {
      // Create compliance alert
      const alertId = await createAlert({
        userId,
        type: 'medication',
        severity: 'high',
        message: `Medication adherence is below ${ADHERENCE_THRESHOLD}%. Current adherence: ${adherenceScore}%`,
        timestamp: new Date(),
        acknowledged: false,
        escalated: false,
        relatedData: {
          adherenceScore,
          threshold: ADHERENCE_THRESHOLD,
          windowDays: ADHERENCE_WINDOW_DAYS,
        },
      });

      // Get care circle members
      const careCircleMembers = await getCareCircleMembers(userId);
      
      if (careCircleMembers.length > 0) {
        // Notify care circle
        const alert: HealthAlert = {
          id: alertId,
          userId,
          type: 'medication',
          severity: 'high',
          message: `Medication adherence alert: ${adherenceScore}% over the past week`,
          timestamp: new Date(),
          acknowledged: false,
          escalated: false,
        };

        await sendNotificationToCareCircle(
          careCircleMembers.map(m => m.secondaryUserId),
          alert,
          ['push', 'sms', 'email']
        );
      }

      console.log(`Adherence compliance alert created for user ${userId}: ${adherenceScore}%`);
    }
  } catch (error) {
    console.error('Error checking adherence compliance:', error);
  }
}

/**
 * Main handler for adherence check event
 */
export async function handler(event: EventBridgeEvent<string, AdherenceCheckEvent>): Promise<void> {
  try {
    console.log('Checking medication adherence:', JSON.stringify(event));

    const detail = event.detail as { checkTime?: string } | undefined;
    const checkTime = (detail && detail.checkTime) 
      ? new Date(detail.checkTime) 
      : new Date();
    console.log('Check time:', checkTime.toISOString());

    // Get all users with medications
    const userIds = await getAllUsersWithMedications();
    console.log(`Checking adherence for ${userIds.length} users`);

    // Check each user's medications
    for (const userId of userIds) {
      try {
        const medications = await getMedicationsByUser(userId);
        
        // Check for missed medications
        for (const medication of medications) {
          if (medication.status === 'scheduled') {
            if (isMedicationMissed(medication.scheduledTime, checkTime)) {
              await handleMissedMedication(userId, medication);
            }
          }
        }

        // Calculate adherence score
        const adherenceScore = calculateAdherenceScore(medications);
        
        // Update adherence score for recent medications
        const recentMedications = medications.filter(
          med => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - ADHERENCE_WINDOW_DAYS);
            return med.scheduledTime >= weekAgo;
          }
        );

        for (const medication of recentMedications) {
          await updateAdherenceScore(userId, medication.id, adherenceScore);
        }

        // Check adherence compliance
        await checkAdherenceCompliance(userId, adherenceScore);

        console.log(`User ${userId} adherence score: ${adherenceScore}%`);
      } catch (error) {
        console.error(`Error processing adherence for user ${userId}:`, error);
        // Continue with next user
      }
    }

    console.log('Medication adherence check complete');
  } catch (error) {
    console.error('Error in adherence check handler:', error);
    throw error;
  }
}
