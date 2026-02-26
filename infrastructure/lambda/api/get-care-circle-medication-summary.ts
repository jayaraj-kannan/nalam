// Get Care Circle Medication Summary Lambda Function
// Requirements: 4.5, 2.4
// Provides medication adherence and schedule information for care circle members

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, MedicationRecord } from '../shared/types';
import { getMedicationsByUser } from '../shared/data-access/medications';
import { checkPermission } from '../shared/access-control';

interface MedicationSummary {
  upcomingMedications: Array<{
    medicationName: string;
    dosage: string;
    scheduledTime: string;
    status: string;
  }>;
  recentActivity: Array<{
    medicationName: string;
    dosage: string;
    scheduledTime: string;
    takenTime?: string;
    status: string;
  }>;
  adherenceScore: number;
  missedCount: number;
  takenCount: number;
}

const ADHERENCE_WINDOW_DAYS = 7;

/**
 * Calculate adherence score
 */
function calculateAdherenceScore(medications: MedicationRecord[]): number {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - ADHERENCE_WINDOW_DAYS);

  const recentMedications = medications.filter(
    med => med.scheduledTime >= weekAgo
  );

  if (recentMedications.length === 0) {
    return 100;
  }

  const takenCount = recentMedications.filter(
    med => med.status === 'taken'
  ).length;

  return Math.round((takenCount / recentMedications.length) * 100);
}

/**
 * Get upcoming medications (next 24 hours)
 */
function getUpcomingMedications(medications: MedicationRecord[]): MedicationSummary['upcomingMedications'] {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return medications
    .filter(med => 
      med.status === 'scheduled' &&
      med.scheduledTime >= now &&
      med.scheduledTime <= tomorrow
    )
    .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
    .map(med => ({
      medicationName: med.medication.name,
      dosage: med.medication.dosage,
      scheduledTime: med.scheduledTime.toISOString(),
      status: med.status,
    }));
}

/**
 * Get recent medication activity (past 7 days)
 */
function getRecentActivity(medications: MedicationRecord[]): MedicationSummary['recentActivity'] {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - ADHERENCE_WINDOW_DAYS);

  return medications
    .filter(med => med.scheduledTime >= weekAgo)
    .sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime())
    .map(med => ({
      medicationName: med.medication.name,
      dosage: med.medication.dosage,
      scheduledTime: med.scheduledTime.toISOString(),
      takenTime: med.takenTime?.toISOString(),
      status: med.status,
    }));
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Get userId from path parameters
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return createErrorResponse(400, 'userId is required in path');
    }

    // Get requesting user from authorizer context
    const requestingUserId = event.requestContext.authorizer?.claims?.sub;
    if (!requestingUserId) {
      return createErrorResponse(401, 'Unauthorized');
    }

    // Check if requesting user has permission to view medications
    const hasPermission = await checkPermission(
      requestingUserId,
      'secondary',
      userId,
      'medications',
      'read'
    );

    if (!hasPermission) {
      return createErrorResponse(403, 'You do not have permission to view this user\'s medication information');
    }

    // Get all medications
    const medications = await getMedicationsByUser(userId);

    // Calculate statistics
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - ADHERENCE_WINDOW_DAYS);
    const recentMedications = medications.filter(med => med.scheduledTime >= weekAgo);
    
    const missedCount = recentMedications.filter(med => med.status === 'missed').length;
    const takenCount = recentMedications.filter(med => med.status === 'taken').length;
    const adherenceScore = calculateAdherenceScore(medications);

    // Build summary
    const summary: MedicationSummary = {
      upcomingMedications: getUpcomingMedications(medications),
      recentActivity: getRecentActivity(medications),
      adherenceScore,
      missedCount,
      takenCount,
    };

    return createSuccessResponse({
      userId,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting medication summary:', error);
    return createErrorResponse(500, 'Failed to retrieve medication summary');
  }
}
