// Device Integration Service Tests
// Checkpoint Task 11: Verify device integration is functional
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 1.2

import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock environment variables
process.env.DEVICES_TABLE = 'test-devices';
process.env.TIMESTREAM_DATABASE = 'test-healthcare';
process.env.TIMESTREAM_TABLE = 'test-device-data';
process.env.EVENT_BUS_NAME = 'test-event-bus';
process.env.AWS_REGION = 'us-east-1';
process.env.IOT_ENDPOINT = 'data.iot.us-east-1.amazonaws.com';
process.env.IOT_POLICY_NAME = 'test-device-policy';

// Mock AWS SDK clients
const mockIoTSend = jest.fn();
const mockDynamoSend = jest.fn();
const mockTimestreamSend = jest.fn();
const mockEventBridgeSend = jest.fn();

jest.mock('@aws-sdk/client-iot', () => ({
  IoTClient: jest.fn(() => ({
    send: mockIoTSend,
  })),
  CreateThingCommand: jest.fn(),
  CreateKeysAndCertificateCommand: jest.fn(),
  AttachThingPrincipalCommand: jest.fn(),
  AttachPolicyCommand: jest.fn(),
  DeleteThingCommand: jest.fn(),
  DetachThingPrincipalCommand: jest.fn(),
  DeleteCertificateCommand: jest.fn(),
  UpdateCertificateCommand: jest.fn(),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: mockDynamoSend,
    })),
  },
  PutCommand: jest.fn(),
  GetCommand: jest.fn(),
  QueryCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  DeleteCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-timestream-write', () => ({
  TimestreamWriteClient: jest.fn(() => ({
    send: mockTimestreamSend,
  })),
  WriteRecordsCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: jest.fn(() => ({
    send: mockEventBridgeSend,
  })),
  PutEventsCommand: jest.fn(),
}));

// Import handlers after mocks
import { handler as registerHandler } from '../register-device';
import { handler as processDataHandler } from '../process-device-data';
import { handler as monitorConnectivityHandler } from '../monitor-connectivity';
import { handler as getDevicesHandler } from '../get-devices';

