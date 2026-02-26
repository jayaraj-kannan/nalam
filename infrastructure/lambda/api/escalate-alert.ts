// Escalate Alert Lambda Function
// Requirements: 3.1, 3.2

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, EscalationLevel } from '../shared/types';
import { escalateAlert, getAlert } from '../shared/data-access/alerts';
import { logAuditEvent } from '../shared/audit-logger';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridge = new EventBridgeClient({});

interface EscalateAlertRequest {
  alertId: string;
  timestamp: string;
  escalationLevel: EscalationLevel;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: EscalateAlertRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.alertId || !request.timestamp || !request.escalationLevel) {
      return createErrorResponse(400, 'Missing required fields: alertId, timestamp, escalationLevel');
    }

    // Validate escalation level
    const validLevels: EscalationLevel[] = ['care_circle', 'emergency_contact', 'emergency_services'];
    if (!validLevels.includes(request.escalationLevel)) {
      return createErrorResponse(400, 'Invalid escalation level. Must be one of: care_circle, emergency_contact, emergency_services');
    }

    // Get the alert to verify it exists
    const alert = await getAlert(request.alertId, request.timestamp);
    if (!alert) {
      return createErrorResponse(404, 'Alert not found');
    }

    // Escalate the alert
    await escalateAlert(request.alertId, request.timestamp, request.escalationLevel);

    // Publish event to trigger escalation notifications
    await eventBridge.send(new PutEventsCommand({
      Entries: [{
        Source: 'healthcare.alerts',
        DetailType: 'AlertEscalated',
        Detail: JSON.stringify({
          alertId: request.alertId,
          userId: alert.userId,
          escalationLevel: request.escalationLevel,
          severity: alert.severity,
          type: alert.type,
          message: alert.message,
          timestamp: new Date().toISOString(),
        }),
        EventBusName: process.env.EVENT_BUS_NAME || 'default',
      }],
    }));

    // Log audit event
    await logAuditEvent({
      eventType: 'ALERT_ESCALATED',
      userId: alert.userId,
      userType: 'primary',
      action: 'ESCALATE_ALERT',
      resource: `alert/${request.alertId}`,
      timestamp: new Date().toISOString(),
      success: true,
    });

    return createSuccessResponse({
      message: 'Alert escalated successfully',
      alertId: request.alertId,
      escalationLevel: request.escalationLevel,
    });
  } catch (error) {
    console.error('Error escalating alert:', error);
    return createErrorResponse(500, 'Failed to escalate alert');
  }
}
