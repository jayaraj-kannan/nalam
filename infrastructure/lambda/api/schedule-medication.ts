// Schedule Medication Lambda Function
// Requirements: 2.1, 2.4

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, Medication } from '../shared/types';
import { createMedicationRecord } from '../shared/data-access/medications';
import { logAuditEvent } from '../shared/audit-logger';

interface ScheduleMedicationRequest {
  userId: string;
  medication: Medication;
  scheduledTime: string; // ISO string
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: ScheduleMedicationRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.userId || !request.medication || !request.scheduledTime) {
      return createErrorResponse(400, 'Missing required fields: userId, medication, scheduledTime');
    }

    // Validate medication fields
    if (!request.medication.name || !request.medication.dosage || !request.medication.frequency) {
      return createErrorResponse(400, 'Medication must include name, dosage, and frequency');
    }

    // Create medication record
    const medicationId = await createMedicationRecord({
      userId: request.userId,
      medication: request.medication,
      scheduledTime: new Date(request.scheduledTime),
      status: 'scheduled',
      adherenceScore: 100, // Initial score
    });

    // Log audit event
    await logAuditEvent({
      eventType: 'MEDICATION_SCHEDULED',
      userId: request.userId,
      userType: 'primary',
      action: 'SCHEDULE_MEDICATION',
      resource: `medication/${medicationId}`,
      timestamp: new Date().toISOString(),
      success: true,
    });

    return createSuccessResponse({
      medicationId,
      message: 'Medication scheduled successfully',
    });
  } catch (error) {
    console.error('Error scheduling medication:', error);
    return createErrorResponse(500, 'Failed to schedule medication');
  }
}
