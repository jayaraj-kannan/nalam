// Device Registration Lambda Function
// Requirements: 7.2

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { IoTClient, CreateThingCommand, CreateKeysAndCertificateCommand, AttachThingPrincipalCommand, AttachPolicyCommand } from '@aws-sdk/client-iot';
import { createSuccessResponse, createErrorResponse, HealthDevice, DeviceType, DeviceCapability, ConnectionType } from '../shared/types';
import { registerDevice as saveDevice } from '../shared/data-access/devices';

const iotClient = new IoTClient({});

const DEVICES_TABLE = process.env.DEVICES_TABLE!;
const IOT_POLICY_NAME = process.env.IOT_POLICY_NAME!;
const ENVIRONMENT = process.env.ENVIRONMENT!;

interface RegisterDeviceRequest {
  userId: string;
  type: DeviceType;
  manufacturer: string;
  model: string;
  capabilities: DeviceCapability[];
  connectionType: ConnectionType;
  firmwareVersion?: string;
}

interface RegisterDeviceResponse {
  deviceId: string;
  certificateArn: string;
  certificatePem: string;
  privateKey: string;
  publicKey: string;
  iotEndpoint: string;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Device registration request:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: RegisterDeviceRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.userId || !request.type || !request.manufacturer || !request.model) {
      return createErrorResponse(400, 'Missing required fields: userId, type, manufacturer, model');
    }

    if (!request.capabilities || request.capabilities.length === 0) {
      return createErrorResponse(400, 'Device must have at least one capability');
    }

    if (!request.connectionType) {
      return createErrorResponse(400, 'Connection type is required');
    }

    // Generate unique device ID
    const deviceId = `${request.type}-${request.userId}-${Date.now()}`;
    const thingName = `healthcare-device-${deviceId}`;

    // Create IoT Thing
    const createThingCommand = new CreateThingCommand({
      thingName,
      thingTypeName: `healthcare-${request.type}-${ENVIRONMENT}`,
      attributePayload: {
        attributes: {
          userId: request.userId,
          manufacturer: request.manufacturer,
          model: request.model,
          deviceType: request.type,
          connectionType: request.connectionType,
        },
      },
    });

    await iotClient.send(createThingCommand);
    console.log(`Created IoT Thing: ${thingName}`);

    // Create device certificate and keys
    const createKeysCommand = new CreateKeysAndCertificateCommand({
      setAsActive: true,
    });

    const keysResponse = await iotClient.send(createKeysCommand);
    console.log(`Created certificate for device: ${deviceId}`);

    if (!keysResponse.certificateArn || !keysResponse.certificatePem || !keysResponse.keyPair?.PrivateKey || !keysResponse.keyPair?.PublicKey) {
      throw new Error('Failed to create device certificate and keys');
    }

    // Attach certificate to thing
    const attachThingCommand = new AttachThingPrincipalCommand({
      thingName,
      principal: keysResponse.certificateArn,
    });

    await iotClient.send(attachThingCommand);
    console.log(`Attached certificate to thing: ${thingName}`);

    // Attach policy to certificate
    const attachPolicyCommand = new AttachPolicyCommand({
      policyName: IOT_POLICY_NAME,
      target: keysResponse.certificateArn,
    });

    await iotClient.send(attachPolicyCommand);
    console.log(`Attached policy to certificate: ${IOT_POLICY_NAME}`);

    // Save device to DynamoDB
    const device: HealthDevice = {
      id: deviceId,
      userId: request.userId,
      type: request.type,
      manufacturer: request.manufacturer,
      model: request.model,
      capabilities: request.capabilities,
      connectionType: request.connectionType,
      status: 'disconnected',
      firmwareVersion: request.firmwareVersion,
    };

    await saveDevice(device);
    console.log(`Saved device to database: ${deviceId}`);

    // Prepare response
    const response: RegisterDeviceResponse = {
      deviceId,
      certificateArn: keysResponse.certificateArn,
      certificatePem: keysResponse.certificatePem,
      privateKey: keysResponse.keyPair.PrivateKey,
      publicKey: keysResponse.keyPair.PublicKey,
      iotEndpoint: `${process.env.AWS_IOT_ENDPOINT || 'data.iot.' + process.env.AWS_REGION + '.amazonaws.com'}`,
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Error registering device:', error);
    return createErrorResponse(500, `Failed to register device: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
