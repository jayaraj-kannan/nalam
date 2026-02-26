// Update Appointment Lambda Function
// Requirements: 6.5

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { updateAppointment, getAppointment } from '../shared/data-access/appointments';
import { createSuccessResponse, createErrorResponse, AppointmentStatus } from '../shared/types';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridgeClient = new EventBridgeClient({});

interface UpdateAppointmentRequest {
  status?: AppointmentStatus;
  scheduledTime?: string;
  duration?: number;
  location?: string;
  notes?: string;
  preparationInstructions?: string;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('Update appointment request:', JSON.stringify(event));

    // Get parameters
    const userId = event.pathParameters?.userId;
    const appointmentId = event.pathParameters?.appointmentId;

    if (!userId || !appointmentId) {
      return createErrorResponse(400, 'userId and appointmentId are required');
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: UpdateAppointmentRequest = JSON.parse(event.body);

    // Validate status if provided
    if (request.status) {
      const validStatuses: AppointmentStatus[] = ['scheduled', 'confirmed', 'completed', 'cancelled', 'missed'];
      if (!validStatuses.includes(request.status)) {
        return createErrorResponse(400, 'Invalid appointment status');
      }
    }

    // Validate scheduledTime if provided
    let scheduledTime: Date | undefined;
    if (request.scheduledTime) {
      scheduledTime = new Date(request.scheduledTime);
      if (isNaN(scheduledTime.getTime())) {
        return createErrorResponse(400, 'Invalid scheduledTime format');
      }
    }

    // Build updates object
    const updates: any = {};
    if (request.status) updates.status = request.status;
    if (scheduledTime) updates.scheduledTime = scheduledTime;
    if (request.duration !== undefined) updates.duration = request.duration;
    if (request.location !== undefined) updates.location = request.location;
    if (request.notes !== undefined) updates.notes = request.notes;
    if (request.preparationInstructions !== undefined) {
      updates.preparationInstructions = request.preparationInstructions;
    }

    // Update appointment
    await updateAppointment(userId, appointmentId, updates);

    console.log('Appointment updated:', appointmentId);

    // Publish event if status changed
    if (request.status) {
      try {
        const appointment = await getAppointment(userId, appointmentId);
        await eventBridgeClient.send(new PutEventsCommand({
          Entries: [{
            Source: 'healthcare.appointments',
            DetailType: 'AppointmentStatusChanged',
            Detail: JSON.stringify({
              appointmentId,
              userId,
              status: request.status,
              scheduledTime: appointment?.scheduledTime.toISOString(),
            }),
            EventBusName: process.env.EVENT_BUS_NAME || 'healthcare-events-dev',
          }],
        }));
      } catch (error) {
        console.error('Error publishing AppointmentStatusChanged event:', error);
      }
    }

    return createSuccessResponse({
      message: 'Appointment updated successfully',
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return createErrorResponse(500, 'Failed to update appointment');
  }
}
