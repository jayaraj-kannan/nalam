// Get Alert Preferences Lambda Function
// Requirements: 9.2
// Retrieves alert notification preferences for a care circle member

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, AlertPreferences } from '../shared/types';
import { getUser } from '../shared/data-access/users';

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

    // Users can only view their own preferences
    if (requestingUserId !== userId) {
      return createErrorResponse(403, 'You can only view your own alert preferences');
    }

    // Get user
    const user = await getUser(userId);
    if (!user) {
      return createErrorResponse(404, 'User not found');
    }

    // Get alert preferences from user profile
    const alertPreferences = (user as any).alertPreferences || {
      channels: ['push', 'sms', 'email'],
      alertTypes: {
        vital_signs: { enabled: true, urgencyLevels: ['high', 'critical'] },
        medication: { enabled: true, urgencyLevels: ['medium', 'high', 'critical'] },
        appointment: { enabled: true, urgencyLevels: ['medium', 'high', 'critical'] },
        emergency: { enabled: true, urgencyLevels: ['critical'] },
        device: { enabled: true, urgencyLevels: ['high', 'critical'] },
        check_in: { enabled: true, urgencyLevels: ['high', 'critical'] },
        fall_detection: { enabled: true, urgencyLevels: ['critical'] },
      },
    };

    return createSuccessResponse({
      userId,
      preferences: alertPreferences,
    });
  } catch (error) {
    console.error('Error getting alert preferences:', error);
    return createErrorResponse(500, 'Failed to retrieve alert preferences');
  }
}
