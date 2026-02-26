// Create Alert Lambda Function
// Requirements: 1.3, 2.3, 2.5, 3.1, 3.2

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, HealthAlert, AlertType, AlertSeverity } from '../shared/types';
import { createAlert } from '../shared/data-access/alerts';
import { logAuditEvent } from '../shared/audit-logger';

interface CreateAlertRequest {
  userId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  relatedData?: Record<string, unknown>;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: CreateAlertRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.userId || !request.type || !request.severity || !request.message) {
      return createErrorResponse(400, 'Missing required fields: userId, type, severity, message');
    }

    // Validate severity
    const validSeverities: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(request.severity)) {
      return createErrorResponse(400, 'Invalid severity. Must be one of: low, medium, high, critical');
    }

    // Validate alert type
    const validTypes: AlertType[] = ['vital_signs', 'medication', 'appointment', 'emergency', 'device', 'check_in', 'fall_detection'];
    if (!validTypes.includes(request.type)) {
      return createErrorResponse(400, 'Invalid alert type');
    }

    // Create alert
    const alertId = await createAlert({
      userId: request.userId,
      type: request.type,
      severity: request.severity,
      message: request.message,
      timestamp: new Date(),
      acknowledged: false,
      escalated: false,
      relatedData: request.relatedData,
    });

    // Log audit event
    await logAuditEvent({
      eventType: 'ALERT_CREATED',
      userId: request.userId,
      userType: 'primary',
      action: 'CREATE_ALERT',
      resource: `alert/${alertId}`,
      timestamp: new Date().toISOString(),
      success: true,
    });

    return createSuccessResponse({
      alertId,
      message: 'Alert created successfully',
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    return createErrorResponse(500, 'Failed to create alert');
  }
}
