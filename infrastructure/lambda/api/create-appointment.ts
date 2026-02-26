// Create Appointment Lambda Function
// Requirements: 6.5

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createAppointment } from '../shared/data-access/appointments';
import { getCareCircleMembers } from '../shared/data-access/care-circle';
import { createSuccessResponse, createErrorResponse, AppointmentRecord, HealthcareProvider, ReminderSettings } from '../shared/types';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridgeClient = new EventBridgeClient({});

interface CreateAppointmentRequest {
  userId: string;
  provider: HealthcareProvider;
  type: 'checkup' | 'specialist' | 'emergency' | 'follow_up' | 'procedure' | 'lab_work';
  scheduledTime: string; // ISO timestamp
  duration?: number; // minutes
  reminders?: ReminderSettings;
  location?: string;
  notes?: string;
  preparationInstructions?: string;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('Create appointment request:', JSON.stringify(event));

    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: CreateAppointmentRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.userId || !request.provider || !request.type || !request.scheduledTime) {
      return createErrorResponse(400, 'Missing required fields: userId, provider, type, scheduledTime');
    }

    // Validate appointment type
    const validTypes = ['checkup', 'specialist', 'emergency', 'follow_up', 'procedure', 'lab_work'];
    if (!validTypes.includes(request.type)) {
      return createErrorResponse(400, 'Invalid appointment type');
    }

    // Parse scheduled time
    const scheduledTime = new Date(request.scheduledTime);
    if (isNaN(scheduledTime.getTime())) {
      return createErrorResponse(400, 'Invalid scheduledTime format');
    }

    // Validate scheduled time is in the future
    if (scheduledTime <= new Date()) {
      return createErrorResponse(400, 'Scheduled time must be in the future');
    }

    // Set default reminders if not provided
    const reminders: ReminderSettings = request.reminders || {
      enabled: true,
      times: [24, 2], // 24 hours and 2 hours before
      channels: ['push', 'sms', 'email'],
    };

    // Create appointment record
    const appointmentId = await createAppointment({
      userId: request.userId,
      provider: request.provider,
      type: request.type,
      scheduledTime,
      duration: request.duration,
      status: 'scheduled',
      reminders,
      location: request.location,
      notes: request.notes,
      preparationInstructions: request.preparationInstructions,
    });

    console.log('Appointment created:', appointmentId);

    // Publish event to EventBridge for care circle notification
    try {
      await eventBridgeClient.send(new PutEventsCommand({
        Entries: [{
          Source: 'healthcare.appointments',
          DetailType: 'AppointmentCreated',
          Detail: JSON.stringify({
            appointmentId,
            userId: request.userId,
            scheduledTime: scheduledTime.toISOString(),
            type: request.type,
            provider: request.provider.name,
          }),
          EventBusName: process.env.EVENT_BUS_NAME || 'healthcare-events-dev',
        }],
      }));
    } catch (error) {
      console.error('Error publishing AppointmentCreated event:', error);
      // Don't fail the request if event publishing fails
    }

    return createSuccessResponse({
      appointmentId,
      message: 'Appointment created successfully',
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return createErrorResponse(500, 'Failed to create appointment');
  }
}
