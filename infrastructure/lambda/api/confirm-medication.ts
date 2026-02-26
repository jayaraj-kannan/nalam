// Confirm Medication Taken Lambda Function
// Requirements: 2.2

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { updateMedicationStatus, getMedicationRecord } from '../shared/data-access/medications';
import { logAuditEvent } from '../shared/audit-logger';

interface ConfirmMedicationRequest {
  userId: string;
  medicationId: string;
  takenTime?: string; // ISO string, defaults to now
  notes?: string;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: ConfirmMedicationRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.userId || !request.medicationId) {
      return createErrorResponse(400, 'Missing required fields: userId, medicationId');
    }

    // Verify medication exists
    const medication = await getMedicationRecord(request.userId, request.medicationId);
    if (!medication) {
      return createErrorResponse(404, 'Medication record not found');
    }

    // Update medication status to taken
    const takenTime = request.takenTime ? new Date(request.takenTime) : new Date();
    await updateMedicationStatus(
      request.userId,
      request.medicationId,
      'taken',
      takenTime,
      request.notes
    );

    // Log audit event
    await logAuditEvent({
      eventType: 'MEDICATION_TAKEN',
      userId: request.userId,
      userType: 'primary',
      action: 'CONFIRM_MEDICATION',
      resource: `medication/${request.medicationId}`,
      timestamp: new Date().toISOString(),
      success: true,
    });

    return createSuccessResponse({
      message: 'Medication confirmed as taken',
      medicationId: request.medicationId,
      takenTime: takenTime.toISOString(),
    });
  } catch (error) {
    console.error('Error confirming medication:', error);
    return createErrorResponse(500, 'Failed to confirm medication');
  }
}