describe('Device Integration Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Device Registration', () => {
    test('should successfully register a blood pressure monitor', async () => {
      const event = {
        body: JSON.stringify({
          userId: 'user-123',
          type: 'blood_pressure',
          manufacturer: 'Omron',
          model: 'BP7250',
          capabilities: ['blood_pressure', 'heart_rate'],
          connectionType: 'bluetooth',
          firmwareVersion: '1.2.3',
        }),
      } as APIGatewayProxyEvent;

      // Mock IoT responses
      mockIoTSend
        .mockResolvedValueOnce({ thingName: 'blood_pressure-user-123-1234567890' }) // CreateThingCommand
        .mockResolvedValueOnce({
          certificateArn: 'arn:aws:iot:us-east-1:123456789012:cert/abc123',
          certificatePem: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----',
          keyPair: {
            PrivateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
            PublicKey: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
          },
        }) // CreateKeysAndCertificateCommand
        .mockResolvedValueOnce({}) // AttachThingPrincipalCommand
        .mockResolvedValueOnce({}); // AttachPolicyCommand

      // Mock DynamoDB response
      mockDynamoSend.mockResolvedValueOnce({});

      const result = await registerHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.deviceId).toContain('blood_pressure-user-123');
      expect(body.certificatePem).toBeDefined();
      expect(body.privateKey).toBeDefined();
      expect(body.iotEndpoint).toBeDefined();
    });

    test('should register a glucose meter', async () => {
      const event = {
        body: JSON.stringify({
          userId: 'user-456',
          type: 'glucose_meter',
          manufacturer: 'OneTouch',
          model: 'Verio',
          capabilities: ['glucose'],
          connectionType: 'bluetooth',
        }),
      } as APIGatewayProxyEvent;

      mockIoTSend
        .mockResolvedValueOnce({ thingName: 'glucose_meter-user-456-1234567890' })
        .mockResolvedValueOnce({
          certificateArn: 'arn:aws:iot:us-east-1:123456789012:cert/def456',
          certificatePem: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----',
          keyPair: {
            PrivateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
            PublicKey: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
          },
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      mockDynamoSend.mockResolvedValueOnce({});

      const result = await registerHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.deviceId).toContain('glucose_meter-user-456');
    });

    test('should return 400 for invalid device type', async () => {
      const event = {
        body: JSON.stringify({
          userId: 'user-123',
          type: 'invalid_type',
          manufacturer: 'Test',
          model: 'Test',
        }),
      } as APIGatewayProxyEvent;

      const result = await registerHandler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid device type');
    });
  });

  describe('Device Data Processing', () => {
    test('should process blood pressure device data', async () => {
      const event = {
        deviceId: 'blood_pressure-user-123-1234567890',
        timestamp: new Date().toISOString(),
        readings: [
          {
            type: 'blood_pressure_systolic',
            value: 120,
            unit: 'mmHg',
            accuracy: 95,
          },
          {
            type: 'blood_pressure_diastolic',
            value: 80,
            unit: 'mmHg',
            accuracy: 95,
          },
          {
            type: 'heart_rate',
            value: 72,
            unit: 'bpm',
            accuracy: 95,
          },
        ],
        batteryLevel: 85,
        signalStrength: -45,
      };

      // Mock device lookup
      mockDynamoSend.mockResolvedValueOnce({
        Item: {
          deviceId: 'blood_pressure-user-123-1234567890',
          userId: 'user-123',
          type: 'blood_pressure',
          status: 'active',
        },
      });

      // Mock Timestream write
      mockTimestreamSend.mockResolvedValueOnce({});

      // Mock DynamoDB update (last sync time)
      mockDynamoSend.mockResolvedValueOnce({});

      // Mock EventBridge publish
      mockEventBridgeSend.mockResolvedValueOnce({});

      await processDataHandler(event);

      // Verify Timestream write was called
      expect(mockTimestreamSend).toHaveBeenCalled();

      // Verify device sync time was updated
      expect(mockDynamoSend).toHaveBeenCalledTimes(2); // Get + Update
    });

    test('should validate and reject out-of-range heart rate', async () => {
      const event = {
        deviceId: 'fitness_tracker-user-123-1234567890',
        timestamp: new Date().toISOString(),
        readings: [
          {
            type: 'heart_rate',
            value: 250, // Out of range (max 220)
            unit: 'bpm',
            accuracy: 95,
          },
        ],
        batteryLevel: 75,
      };

      mockDynamoSend.mockResolvedValueOnce({
        Item: {
          deviceId: 'fitness_tracker-user-123-1234567890',
          userId: 'user-123',
          type: 'fitness_tracker',
          status: 'active',
        },
      });

      await processDataHandler(event);

      // Verify Timestream write was NOT called due to validation failure
      expect(mockTimestreamSend).not.toHaveBeenCalled();
    });

    test('should process glucose meter data with unit conversion', async () => {
      const event = {
        deviceId: 'glucose_meter-user-456-1234567890',
        timestamp: new Date().toISOString(),
        readings: [
          {
            type: 'glucose',
            value: 5.5, // mmol/L
            unit: 'mmol/L',
            accuracy: 98,
          },
        ],
        batteryLevel: 60,
      };

      mockDynamoSend.mockResolvedValueOnce({
        Item: {
          deviceId: 'glucose_meter-user-456-1234567890',
          userId: 'user-456',
          type: 'glucose_meter',
          status: 'active',
        },
      });

      mockTimestreamSend.mockResolvedValueOnce({});
      mockDynamoSend.mockResolvedValueOnce({});
      mockEventBridgeSend.mockResolvedValueOnce({});

      await processDataHandler(event);

      expect(mockTimestreamSend).toHaveBeenCalled();
    });
  });

  describe('Connectivity Monitoring', () => {
    test('should detect disconnected devices', async () => {
      const now = new Date();
      const twentyFiveMinutesAgo = new Date(now.getTime() - 25 * 60 * 1000);

      // Mock devices query
      mockDynamoSend.mockResolvedValueOnce({
        Items: [
          {
            deviceId: 'blood_pressure-user-123-1234567890',
            userId: 'user-123',
            type: 'blood_pressure',
            status: 'active',
            lastSyncTime: twentyFiveMinutesAgo.toISOString(),
          },
          {
            deviceId: 'glucose_meter-user-456-1234567890',
            userId: 'user-456',
            type: 'glucose_meter',
            status: 'active',
            lastSyncTime: new Date().toISOString(), // Recently synced
          },
        ],
      });

      // Mock update for disconnected device
      mockDynamoSend.mockResolvedValueOnce({});

      // Mock EventBridge for connectivity alert
      mockEventBridgeSend.mockResolvedValueOnce({});

      await monitorConnectivityHandler({});

      // Verify device status was updated
      expect(mockDynamoSend).toHaveBeenCalledTimes(2); // Query + Update

      // Verify connectivity alert was published
      expect(mockEventBridgeSend).toHaveBeenCalled();
    });

    test('should detect low battery devices', async () => {
      mockDynamoSend.mockResolvedValueOnce({
        Items: [
          {
            deviceId: 'fitness_tracker-user-789-1234567890',
            userId: 'user-789',
            type: 'fitness_tracker',
            status: 'active',
            lastSyncTime: new Date().toISOString(),
            batteryLevel: 15, // Low battery
          },
        ],
      });

      mockEventBridgeSend.mockResolvedValueOnce({});

      await monitorConnectivityHandler({});

      // Verify low battery alert was published
      expect(mockEventBridgeSend).toHaveBeenCalled();
    });
  });

  describe('Device Retrieval', () => {
    test('should get all devices for a user', async () => {
      const event = {
        queryStringParameters: {
          userId: 'user-123',
        },
      } as any as APIGatewayProxyEvent;

      mockDynamoSend.mockResolvedValueOnce({
        Items: [
          {
            deviceId: 'blood_pressure-user-123-1234567890',
            userId: 'user-123',
            type: 'blood_pressure',
            manufacturer: 'Omron',
            model: 'BP7250',
            status: 'active',
          },
          {
            deviceId: 'glucose_meter-user-123-9876543210',
            userId: 'user-123',
            type: 'glucose_meter',
            manufacturer: 'OneTouch',
            model: 'Verio',
            status: 'active',
          },
        ],
      });

      const result = await getDevicesHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.devices).toHaveLength(2);
      expect(body.devices[0].type).toBe('blood_pressure');
      expect(body.devices[1].type).toBe('glucose_meter');
    });

    test('should get a specific device by ID', async () => {
      const event = {
        pathParameters: {
          deviceId: 'blood_pressure-user-123-1234567890',
        },
      } as any as APIGatewayProxyEvent;

      mockDynamoSend.mockResolvedValueOnce({
        Item: {
          deviceId: 'blood_pressure-user-123-1234567890',
          userId: 'user-123',
          type: 'blood_pressure',
          manufacturer: 'Omron',
          model: 'BP7250',
          status: 'active',
          lastSyncTime: new Date().toISOString(),
          batteryLevel: 85,
        },
      });

      const result = await getDevicesHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.device.deviceId).toBe('blood_pressure-user-123-1234567890');
      expect(body.device.type).toBe('blood_pressure');
    });
  });

  describe('Device Adapters', () => {
    test('should process blood pressure data through adapter', async () => {
      const event = {
        deviceId: 'blood_pressure-user-123-1234567890',
        timestamp: new Date().toISOString(),
        readings: [
          {
            type: 'blood_pressure_systolic',
            value: 135,
            unit: 'mmHg',
          },
          {
            type: 'blood_pressure_diastolic',
            value: 85,
            unit: 'mmHg',
          },
        ],
      };

      mockDynamoSend.mockResolvedValueOnce({
        Item: {
          deviceId: 'blood_pressure-user-123-1234567890',
          userId: 'user-123',
          type: 'blood_pressure',
          status: 'active',
        },
      });

      mockTimestreamSend.mockResolvedValueOnce({});
      mockDynamoSend.mockResolvedValueOnce({});
      mockEventBridgeSend.mockResolvedValueOnce({});

      await processDataHandler(event);

      // Verify data was processed and stored
      expect(mockTimestreamSend).toHaveBeenCalled();
    });
  });
});
