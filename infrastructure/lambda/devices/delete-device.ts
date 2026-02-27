// Delete Device Lambda Function
// Requirements: 7.2

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { IoTClient, DeleteThingCommand, DetachThingPrincipalCommand, ListThingPrincipalsCommand, UpdateCertificateCommand, DetachPolicyCommand, DeleteCertificateCommand } from '@aws-sdk/client-iot';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { getDevice, deleteDevice as removeDevice } from '../shared/data-access/devices';

const iotClient = new IoTClient({});
const IOT_POLICY_NAME = process.env.IOT_POLICY_NAME!;

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Delete device request:', JSON.stringify(event, null, 2));

  try {
    const deviceId = event.pathParameters?.deviceId;

    if (!deviceId) {
      return createErrorResponse(400, 'Device ID is required');
    }

    // Check if device exists
    const device = await getDevice(deviceId);
    if (!device) {
      return createErrorResponse(404, 'Device not found');
    }

    const thingName = `healthcare-device-${deviceId}`;

    try {
      // List thing principals (certificates)
      const listPrincipalsCommand = new ListThingPrincipalsCommand({
        thingName,
      });

      const principals = await iotClient.send(listPrincipalsCommand);

      // Detach and delete each certificate
      if (principals.principals && principals.principals.length > 0) {
        for (const principal of principals.principals) {
          // Detach certificate from thing
          const detachThingCommand = new DetachThingPrincipalCommand({
            thingName,
            principal,
          });
          await iotClient.send(detachThingCommand);

          // Detach policy from certificate
          const detachPolicyCommand = new DetachPolicyCommand({
            policyName: IOT_POLICY_NAME,
            target: principal,
          });
          await iotClient.send(detachPolicyCommand);

          // Deactivate certificate
          const certificateId = principal.split('/').pop();
          if (certificateId) {
            const updateCertCommand = new UpdateCertificateCommand({
              certificateId,
              newStatus: 'INACTIVE',
            });
            await iotClient.send(updateCertCommand);

            // Delete certificate
            const deleteCertCommand = new DeleteCertificateCommand({
              certificateId,
            });
            await iotClient.send(deleteCertCommand);
          }
        }
      }

      // Delete IoT Thing
      const deleteThingCommand = new DeleteThingCommand({
        thingName,
      });
      await iotClient.send(deleteThingCommand);
      console.log(`Deleted IoT Thing: ${thingName}`);
    } catch (iotError) {
      console.warn('Error cleaning up IoT resources:', iotError);
      // Continue with database deletion even if IoT cleanup fails
    }

    // Delete device from DynamoDB
    await removeDevice(deviceId);
    console.log(`Deleted device from database: ${deviceId}`);

    return createSuccessResponse({ message: 'Device deleted successfully', deviceId });
  } catch (error) {
    console.error('Error deleting device:', error);
    return createErrorResponse(500, `Failed to delete device: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
