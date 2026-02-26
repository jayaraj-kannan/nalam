// Get Alerts Lambda Function
// Requirements: 9.2, 9.3

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { getAlertsByUser, getAlertsByStatus } from '../shared/data-access/alerts';
import { logAuditEvent } from '../shared/audit-logger';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.userId;
    const status = event.queryStringParameters?.status;
    const startTime = event.queryStringParameters?.startTime;
    const endTime = event.queryStringParameters?.endTime;
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 50;

    if (!userId && !status) {
      return createErrorResponse(400, 'Either userId or status query parameter is required');
    }

    let alerts;

    if (userId) {
      // Get alerts by user
      alerts = await getAlertsByUser(
        userId,
        startTime ? new Date(startTime) : undefined,
        endTime ? new Date(endTime) : undefined,
        limit
      );

      // Log audit event
      await logAuditEvent({
        eventType: 'ALERTS_VIEWED',
        userId: event.requestContext.authorizer?.claims?.sub || 'unknown',
        userType: 'secondary',
        action: 'VIEW_ALERTS',
        resource: `alerts/user/${userId}`,
        timestamp: new Date().toISOString(),
        success: true,
      });
    } else if (status) {
      // Get alerts by status
      alerts = await getAlertsByStatus(
        status,
        startTime ? new Date(startTime) : undefined,
        endTime ? new Date(endTime) : undefined,
        limit
      );
    }

    // Sort alerts by severity (critical first) and then by timestamp (newest first)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts?.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return createSuccessResponse({
      alerts,
      count: alerts?.length || 0,
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    return createErrorResponse(500, 'Failed to get alerts');
  }
}
