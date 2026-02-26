// Send Medication Reminders Lambda Function
// Requirements: 2.1
// Triggered by EventBridge scheduled rules to send medication reminders

import { EventBridgeEvent } from 'aws-lambda';
import { getMedicationsByUser } from '../shared/data-access/medications';
import { getUser } from '../shared/data-access/users';
import { sendNotification } from '../shared/notification-service';
import { HealthAlert, NotificationChannel } from '../shared/types';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodbClient = new DynamoDBClient({});

interface MedicationReminderEvent {
  source: string;
  'detail-type': string;
  detail?: {
    checkTime?: string; // ISO timestamp to check for upcoming medications
  };
}

/**
 * Get all users who have medications scheduled
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
 * Check if medication reminder should be sent
 * Send reminder at scheduled time (within 5 minute window)
 */
function shouldSendReminder(scheduledTime: Date, checkTime: Date): boolean {
  const timeDiff = scheduledTime.getTime() - checkTime.getTime();
  // Send reminder if scheduled time is within next 5 minutes
  return timeDiff >= 0 && timeDiff <= 5 * 60 * 1000;
}

/**
 * Send medication reminder to user
 */
async function sendMedicationReminder(
  userId: string,
  medicationName: string,
  dosage: string,
  scheduledTime: Date
): Promise<void> {
  try {
    const user = await getUser(userId);
    if (!user) {
      console.error('User not found:', userId);
      return;
    }

    // Create alert for medication reminder
    const alert: HealthAlert = {
      id: `med-reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: 'medication',
      severity: 'medium',
      message: `Time to take your medication: ${medicationName} (${dosage})`,
      timestamp: new Date(),
      acknowledged: false,
      escalated: false,
      relatedData: {
        medicationName,
        dosage,
        scheduledTime: scheduledTime.toISOString(),
      },
    };

    // Get user's preferred notification channels
    const channels: NotificationChannel[] = ('preferences' in user && user.preferences?.notificationChannels) 
      ? user.preferences.notificationChannels 
      : ['push', 'sms'];

    // Send notification via multiple channels
    await sendNotification({
      recipient: userId,
      alert,
      channels,
      priority: 'normal',
    });

    console.log(`Medication reminder sent to user ${userId} for ${medicationName}`);
  } catch (error) {
    console.error('Error sending medication reminder:', error);
  }
}

/**
 * Main handler for medication reminder event
 */
export async function handler(event: EventBridgeEvent<string, MedicationReminderEvent>): Promise<void> {
  try {
    console.log('Processing medication reminders:', JSON.stringify(event));

    const detail = event.detail as { checkTime?: string } | undefined;
    const checkTime = (detail && detail.checkTime) 
      ? new Date(detail.checkTime) 
      : new Date();
    console.log('Checking for medications scheduled around:', checkTime.toISOString());

    // Get all users with medications
    const userIds = await getAllUsersWithMedications();
    console.log(`Found ${userIds.length} users with medications`);

    // Check each user's medications
    for (const userId of userIds) {
      try {
        const medications = await getMedicationsByUser(userId);
        
        for (const medRecord of medications) {
          // Only send reminders for scheduled medications
          if (medRecord.status === 'scheduled') {
            if (shouldSendReminder(medRecord.scheduledTime, checkTime)) {
              await sendMedicationReminder(
                userId,
                medRecord.medication.name,
                medRecord.medication.dosage,
                medRecord.scheduledTime
              );
            }
          }
        }
      } catch (error) {
        console.error(`Error processing medications for user ${userId}:`, error);
        // Continue with next user
      }
    }

    console.log('Medication reminders processing complete');
  } catch (error) {
    console.error('Error in medication reminder handler:', error);
    throw error;
  }
}
