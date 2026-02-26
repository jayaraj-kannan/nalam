// Get Appointments Lambda Function
// Requirements: 6.5

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getAppointmentsByUser, getUpcomingAppointments } from '../shared/data-access/appointments';
import { createSuccessResponse, createErrorResponse } from '../shared/types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('Get appointments request:', JSON.stringify(event));

    // Get userId from path parameters
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const upcoming = queryParams.upcoming === 'true';
    const startTime = queryParams.startTime ? new Date(queryParams.startTime) : undefined;
    const endTime = queryParams.endTime ? new Date(queryParams.endTime) : undefined;
    const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : undefined;

    let appointments;

    if (upcoming) {
      // Get upcoming appointments
      const now = startTime || new Date();
      appointments = await getUpcomingAppointments(userId, now, endTime, limit);
    } else {
      // Get all appointments for user
      appointments = await getAppointmentsByUser(userId, limit);
    }

    return createSuccessResponse({
      appointments,
      count: appointments.length,
    });
  } catch (error) {
    console.error('Error getting appointments:', error);
    return createErrorResponse(500, 'Failed to get appointments');
  }
}
