"use strict";
// Device Integration Service Tests
// Checkpoint Task 11: Verify device integration is functional
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 1.2
Object.defineProperty(exports, "__esModule", { value: true });
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
const register_device_1 = require("../register-device");
const process_device_data_1 = require("../process-device-data");
const monitor_connectivity_1 = require("../monitor-connectivity");
const get_devices_1 = require("../get-devices");
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
            };
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
            const result = await (0, register_device_1.handler)(event);
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
            };
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
            const result = await (0, register_device_1.handler)(event);
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
            };
            const result = await (0, register_device_1.handler)(event);
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
            await (0, process_device_data_1.handler)(event);
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
            await (0, process_device_data_1.handler)(event);
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
            await (0, process_device_data_1.handler)(event);
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
            await (0, monitor_connectivity_1.handler)({});
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
            await (0, monitor_connectivity_1.handler)({});
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
            };
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
            const result = await (0, get_devices_1.handler)(event);
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
            };
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
            const result = await (0, get_devices_1.handler)(event);
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
            await (0, process_device_data_1.handler)(event);
            // Verify data was processed and stored
            expect(mockTimestreamSend).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2aWNlLWludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkZXZpY2UtaW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsbUNBQW1DO0FBQ25DLDhEQUE4RDtBQUM5RCw2Q0FBNkM7O0FBSTdDLDZCQUE2QjtBQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsR0FBRyxjQUFjLENBQUM7QUFDM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxpQkFBaUIsQ0FBQztBQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixHQUFHLGtCQUFrQixDQUFDO0FBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxHQUFHLGdCQUFnQixDQUFDO0FBQzlDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQztBQUNyQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxrQ0FBa0MsQ0FBQztBQUM5RCxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQztBQUVuRCx1QkFBdUI7QUFDdkIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO0FBQzlCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUNqQyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUNyQyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUV0QyxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDdEMsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN4QixJQUFJLEVBQUUsV0FBVztLQUNsQixDQUFDLENBQUM7SUFDSCxrQkFBa0IsRUFBRSxJQUFJLENBQUMsRUFB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QyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM3QyxjQUFjLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDekMsbUJBQW1CLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFOUMsTUFBTSxJQUFBLDZCQUFrQixFQUFDLEtBQUssQ0FBQyxDQUFDO1lBRWhDLHVDQUF1QztZQUN2QyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIERldmljZSBJbnRlZ3JhdGlvbiBTZXJ2aWNlIFRlc3RzXG4vLyBDaGVja3BvaW50IFRhc2sgMTE6IFZlcmlmeSBkZXZpY2UgaW50ZWdyYXRpb24gaXMgZnVuY3Rpb25hbFxuLy8gUmVxdWlyZW1lbnRzOiA3LjEsIDcuMiwgNy4zLCA3LjQsIDcuNSwgMS4yXG5cbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5cbi8vIE1vY2sgZW52aXJvbm1lbnQgdmFyaWFibGVzXG5wcm9jZXNzLmVudi5ERVZJQ0VTX1RBQkxFID0gJ3Rlc3QtZGV2aWNlcyc7XG5wcm9jZXNzLmVudi5USU1FU1RSRUFNX0RBVEFCQVNFID0gJ3Rlc3QtaGVhbHRoY2FyZSc7XG5wcm9jZXNzLmVudi5USU1FU1RSRUFNX1RBQkxFID0gJ3Rlc3QtZGV2aWNlLWRhdGEnO1xucHJvY2Vzcy5lbnYuRVZFTlRfQlVTX05BTUUgPSAndGVzdC1ldmVudC1idXMnO1xucHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiA9ICd1cy1lYXN0LTEnO1xucHJvY2Vzcy5lbnYuSU9UX0VORFBPSU5UID0gJ2RhdGEuaW90LnVzLWVhc3QtMS5hbWF6b25hd3MuY29tJztcbnByb2Nlc3MuZW52LklPVF9QT0xJQ1lfTkFNRSA9ICd0ZXN0LWRldmljZS1wb2xpY3knO1xuXG4vLyBNb2NrIEFXUyBTREsgY2xpZW50c1xuY29uc3QgbW9ja0lvVFNlbmQgPSBqZXN0LmZuKCk7XG5jb25zdCBtb2NrRHluYW1vU2VuZCA9IGplc3QuZm4oKTtcbmNvbnN0IG1vY2tUaW1lc3RyZWFtU2VuZCA9IGplc3QuZm4oKTtcbmNvbnN0IG1vY2tFdmVudEJyaWRnZVNlbmQgPSBqZXN0LmZuKCk7XG5cbmplc3QubW9jaygnQGF3cy1zZGsvY2xpZW50LWlvdCcsICgpID0+ICh7XG4gIElvVENsaWVudDogamVzdC5mbigoKSA9PiAoe1xuICAgIHNlbmQ6IG1vY2tJb1RTZW5kLFxuICB9KSksXG4gIENyZWF0ZVRoaW5nQ29tbWFuZDogamVzdC5mbigpLFxuICBDcmVhdGVLZXlzQW5kQ2VydGlmaWNhdGVDb21tYW5kOiBqZXN0LmZuKCksXG4gIEF0dGFjaFRoaW5nUHJpbmNpcGFsQ29tbWFuZDogamVzdC5mbigpLFxuICBBdHRhY2hQb2xpY3lDb21tYW5kOiBqZXN0LmZuKCksXG4gIERlbGV0ZVRoaW5nQ29tbWFuZDogamVzdC5mbigpLFxuICBEZXRhY2hUaGluZ1ByaW5jaXBhbENvbW1hbmQ6IGplc3QuZm4oKSxcbiAgRGVsZXRlQ2VydGlmaWNhdGVDb21tYW5kOiBqZXN0LmZuKCksXG4gIFVwZGF0ZUNlcnRpZmljYXRlQ29tbWFuZDogamVzdC5mbigpLFxufSkpO1xuXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYicsICgpID0+ICh7XG4gIER5bmFtb0RCRG9jdW1lbnRDbGllbnQ6IHtcbiAgICBmcm9tOiBqZXN0LmZuKCgpID0+ICh7XG4gICAgICBzZW5kOiBtb2NrRHluYW1vU2VuZCxcbiAgICB9KSksXG4gIH0sXG4gIFB1dENvbW1hbmQ6IGplc3QuZm4oKSxcbiAgR2V0Q29tbWFuZDogamVzdC5mbigpLFxuICBRdWVyeUNvbW1hbmQ6IGplc3QuZm4oKSxcbiAgVXBkYXRlQ29tbWFuZDogamVzdC5mbigpLFxuICBEZWxldGVDb21tYW5kOiBqZXN0LmZuKCksXG59KSk7XG5cbmplc3QubW9jaygnQGF3cy1zZGsvY2xpZW50LXRpbWVzdHJlYW0td3JpdGUnLCAoKSA9PiAoe1xuICBUaW1lc3RyZWFtV3JpdGVDbGllbnQ6IGplc3QuZm4oKCkgPT4gKHtcbiAgICBzZW5kOiBtb2NrVGltZXN0cmVhbVNlbmQsXG4gIH0pKSxcbiAgV3JpdGVSZWNvcmRzQ29tbWFuZDogamVzdC5mbigpLFxufSkpO1xuXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2NsaWVudC1ldmVudGJyaWRnZScsICgpID0+ICh7XG4gIEV2ZW50QnJpZGdlQ2xpZW50OiBqZXN0LmZuKCgpID0+ICh7XG4gICAgc2VuZDogbW9ja0V2ZW50QnJpZGdlU2VuZCxcbiAgfSkpLFxuICBQdXRFdmVudHNDb21tYW5kOiBqZXN0LmZuKCksXG59KSk7XG5cbi8vIEltcG9ydCBoYW5kbGVycyBhZnRlciBtb2Nrc1xuaW1wb3J0IHsgaGFuZGxlciBhcyByZWdpc3RlckhhbmRsZXIgfSBmcm9tICcuLi9yZWdpc3Rlci1kZXZpY2UnO1xuaW1wb3J0IHsgaGFuZGxlciBhcyBwcm9jZXNzRGF0YUhhbmRsZXIgfSBmcm9tICcuLi9wcm9jZXNzLWRldmljZS1kYXRhJztcbmltcG9ydCB7IGhhbmRsZXIgYXMgbW9uaXRvckNvbm5lY3Rpdml0eUhhbmRsZXIgfSBmcm9tICcuLi9tb25pdG9yLWNvbm5lY3Rpdml0eSc7XG5pbXBvcnQgeyBoYW5kbGVyIGFzIGdldERldmljZXNIYW5kbGVyIH0gZnJvbSAnLi4vZ2V0LWRldmljZXMnO1xuXG5kZXNjcmliZSgnRGV2aWNlIEludGVncmF0aW9uIFNlcnZpY2UnLCAoKSA9PiB7XG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGplc3QuY2xlYXJBbGxNb2NrcygpO1xuICB9KTtcblxuICBkZXNjcmliZSgnRGV2aWNlIFJlZ2lzdHJhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgc3VjY2Vzc2Z1bGx5IHJlZ2lzdGVyIGEgYmxvb2QgcHJlc3N1cmUgbW9uaXRvcicsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgIHR5cGU6ICdibG9vZF9wcmVzc3VyZScsXG4gICAgICAgICAgbWFudWZhY3R1cmVyOiAnT21yb24nLFxuICAgICAgICAgIG1vZGVsOiAnQlA3MjUwJyxcbiAgICAgICAgICBjYXBhYmlsaXRpZXM6IFsnYmxvb2RfcHJlc3N1cmUnLCAnaGVhcnRfcmF0ZSddLFxuICAgICAgICAgIGNvbm5lY3Rpb25UeXBlOiAnYmx1ZXRvb3RoJyxcbiAgICAgICAgICBmaXJtd2FyZVZlcnNpb246ICcxLjIuMycsXG4gICAgICAgIH0pLFxuICAgICAgfSBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcblxuICAgICAgLy8gTW9jayBJb1QgcmVzcG9uc2VzXG4gICAgICBtb2NrSW9UU2VuZFxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgdGhpbmdOYW1lOiAnYmxvb2RfcHJlc3N1cmUtdXNlci0xMjMtMTIzNDU2Nzg5MCcgfSkgLy8gQ3JlYXRlVGhpbmdDb21tYW5kXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICAgIGNlcnRpZmljYXRlQXJuOiAnYXJuOmF3czppb3Q6dXMtZWFzdC0xOjEyMzQ1Njc4OTAxMjpjZXJ0L2FiYzEyMycsXG4gICAgICAgICAgY2VydGlmaWNhdGVQZW06ICctLS0tLUJFR0lOIENFUlRJRklDQVRFLS0tLS1cXG50ZXN0XFxuLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLScsXG4gICAgICAgICAga2V5UGFpcjoge1xuICAgICAgICAgICAgUHJpdmF0ZUtleTogJy0tLS0tQkVHSU4gUlNBIFBSSVZBVEUgS0VZLS0tLS1cXG50ZXN0XFxuLS0tLS1FTkQgUlNBIFBSSVZBVEUgS0VZLS0tLS0nLFxuICAgICAgICAgICAgUHVibGljS2V5OiAnLS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS1cXG50ZXN0XFxuLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9KSAvLyBDcmVhdGVLZXlzQW5kQ2VydGlmaWNhdGVDb21tYW5kXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pIC8vIEF0dGFjaFRoaW5nUHJpbmNpcGFsQ29tbWFuZFxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KTsgLy8gQXR0YWNoUG9saWN5Q29tbWFuZFxuXG4gICAgICAvLyBNb2NrIER5bmFtb0RCIHJlc3BvbnNlXG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByZWdpc3RlckhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5LmRldmljZUlkKS50b0NvbnRhaW4oJ2Jsb29kX3ByZXNzdXJlLXVzZXItMTIzJyk7XG4gICAgICBleHBlY3QoYm9keS5jZXJ0aWZpY2F0ZVBlbSkudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChib2R5LnByaXZhdGVLZXkpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoYm9keS5pb3RFbmRwb2ludCkudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCByZWdpc3RlciBhIGdsdWNvc2UgbWV0ZXInLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHVzZXJJZDogJ3VzZXItNDU2JyxcbiAgICAgICAgICB0eXBlOiAnZ2x1Y29zZV9tZXRlcicsXG4gICAgICAgICAgbWFudWZhY3R1cmVyOiAnT25lVG91Y2gnLFxuICAgICAgICAgIG1vZGVsOiAnVmVyaW8nLFxuICAgICAgICAgIGNhcGFiaWxpdGllczogWydnbHVjb3NlJ10sXG4gICAgICAgICAgY29ubmVjdGlvblR5cGU6ICdibHVldG9vdGgnLFxuICAgICAgICB9KSxcbiAgICAgIH0gYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQ7XG5cbiAgICAgIG1vY2tJb1RTZW5kXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyB0aGluZ05hbWU6ICdnbHVjb3NlX21ldGVyLXVzZXItNDU2LTEyMzQ1Njc4OTAnIH0pXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICAgIGNlcnRpZmljYXRlQXJuOiAnYXJuOmF3czppb3Q6dXMtZWFzdC0xOjEyMzQ1Njc4OTAxMjpjZXJ0L2RlZjQ1NicsXG4gICAgICAgICAgY2VydGlmaWNhdGVQZW06ICctLS0tLUJFR0lOIENFUlRJRklDQVRFLS0tLS1cXG50ZXN0XFxuLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLScsXG4gICAgICAgICAga2V5UGFpcjoge1xuICAgICAgICAgICAgUHJpdmF0ZUtleTogJy0tLS0tQkVHSU4gUlNBIFBSSVZBVEUgS0VZLS0tLS1cXG50ZXN0XFxuLS0tLS1FTkQgUlNBIFBSSVZBVEUgS0VZLS0tLS0nLFxuICAgICAgICAgICAgUHVibGljS2V5OiAnLS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS1cXG50ZXN0XFxuLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9KVxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KVxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KTtcblxuICAgICAgbW9ja0R5bmFtb1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVnaXN0ZXJIYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICBleHBlY3QoYm9keS5kZXZpY2VJZCkudG9Db250YWluKCdnbHVjb3NlX21ldGVyLXVzZXItNDU2Jyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgcmV0dXJuIDQwMCBmb3IgaW52YWxpZCBkZXZpY2UgdHlwZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgIHR5cGU6ICdpbnZhbGlkX3R5cGUnLFxuICAgICAgICAgIG1hbnVmYWN0dXJlcjogJ1Rlc3QnLFxuICAgICAgICAgIG1vZGVsOiAnVGVzdCcsXG4gICAgICAgIH0pLFxuICAgICAgfSBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVnaXN0ZXJIYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICBleHBlY3QoYm9keS5lcnJvcikudG9Db250YWluKCdJbnZhbGlkIGRldmljZSB0eXBlJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdEZXZpY2UgRGF0YSBQcm9jZXNzaW5nJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBwcm9jZXNzIGJsb29kIHByZXNzdXJlIGRldmljZSBkYXRhJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgIGRldmljZUlkOiAnYmxvb2RfcHJlc3N1cmUtdXNlci0xMjMtMTIzNDU2Nzg5MCcsXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICByZWFkaW5nczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdibG9vZF9wcmVzc3VyZV9zeXN0b2xpYycsXG4gICAgICAgICAgICB2YWx1ZTogMTIwLFxuICAgICAgICAgICAgdW5pdDogJ21tSGcnLFxuICAgICAgICAgICAgYWNjdXJhY3k6IDk1LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2Jsb29kX3ByZXNzdXJlX2RpYXN0b2xpYycsXG4gICAgICAgICAgICB2YWx1ZTogODAsXG4gICAgICAgICAgICB1bml0OiAnbW1IZycsXG4gICAgICAgICAgICBhY2N1cmFjeTogOTUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnaGVhcnRfcmF0ZScsXG4gICAgICAgICAgICB2YWx1ZTogNzIsXG4gICAgICAgICAgICB1bml0OiAnYnBtJyxcbiAgICAgICAgICAgIGFjY3VyYWN5OiA5NSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBiYXR0ZXJ5TGV2ZWw6IDg1LFxuICAgICAgICBzaWduYWxTdHJlbmd0aDogLTQ1LFxuICAgICAgfTtcblxuICAgICAgLy8gTW9jayBkZXZpY2UgbG9va3VwXG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICBJdGVtOiB7XG4gICAgICAgICAgZGV2aWNlSWQ6ICdibG9vZF9wcmVzc3VyZS11c2VyLTEyMy0xMjM0NTY3ODkwJyxcbiAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgdHlwZTogJ2Jsb29kX3ByZXNzdXJlJyxcbiAgICAgICAgICBzdGF0dXM6ICdhY3RpdmUnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIE1vY2sgVGltZXN0cmVhbSB3cml0ZVxuICAgICAgbW9ja1RpbWVzdHJlYW1TZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSk7XG5cbiAgICAgIC8vIE1vY2sgRHluYW1vREIgdXBkYXRlIChsYXN0IHN5bmMgdGltZSlcbiAgICAgIG1vY2tEeW5hbW9TZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSk7XG5cbiAgICAgIC8vIE1vY2sgRXZlbnRCcmlkZ2UgcHVibGlzaFxuICAgICAgbW9ja0V2ZW50QnJpZGdlU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xuXG4gICAgICBhd2FpdCBwcm9jZXNzRGF0YUhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICAvLyBWZXJpZnkgVGltZXN0cmVhbSB3cml0ZSB3YXMgY2FsbGVkXG4gICAgICBleHBlY3QobW9ja1RpbWVzdHJlYW1TZW5kKS50b0hhdmVCZWVuQ2FsbGVkKCk7XG5cbiAgICAgIC8vIFZlcmlmeSBkZXZpY2Ugc3luYyB0aW1lIHdhcyB1cGRhdGVkXG4gICAgICBleHBlY3QobW9ja0R5bmFtb1NlbmQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygyKTsgLy8gR2V0ICsgVXBkYXRlXG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgdmFsaWRhdGUgYW5kIHJlamVjdCBvdXQtb2YtcmFuZ2UgaGVhcnQgcmF0ZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICBkZXZpY2VJZDogJ2ZpdG5lc3NfdHJhY2tlci11c2VyLTEyMy0xMjM0NTY3ODkwJyxcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHJlYWRpbmdzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2hlYXJ0X3JhdGUnLFxuICAgICAgICAgICAgdmFsdWU6IDI1MCwgLy8gT3V0IG9mIHJhbmdlIChtYXggMjIwKVxuICAgICAgICAgICAgdW5pdDogJ2JwbScsXG4gICAgICAgICAgICBhY2N1cmFjeTogOTUsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgYmF0dGVyeUxldmVsOiA3NSxcbiAgICAgIH07XG5cbiAgICAgIG1vY2tEeW5hbW9TZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XG4gICAgICAgIEl0ZW06IHtcbiAgICAgICAgICBkZXZpY2VJZDogJ2ZpdG5lc3NfdHJhY2tlci11c2VyLTEyMy0xMjM0NTY3ODkwJyxcbiAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgdHlwZTogJ2ZpdG5lc3NfdHJhY2tlcicsXG4gICAgICAgICAgc3RhdHVzOiAnYWN0aXZlJyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCBwcm9jZXNzRGF0YUhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICAvLyBWZXJpZnkgVGltZXN0cmVhbSB3cml0ZSB3YXMgTk9UIGNhbGxlZCBkdWUgdG8gdmFsaWRhdGlvbiBmYWlsdXJlXG4gICAgICBleHBlY3QobW9ja1RpbWVzdHJlYW1TZW5kKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHByb2Nlc3MgZ2x1Y29zZSBtZXRlciBkYXRhIHdpdGggdW5pdCBjb252ZXJzaW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgIGRldmljZUlkOiAnZ2x1Y29zZV9tZXRlci11c2VyLTQ1Ni0xMjM0NTY3ODkwJyxcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHJlYWRpbmdzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2dsdWNvc2UnLFxuICAgICAgICAgICAgdmFsdWU6IDUuNSwgLy8gbW1vbC9MXG4gICAgICAgICAgICB1bml0OiAnbW1vbC9MJyxcbiAgICAgICAgICAgIGFjY3VyYWN5OiA5OCxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBiYXR0ZXJ5TGV2ZWw6IDYwLFxuICAgICAgfTtcblxuICAgICAgbW9ja0R5bmFtb1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcbiAgICAgICAgSXRlbToge1xuICAgICAgICAgIGRldmljZUlkOiAnZ2x1Y29zZV9tZXRlci11c2VyLTQ1Ni0xMjM0NTY3ODkwJyxcbiAgICAgICAgICB1c2VySWQ6ICd1c2VyLTQ1NicsXG4gICAgICAgICAgdHlwZTogJ2dsdWNvc2VfbWV0ZXInLFxuICAgICAgICAgIHN0YXR1czogJ2FjdGl2ZScsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgbW9ja1RpbWVzdHJlYW1TZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSk7XG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xuICAgICAgbW9ja0V2ZW50QnJpZGdlU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xuXG4gICAgICBhd2FpdCBwcm9jZXNzRGF0YUhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QobW9ja1RpbWVzdHJlYW1TZW5kKS50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdDb25uZWN0aXZpdHkgTW9uaXRvcmluZycsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgZGV0ZWN0IGRpc2Nvbm5lY3RlZCBkZXZpY2VzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgIGNvbnN0IHR3ZW50eUZpdmVNaW51dGVzQWdvID0gbmV3IERhdGUobm93LmdldFRpbWUoKSAtIDI1ICogNjAgKiAxMDAwKTtcblxuICAgICAgLy8gTW9jayBkZXZpY2VzIHF1ZXJ5XG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICBJdGVtczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGRldmljZUlkOiAnYmxvb2RfcHJlc3N1cmUtdXNlci0xMjMtMTIzNDU2Nzg5MCcsXG4gICAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgICB0eXBlOiAnYmxvb2RfcHJlc3N1cmUnLFxuICAgICAgICAgICAgc3RhdHVzOiAnYWN0aXZlJyxcbiAgICAgICAgICAgIGxhc3RTeW5jVGltZTogdHdlbnR5Rml2ZU1pbnV0ZXNBZ28udG9JU09TdHJpbmcoKSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGRldmljZUlkOiAnZ2x1Y29zZV9tZXRlci11c2VyLTQ1Ni0xMjM0NTY3ODkwJyxcbiAgICAgICAgICAgIHVzZXJJZDogJ3VzZXItNDU2JyxcbiAgICAgICAgICAgIHR5cGU6ICdnbHVjb3NlX21ldGVyJyxcbiAgICAgICAgICAgIHN0YXR1czogJ2FjdGl2ZScsXG4gICAgICAgICAgICBsYXN0U3luY1RpbWU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSwgLy8gUmVjZW50bHkgc3luY2VkXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBNb2NrIHVwZGF0ZSBmb3IgZGlzY29ubmVjdGVkIGRldmljZVxuICAgICAgbW9ja0R5bmFtb1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KTtcblxuICAgICAgLy8gTW9jayBFdmVudEJyaWRnZSBmb3IgY29ubmVjdGl2aXR5IGFsZXJ0XG4gICAgICBtb2NrRXZlbnRCcmlkZ2VTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSk7XG5cbiAgICAgIGF3YWl0IG1vbml0b3JDb25uZWN0aXZpdHlIYW5kbGVyKHt9KTtcblxuICAgICAgLy8gVmVyaWZ5IGRldmljZSBzdGF0dXMgd2FzIHVwZGF0ZWRcbiAgICAgIGV4cGVjdChtb2NrRHluYW1vU2VuZCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDIpOyAvLyBRdWVyeSArIFVwZGF0ZVxuXG4gICAgICAvLyBWZXJpZnkgY29ubmVjdGl2aXR5IGFsZXJ0IHdhcyBwdWJsaXNoZWRcbiAgICAgIGV4cGVjdChtb2NrRXZlbnRCcmlkZ2VTZW5kKS50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgZGV0ZWN0IGxvdyBiYXR0ZXJ5IGRldmljZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICBJdGVtczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGRldmljZUlkOiAnZml0bmVzc190cmFja2VyLXVzZXItNzg5LTEyMzQ1Njc4OTAnLFxuICAgICAgICAgICAgdXNlcklkOiAndXNlci03ODknLFxuICAgICAgICAgICAgdHlwZTogJ2ZpdG5lc3NfdHJhY2tlcicsXG4gICAgICAgICAgICBzdGF0dXM6ICdhY3RpdmUnLFxuICAgICAgICAgICAgbGFzdFN5bmNUaW1lOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBiYXR0ZXJ5TGV2ZWw6IDE1LCAvLyBMb3cgYmF0dGVyeVxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcblxuICAgICAgbW9ja0V2ZW50QnJpZGdlU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xuXG4gICAgICBhd2FpdCBtb25pdG9yQ29ubmVjdGl2aXR5SGFuZGxlcih7fSk7XG5cbiAgICAgIC8vIFZlcmlmeSBsb3cgYmF0dGVyeSBhbGVydCB3YXMgcHVibGlzaGVkXG4gICAgICBleHBlY3QobW9ja0V2ZW50QnJpZGdlU2VuZCkudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnRGV2aWNlIFJldHJpZXZhbCcsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgZ2V0IGFsbCBkZXZpY2VzIGZvciBhIHVzZXInLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICB9LFxuICAgICAgfSBhcyBhbnkgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQ7XG5cbiAgICAgIG1vY2tEeW5hbW9TZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XG4gICAgICAgIEl0ZW1zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZGV2aWNlSWQ6ICdibG9vZF9wcmVzc3VyZS11c2VyLTEyMy0xMjM0NTY3ODkwJyxcbiAgICAgICAgICAgIHVzZXJJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgICAgIHR5cGU6ICdibG9vZF9wcmVzc3VyZScsXG4gICAgICAgICAgICBtYW51ZmFjdHVyZXI6ICdPbXJvbicsXG4gICAgICAgICAgICBtb2RlbDogJ0JQNzI1MCcsXG4gICAgICAgICAgICBzdGF0dXM6ICdhY3RpdmUnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZGV2aWNlSWQ6ICdnbHVjb3NlX21ldGVyLXVzZXItMTIzLTk4NzY1NDMyMTAnLFxuICAgICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgICAgdHlwZTogJ2dsdWNvc2VfbWV0ZXInLFxuICAgICAgICAgICAgbWFudWZhY3R1cmVyOiAnT25lVG91Y2gnLFxuICAgICAgICAgICAgbW9kZWw6ICdWZXJpbycsXG4gICAgICAgICAgICBzdGF0dXM6ICdhY3RpdmUnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0RGV2aWNlc0hhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5LmRldmljZXMpLnRvSGF2ZUxlbmd0aCgyKTtcbiAgICAgIGV4cGVjdChib2R5LmRldmljZXNbMF0udHlwZSkudG9CZSgnYmxvb2RfcHJlc3N1cmUnKTtcbiAgICAgIGV4cGVjdChib2R5LmRldmljZXNbMV0udHlwZSkudG9CZSgnZ2x1Y29zZV9tZXRlcicpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGdldCBhIHNwZWNpZmljIGRldmljZSBieSBJRCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICBwYXRoUGFyYW1ldGVyczoge1xuICAgICAgICAgIGRldmljZUlkOiAnYmxvb2RfcHJlc3N1cmUtdXNlci0xMjMtMTIzNDU2Nzg5MCcsXG4gICAgICAgIH0sXG4gICAgICB9IGFzIGFueSBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcblxuICAgICAgbW9ja0R5bmFtb1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcbiAgICAgICAgSXRlbToge1xuICAgICAgICAgIGRldmljZUlkOiAnYmxvb2RfcHJlc3N1cmUtdXNlci0xMjMtMTIzNDU2Nzg5MCcsXG4gICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgIHR5cGU6ICdibG9vZF9wcmVzc3VyZScsXG4gICAgICAgICAgbWFudWZhY3R1cmVyOiAnT21yb24nLFxuICAgICAgICAgIG1vZGVsOiAnQlA3MjUwJyxcbiAgICAgICAgICBzdGF0dXM6ICdhY3RpdmUnLFxuICAgICAgICAgIGxhc3RTeW5jVGltZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgIGJhdHRlcnlMZXZlbDogODUsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0RGV2aWNlc0hhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5LmRldmljZS5kZXZpY2VJZCkudG9CZSgnYmxvb2RfcHJlc3N1cmUtdXNlci0xMjMtMTIzNDU2Nzg5MCcpO1xuICAgICAgZXhwZWN0KGJvZHkuZGV2aWNlLnR5cGUpLnRvQmUoJ2Jsb29kX3ByZXNzdXJlJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdEZXZpY2UgQWRhcHRlcnMnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIHByb2Nlc3MgYmxvb2QgcHJlc3N1cmUgZGF0YSB0aHJvdWdoIGFkYXB0ZXInLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgZGV2aWNlSWQ6ICdibG9vZF9wcmVzc3VyZS11c2VyLTEyMy0xMjM0NTY3ODkwJyxcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHJlYWRpbmdzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2Jsb29kX3ByZXNzdXJlX3N5c3RvbGljJyxcbiAgICAgICAgICAgIHZhbHVlOiAxMzUsXG4gICAgICAgICAgICB1bml0OiAnbW1IZycsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnYmxvb2RfcHJlc3N1cmVfZGlhc3RvbGljJyxcbiAgICAgICAgICAgIHZhbHVlOiA4NSxcbiAgICAgICAgICAgIHVuaXQ6ICdtbUhnJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfTtcblxuICAgICAgbW9ja0R5bmFtb1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcbiAgICAgICAgSXRlbToge1xuICAgICAgICAgIGRldmljZUlkOiAnYmxvb2RfcHJlc3N1cmUtdXNlci0xMjMtMTIzNDU2Nzg5MCcsXG4gICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgIHR5cGU6ICdibG9vZF9wcmVzc3VyZScsXG4gICAgICAgICAgc3RhdHVzOiAnYWN0aXZlJyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBtb2NrVGltZXN0cmVhbVNlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KTtcbiAgICAgIG1vY2tEeW5hbW9TZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSk7XG4gICAgICBtb2NrRXZlbnRCcmlkZ2VTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSk7XG5cbiAgICAgIGF3YWl0IHByb2Nlc3NEYXRhSGFuZGxlcihldmVudCk7XG5cbiAgICAgIC8vIFZlcmlmeSBkYXRhIHdhcyBwcm9jZXNzZWQgYW5kIHN0b3JlZFxuICAgICAgZXhwZWN0KG1vY2tUaW1lc3RyZWFtU2VuZCkudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19