// Delete Appointment Lambda Function
// Requirements: 6.5

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { deleteAppointment } from '../shared/data-access/appointments';
import { createSuccessResponse, createErrorResponse } from '../shared/types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('Delete appointment request:', JSON.stringify(event));

    // Get parameters
    const userId = event.pathParameters?.userId;
    const appointmentId = event.pathParameters?.appointmentId;

    if (!userId || !appointmentId) {
      return createErrorResponse(400, 'userId and appointmentId are required');
    }

    // Delete appointment
    await deleteAppointment(userId, appointmentId);

    console.log('Appointment deleted:', appointmentId);

    return createSuccessResponse({
      message: 'Appointment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return createErrorResponse(500, 'Failed to delete appointment');
  }
}
