// Get Medication Adherence Lambda Function
// Requirements: 2.2, 2.5, 4.5

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, MedicationRecord } from '../shared/types';
import { getMedicationsByUser } from '../shared/data-access/medications';
import { checkPermission } from '../shared/access-control';

interface AdherenceStats {
  adherenceScore: number;
  totalMedications: number;
  takenCount: number;
  missedCount: number;
  scheduledCount: number;
  skippedCount: number;
  windowDays: number;
}

const ADHERENCE_WINDOW_DAYS = 7;

/**
 * Calculate adherence statistics for a user
 */
function calculateAdherenceStats(medications: MedicationRecord[]): AdherenceStats {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - ADHERENCE_WINDOW_DAYS);

  // Filter medications from the past week
  const recentMedications = medications.filter(
    med => med.scheduledTime >= weekAgo
  );

  const totalMedications = recentMedications.length;
  const takenCount = recentMedications.filter(med => med.status === 'taken').length;
  const missedCount = recentMedications.filter(med => med.status === 'missed').length;
  const scheduledCount = recentMedications.filter(med => med.status === 'scheduled').length;
  const skippedCount = recentMedications.filter(med => med.status === 'skipped').length;

  const adherenceScore = totalMedications > 0
    ? Math.round((takenCount / totalMedications) * 100)
    : 100;

  return {
    adherenceScore,
    totalMedications,
    takenCount,
    missedCount,
    scheduledCount,
    skippedCount,
    windowDays: ADHERENCE_WINDOW_DAYS,
  };
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
      return createErrorResponse(403, 'You do not have permission to view this user\'s medication adherence');
    }

    // Get medications
    const medications = await getMedicationsByUser(userId);

    // Calculate adherence statistics
    const stats = calculateAdherenceStats(medications);

    return createSuccessResponse({
      userId,
      adherence: stats,
      message: stats.adherenceScore >= 80
        ? 'Good medication adherence'
        : 'Medication adherence needs improvement',
    });
  } catch (error) {
    console.error('Error getting medication adherence:', error);
    return createErrorResponse(500, 'Failed to retrieve medication adherence');
  }
}
