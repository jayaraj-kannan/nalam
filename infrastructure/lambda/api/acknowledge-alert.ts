// Acknowledge Alert Lambda Function
// Requirements: 9.5

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { acknowledgeAlert, getAlert } from '../shared/data-access/alerts';
import { getCareCircleMembers } from '../shared/data-access/care-circle';
import { logAuditEvent } from '../shared/audit-logger';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridge = new EventBridgeClient({});

interface AcknowledgeAlertRequest {
  alertId: string;
  timestamp: string;
  acknowledgedBy: string;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: AcknowledgeAlertRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.alertId || !request.timestamp || !request.acknowledgedBy) {
      return createErrorResponse(400, 'Missing required fields: alertId, timestamp, acknowledgedBy');
    }

    // Get the alert to verify it exists
    const alert = await getAlert(request.alertId, request.timestamp);
    if (!alert) {
      return createErrorResponse(404, 'Alert not found');
    }

    // Acknowledge the alert
    await acknowledgeAlert(request.alertId, request.timestamp, request.acknowledgedBy);

    // Get care circle members to notify them
    const careCircleMembers = await getCareCircleMembers(alert.userId);

    // Publish event to notify care circle members
    await eventBridge.send(new PutEventsCommand({
      Entries: [{
        Source: 'healthcare.alerts',
        DetailType: 'AlertAcknowledged',
        Detail: JSON.stringify({
          alertId: request.alertId,
          userId: alert.userId,
          acknowledgedBy: request.acknowledgedBy,
          acknowledgedAt: new Date().toISOString(),
          careCircleMembers: careCircleMembers.map(m => m.secondaryUserId),
        }),
        EventBusName: process.env.EVENT_BUS_NAME || 'default',
      }],
    }));

    // Log audit event
    await logAuditEvent({
      eventType: 'ALERT_ACKNOWLEDGED',
      userId: request.acknowledgedBy,
      userType: 'secondary',
      action: 'ACKNOWLEDGE_ALERT',
      resource: `alert/${request.alertId}`,
      timestamp: new Date().toISOString(),
      success: true,
    });

    return createSuccessResponse({
      message: 'Alert acknowledged successfully',
      alertId: request.alertId,
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return createErrorResponse(500, 'Failed to acknowledge alert');
  }
}
