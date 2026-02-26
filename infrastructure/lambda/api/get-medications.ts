// Get Medications Lambda Function
// Requirements: 2.4, 4.5

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { getMedicationsByUser } from '../shared/data-access/medications';
import { checkPermission } from '../shared/access-control';

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
      return createErrorResponse(403, 'You do not have permission to view this user\'s medications');
    }

    // Get medications
    const medications = await getMedicationsByUser(userId);

    return createSuccessResponse({
      medications,
      count: medications.length,
    });
  } catch (error) {
    console.error('Error getting medications:', error);
    return createErrorResponse(500, 'Failed to retrieve medications');
  }
}
