// Update Alert Preferences Lambda Function
// Requirements: 9.2
// Updates alert notification preferences for a care circle member

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, AlertPreferences, NotificationChannel, AlertType, AlertSeverity } from '../shared/types';
import { getUser } from '../shared/data-access/users';
import { updateItem, TABLES } from '../shared/dynamodb-client';
import { logAuditEvent } from '../shared/audit-logger';

interface UpdatePreferencesRequest {
  channels?: NotificationChannel[];
  quietHours?: { start: string; end: string };
  alertTypes?: {
    [key in AlertType]?: {
      enabled: boolean;
      urgencyLevels: AlertSeverity[];
    };
  };
}

/**
 * Validate notification channels
 */
function validateChannels(channels: NotificationChannel[]): boolean {
  const validChannels: NotificationChannel[] = ['push', 'sms', 'email', 'voice'];
  return channels.every(channel => validChannels.includes(channel));
}

/**
 * Validate alert types
 */
function validateAlertTypes(alertTypes: UpdatePreferencesRequest['alertTypes']): boolean {
  if (!alertTypes) return true;

  const validAlertTypes: AlertType[] = [
    'vital_signs', 'medication', 'appointment', 'emergency', 
    'device', 'check_in', 'fall_detection'
  ];
  const validSeverities: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];

  for (const [type, config] of Object.entries(alertTypes)) {
    if (!validAlertTypes.includes(type as AlertType)) {
      return false;
    }
    if (!config.urgencyLevels.every(level => validSeverities.includes(level))) {
      return false;
    }
  }

  return true;
}

/**
 * Validate quiet hours format
 */
function validateQuietHours(quietHours: { start: string; end: string }): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(quietHours.start) && timeRegex.test(quietHours.end);
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

    // Users can only update their own preferences
    if (requestingUserId !== userId) {
      return createErrorResponse(403, 'You can only update your own alert preferences');
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: UpdatePreferencesRequest = JSON.parse(event.body);

    // Validate channels if provided
    if (request.channels && !validateChannels(request.channels)) {
      return createErrorResponse(400, 'Invalid notification channels');
    }

    // Validate alert types if provided
    if (request.alertTypes && !validateAlertTypes(request.alertTypes)) {
      return createErrorResponse(400, 'Invalid alert types or urgency levels');
    }

    // Validate quiet hours if provided
    if (request.quietHours && !validateQuietHours(request.quietHours)) {
      return createErrorResponse(400, 'Invalid quiet hours format (use HH:MM)');
    }

    // Get current user to merge preferences
    const user = await getUser(userId);
    if (!user) {
      return createErrorResponse(404, 'User not found');
    }

    // Merge with existing preferences
    const currentPreferences = (user as any).alertPreferences || {
      channels: ['push', 'sms', 'email'],
      alertTypes: {},
    };

    const updatedPreferences: AlertPreferences = {
      channels: request.channels || currentPreferences.channels,
      quietHours: request.quietHours || currentPreferences.quietHours,
      alertTypes: {
        ...currentPreferences.alertTypes,
        ...request.alertTypes,
      },
    };

    // Update user preferences in DynamoDB
    await updateItem(
      TABLES.USERS,
      { userId },
      'SET alertPreferences = :preferences, lastActive = :lastActive',
      {
        ':preferences': updatedPreferences,
        ':lastActive': new Date().toISOString(),
      }
    );

    // Log audit event
    await logAuditEvent({
      userId,
      action: 'update_alert_preferences',
      resourceType: 'user_preferences',
      resourceId: userId,
      details: {
        updatedFields: Object.keys(request),
      },
      ipAddress: event.requestContext.identity?.sourceIp,
      userAgent: event.requestContext.identity?.userAgent,
    });

    return createSuccessResponse({
      message: 'Alert preferences updated successfully',
      userId,
      preferences: updatedPreferences,
    });
  } catch (error) {
    console.error('Error updating alert preferences:', error);
    return createErrorResponse(500, 'Failed to update alert preferences');
  }
}
