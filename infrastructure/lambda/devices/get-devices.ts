// Get Devices Lambda Function
// Requirements: 7.2

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { getDevice, getDevicesByUser } from '../shared/data-access/devices';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Get devices request:', JSON.stringify(event, null, 2));

  try {
    const deviceId = event.pathParameters?.deviceId;
    const userId = event.queryStringParameters?.userId;

    // Get specific device by ID
    if (deviceId) {
      const device = await getDevice(deviceId);
      
      if (!device) {
        return createErrorResponse(404, 'Device not found');
      }

      return createSuccessResponse(device);
    }

    // Get all devices for a user
    if (userId) {
      const devices = await getDevicesByUser(userId);
      return createSuccessResponse({ devices, count: devices.length });
    }

    return createErrorResponse(400, 'Either deviceId or userId parameter is required');
  } catch (error) {
    console.error('Error getting devices:', error);
    return createErrorResponse(500, `Failed to get devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
