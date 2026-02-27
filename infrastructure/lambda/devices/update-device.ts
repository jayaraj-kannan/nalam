// Update Device Lambda Function
// Requirements: 7.2

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, HealthDevice } from '../shared/types';
import { getDevice, updateDevice } from '../shared/data-access/devices';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Update device request:', JSON.stringify(event, null, 2));

  try {
    const deviceId = event.pathParameters?.deviceId;

    if (!deviceId) {
      return createErrorResponse(400, 'Device ID is required');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    // Check if device exists
    const existingDevice = await getDevice(deviceId);
    if (!existingDevice) {
      return createErrorResponse(404, 'Device not found');
    }

    // Parse update request
    const updates: Partial<HealthDevice> = JSON.parse(event.body);

    // Prevent updating immutable fields
    delete updates.id;
    delete updates.userId;

    // Update device
    await updateDevice(deviceId, updates);

    // Get updated device
    const updatedDevice = await getDevice(deviceId);

    return createSuccessResponse(updatedDevice);
  } catch (error) {
    console.error('Error updating device:', error);
    return createErrorResponse(500, `Failed to update device: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
