"use strict";
// Medication Tracking Service Tests
// Checkpoint Task 11: Verify medication tracking is functional
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.5
Object.defineProperty(exports, "__esModule", { value: true });
// Mock environment variables
process.env.MEDICATIONS_TABLE = 'test-medications';
process.env.EVENT_BUS_NAME = 'test-event-bus';
process.env.USERS_TABLE = 'test-users';
// Mock AWS SDK clients
const mockDynamoSend = jest.fn();
const mockEventBridgeSend = jest.fn();
const mockSNSSend = jest.fn();
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
    ScanCommand: jest.fn(),
}));
jest.mock('@aws-sdk/client-eventbridge', () => ({
    EventBridgeClient: jest.fn(() => ({
        send: mockEventBridgeSend,
    })),
    PutEventsCommand: jest.fn(),
}));
jest.mock('@aws-sdk/client-sns', () => ({
    SNSClient: jest.fn(() => ({
        send: mockSNSSend,
    })),
    PublishCommand: jest.fn(),
}));
// Import handlers after mocks
const schedule_medication_1 = require("../schedule-medication");
const confirm_medication_1 = require("../confirm-medication");
const get_medications_1 = require("../get-medications");
const get_medication_adherence_1 = require("../get-medication-adherence");
const get_care_circle_medication_summary_1 = require("../get-care-circle-medication-summary");
const send_medication_reminders_1 = require("../../events/send-medication-reminders");
const check_medication_adherence_1 = require("../../events/check-medication-adherence");
describe('Medication Tracking Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Medication Scheduling', () => {
        test('should successfully schedule a medication', async () => {
            const event = {
                body: JSON.stringify({
                    userId: 'user-123',
                    medication: {
                        name: 'Lisinopril',
                        dosage: '10mg',
                        frequency: 'daily',
                        scheduledTimes: ['08:00', '20:00'],
                        startDate: '2024-01-15',
                        prescribedBy: 'Dr. Smith',
                        specialInstructions: 'Take with food',
                    },
                }),
            };
            mockDynamoSend.mockResolvedValueOnce({});
            const result = await (0, schedule_medication_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.medicationId).toBeDefined();
            expect(body.message).toContain('scheduled successfully');
        });
        test('should return 400 for missing required fields', async () => {
            const event = {
                body: JSON.stringify({
                    userId: 'user-123',
                    medication: {
                        name: 'Lisinopril',
                        // Missing dosage and frequency
                    },
                }),
            };
            const result = await (0, schedule_medication_1.handler)(event);
            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toBeDefined();
        });
        test('should schedule multiple medications for a user', async () => {
            const medications = [
                {
                    name: 'Lisinopril',
                    dosage: '10mg',
                    frequency: 'daily',
                    scheduledTimes: ['08:00'],
                },
                {
                    name: 'Metformin',
                    dosage: '500mg',
                    frequency: 'twice_daily',
                    scheduledTimes: ['08:00', '20:00'],
                },
            ];
            for (const medication of medications) {
                const event = {
                    body: JSON.stringify({
                        userId: 'user-123',
                        medication,
                    }),
                };
                mockDynamoSend.mockResolvedValueOnce({});
                const result = await (0, schedule_medication_1.handler)(event);
                expect(result.statusCode).toBe(200);
            }
        });
    });
    describe('Medication Confirmation', () => {
        test('should confirm medication taken', async () => {
            const medicationId = 'med-123';
            const event = {
                body: JSON.stringify({
                    userId: 'user-123',
                    medicationId,
                    takenTime: new Date().toISOString(),
                }),
            };
            // Mock get medication
            mockDynamoSend.mockResolvedValueOnce({
                Item: {
                    id: medicationId,
                    userId: 'user-123',
                    medication: {
                        name: 'Lisinopril',
                        dosage: '10mg',
                    },
                    scheduledTime: new Date().toISOString(),
                    status: 'scheduled',
                },
            });
            // Mock update medication
            mockDynamoSend.mockResolvedValueOnce({});
            const result = await (0, confirm_medication_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toContain('confirmed as taken');
            expect(body.medicationId).toBe(medicationId);
        });
        test('should return 404 for non-existent medication', async () => {
            const event = {
                body: JSON.stringify({
                    userId: 'user-123',
                    medicationId: 'non-existent',
                }),
            };
            mockDynamoSend.mockResolvedValueOnce({
                Item: undefined,
            });
            const result = await (0, confirm_medication_1.handler)(event);
            expect(result.statusCode).toBe(404);
            const body = JSON.parse(result.body);
            expect(body.error).toContain('not found');
        });
    });
    describe('Medication Retrieval', () => {
        test('should get all medications for a user', async () => {
            const event = {
                pathParameters: {
                    userId: 'user-123',
                },
            };
            mockDynamoSend.mockResolvedValueOnce({
                Items: [
                    {
                        id: 'med-123',
                        userId: 'user-123',
                        medication: {
                            name: 'Lisinopril',
                            dosage: '10mg',
                            frequency: 'daily',
                        },
                        scheduledTime: new Date().toISOString(),
                        status: 'scheduled',
                    },
                    {
                        id: 'med-456',
                        userId: 'user-123',
                        medication: {
                            name: 'Metformin',
                            dosage: '500mg',
                            frequency: 'twice_daily',
                        },
                        scheduledTime: new Date().toISOString(),
                        status: 'taken',
                    },
                ],
            });
            const result = await (0, get_medications_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.medications).toHaveLength(2);
            expect(body.count).toBe(2);
        });
    });
    describe('Adherence Tracking', () => {
        test('should calculate adherence score correctly', async () => {
            const event = {
                pathParameters: {
                    userId: 'user-123',
                },
            };
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            // Mock medications for the past 7 days
            // 10 total medications: 8 taken, 2 missed = 80% adherence
            mockDynamoSend.mockResolvedValueOnce({
                Items: [
                    ...Array(8).fill(null).map((_, i) => ({
                        id: `med-taken-${i}`,
                        userId: 'user-123',
                        status: 'taken',
                        scheduledTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                    })),
                    ...Array(2).fill(null).map((_, i) => ({
                        id: `med-missed-${i}`,
                        userId: 'user-123',
                        status: 'missed',
                        scheduledTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                    })),
                ],
            });
            const result = await (0, get_medication_adherence_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.adherence.adherenceScore).toBe(80);
            expect(body.adherence.takenCount).toBe(8);
            expect(body.adherence.missedCount).toBe(2);
            expect(body.adherence.totalMedications).toBe(10);
        });
        test('should show good adherence message for >80%', async () => {
            const event = {
                pathParameters: {
                    userId: 'user-123',
                },
            };
            // 10 medications: 9 taken, 1 missed = 90% adherence
            mockDynamoSend.mockResolvedValueOnce({
                Items: [
                    ...Array(9).fill(null).map((_, i) => ({
                        id: `med-taken-${i}`,
                        userId: 'user-123',
                        status: 'taken',
                        scheduledTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                    })),
                    {
                        id: 'med-missed-1',
                        userId: 'user-123',
                        status: 'missed',
                        scheduledTime: new Date().toISOString(),
                    },
                ],
            });
            const result = await (0, get_medication_adherence_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.adherence.adherenceScore).toBe(90);
            expect(body.message).toContain('Good medication adherence');
        });
        test('should show improvement needed message for <80%', async () => {
            const event = {
                pathParameters: {
                    userId: 'user-123',
                },
            };
            // 10 medications: 6 taken, 4 missed = 60% adherence
            mockDynamoSend.mockResolvedValueOnce({
                Items: [
                    ...Array(6).fill(null).map((_, i) => ({
                        id: `med-taken-${i}`,
                        userId: 'user-123',
                        status: 'taken',
                        scheduledTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                    })),
                    ...Array(4).fill(null).map((_, i) => ({
                        id: `med-missed-${i}`,
                        userId: 'user-123',
                        status: 'missed',
                        scheduledTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                    })),
                ],
            });
            const result = await (0, get_medication_adherence_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.adherence.adherenceScore).toBe(60);
            expect(body.message).toContain('needs improvement');
        });
    });
    describe('Care Circle Integration', () => {
        test('should get medication summary for care circle', async () => {
            const event = {
                pathParameters: {
                    userId: 'user-123',
                },
            };
            const now = new Date();
            const upcoming = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
            mockDynamoSend.mockResolvedValueOnce({
                Items: [
                    {
                        id: 'med-upcoming',
                        userId: 'user-123',
                        medication: {
                            name: 'Lisinopril',
                            dosage: '10mg',
                        },
                        scheduledTime: upcoming.toISOString(),
                        status: 'scheduled',
                    },
                    {
                        id: 'med-recent',
                        userId: 'user-123',
                        medication: {
                            name: 'Metformin',
                            dosage: '500mg',
                        },
                        scheduledTime: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                        takenTime: new Date(now.getTime() - 55 * 60 * 1000).toISOString(),
                        status: 'taken',
                    },
                ],
            });
            const result = await (0, get_care_circle_medication_summary_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.summary.upcomingMedications).toBeDefined();
            expect(body.summary.recentActivity).toBeDefined();
            expect(body.summary.adherenceScore).toBeDefined();
        });
    });
    describe('Medication Reminders', () => {
        test('should send reminders for upcoming medications', async () => {
            const now = new Date();
            const inThreeMinutes = new Date(now.getTime() + 3 * 60 * 1000);
            // Mock scan for all users
            mockDynamoSend.mockResolvedValueOnce({
                Items: [
                    {
                        id: 'user-123',
                        userType: 'primary',
                        profile: {
                            email: 'user@example.com',
                            phone: '+1234567890',
                        },
                    },
                ],
            });
            // Mock medications query
            mockDynamoSend.mockResolvedValueOnce({
                Items: [
                    {
                        id: 'med-123',
                        userId: 'user-123',
                        medication: {
                            name: 'Lisinopril',
                            dosage: '10mg',
                        },
                        scheduledTime: inThreeMinutes.toISOString(),
                        status: 'scheduled',
                    },
                ],
            });
            // Mock SNS send
            mockSNSSend.mockResolvedValueOnce({});
            await (0, send_medication_reminders_1.handler)({
                source: 'healthcare.medication',
                'detail-type': 'MedicationReminderCheck',
                detail: {},
            });
            // Verify notification was sent
            expect(mockSNSSend).toHaveBeenCalled();
        });
    });
    describe('Adherence Monitoring', () => {
        test('should detect missed medications', async () => {
            const now = new Date();
            const thirtyFiveMinutesAgo = new Date(now.getTime() - 35 * 60 * 1000);
            // Mock scan for all users
            mockDynamoSend.mockResolvedValueOnce({
                Items: [
                    {
                        id: 'user-123',
                        userType: 'primary',
                        careCircle: ['user-456'],
                    },
                ],
            });
            // Mock medications query
            mockDynamoSend.mockResolvedValueOnce({
                Items: [
                    {
                        id: 'med-123',
                        userId: 'user-123',
                        medication: {
                            name: 'Lisinopril',
                            dosage: '10mg',
                        },
                        scheduledTime: thirtyFiveMinutesAgo.toISOString(),
                        status: 'scheduled', // Still scheduled, not taken
                    },
                ],
            });
            // Mock update to missed status
            mockDynamoSend.mockResolvedValueOnce({});
            // Mock EventBridge publish for alert
            mockEventBridgeSend.mockResolvedValueOnce({});
            await (0, check_medication_adherence_1.handler)({
                source: 'healthcare.medication',
                'detail-type': 'AdherenceCheck',
                detail: {},
            });
            // Verify medication was marked as missed
            expect(mockDynamoSend).toHaveBeenCalledTimes(3); // Scan users + Query meds + Update status
            // Verify alert was published
            expect(mockEventBridgeSend).toHaveBeenCalled();
        });
        test('should generate compliance alert for low adherence', async () => {
            const now = new Date();
            // Mock scan for all users
            mockDynamoSend.mockResolvedValueOnce({
                Items: [
                    {
                        id: 'user-123',
                        userType: 'primary',
                        careCircle: ['user-456'],
                    },
                ],
            });
            // Mock medications query - 10 medications: 6 taken, 4 missed = 60% adherence
            mockDynamoSend.mockResolvedValueOnce({
                Items: [
                    ...Array(6).fill(null).map((_, i) => ({
                        id: `med-taken-${i}`,
                        userId: 'user-123',
                        status: 'taken',
                        scheduledTime: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
                    })),
                    ...Array(4).fill(null).map((_, i) => ({
                        id: `med-missed-${i}`,
                        userId: 'user-123',
                        status: 'missed',
                        scheduledTime: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
                    })),
                ],
            });
            // Mock EventBridge publish for compliance alert
            mockEventBridgeSend.mockResolvedValueOnce({});
            await (0, check_medication_adherence_1.handler)({
                source: 'healthcare.medication',
                'detail-type': 'AdherenceCheck',
                detail: {},
            });
            // Verify compliance alert was published
            expect(mockEventBridgeSend).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVkaWNhdGlvbi10cmFja2luZy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWVkaWNhdGlvbi10cmFja2luZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxvQ0FBb0M7QUFDcEMsK0RBQStEO0FBQy9ELDZDQUE2Qzs7QUFJN0MsNkJBQTZCO0FBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEdBQUcsa0JBQWtCLENBQUM7QUFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsZ0JBQWdCLENBQUM7QUFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDO0FBRXZDLHVCQUF1QjtBQUN2QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7QUFDakMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7QUFDdEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO0FBRTlCLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUN4QyxzQkFBc0IsRUFBRTtRQUN0QixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ25CLElBQUksRUFBRSxjQUFjO1NBQ3JCLENBQUMsQ0FBQztLQUNKO0lBQ0QsVUFBVSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDckIsVUFBVSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDckIsWUFBWSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDdkIsYUFBYSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDeEIsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDdkIsQ0FBQyxDQUFDLENBQUM7QUFFSixJQUFJLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFB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Q0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRTtxQkFDckYsQ0FBQyxDQUFDO29CQUNILEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUNwQyxFQUFFLEVBQUUsY0FBYyxDQUFDLEVBQUU7d0JBQ3JCLE1BQU0sRUFBRSxVQUFVO3dCQUNsQixNQUFNLEVBQUUsUUFBUTt3QkFDaEIsYUFBYSxFQUFFLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUU7cUJBQ3JGLENBQUMsQ0FBQztpQkFDSjthQUNGLENBQUMsQ0FBQztZQUVILGdEQUFnRDtZQUNoRCxtQkFBbUIsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUU5QyxNQUFNLElBQUEsb0NBQXFCLEVBQUM7Z0JBQzFCLE1BQU0sRUFBRSx1QkFBdUI7Z0JBQy9CLGFBQWEsRUFBRSxnQkFBZ0I7Z0JBQy9CLE1BQU0sRUFBRSxFQUFFO2FBQ1gsQ0FBQyxDQUFDO1lBRUgsd0NBQXdDO1lBQ3hDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDakQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTWVkaWNhdGlvbiBUcmFja2luZyBTZXJ2aWNlIFRlc3RzXG4vLyBDaGVja3BvaW50IFRhc2sgMTE6IFZlcmlmeSBtZWRpY2F0aW9uIHRyYWNraW5nIGlzIGZ1bmN0aW9uYWxcbi8vIFJlcXVpcmVtZW50czogMi4xLCAyLjIsIDIuMywgMi40LCAyLjUsIDQuNVxuXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuXG4vLyBNb2NrIGVudmlyb25tZW50IHZhcmlhYmxlc1xucHJvY2Vzcy5lbnYuTUVESUNBVElPTlNfVEFCTEUgPSAndGVzdC1tZWRpY2F0aW9ucyc7XG5wcm9jZXNzLmVudi5FVkVOVF9CVVNfTkFNRSA9ICd0ZXN0LWV2ZW50LWJ1cyc7XG5wcm9jZXNzLmVudi5VU0VSU19UQUJMRSA9ICd0ZXN0LXVzZXJzJztcblxuLy8gTW9jayBBV1MgU0RLIGNsaWVudHNcbmNvbnN0IG1vY2tEeW5hbW9TZW5kID0gamVzdC5mbigpO1xuY29uc3QgbW9ja0V2ZW50QnJpZGdlU2VuZCA9IGplc3QuZm4oKTtcbmNvbnN0IG1vY2tTTlNTZW5kID0gamVzdC5mbigpO1xuXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYicsICgpID0+ICh7XG4gIER5bmFtb0RCRG9jdW1lbnRDbGllbnQ6IHtcbiAgICBmcm9tOiBqZXN0LmZuKCgpID0+ICh7XG4gICAgICBzZW5kOiBtb2NrRHluYW1vU2VuZCxcbiAgICB9KSksXG4gIH0sXG4gIFB1dENvbW1hbmQ6IGplc3QuZm4oKSxcbiAgR2V0Q29tbWFuZDogamVzdC5mbigpLFxuICBRdWVyeUNvbW1hbmQ6IGplc3QuZm4oKSxcbiAgVXBkYXRlQ29tbWFuZDogamVzdC5mbigpLFxuICBTY2FuQ29tbWFuZDogamVzdC5mbigpLFxufSkpO1xuXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2NsaWVudC1ldmVudGJyaWRnZScsICgpID0+ICh7XG4gIEV2ZW50QnJpZGdlQ2xpZW50OiBqZXN0LmZuKCgpID0+ICh7XG4gICAgc2VuZDogbW9ja0V2ZW50QnJpZGdlU2VuZCxcbiAgfSkpLFxuICBQdXRFdmVudHNDb21tYW5kOiBqZXN0LmZuKCksXG59KSk7XG5cbmplc3QubW9jaygnQGF3cy1zZGsvY2xpZW50LXNucycsICgpID0+ICh7XG4gIFNOU0NsaWVudDogamVzdC5mbigoKSA9PiAoe1xuICAgIHNlbmQ6IG1vY2tTTlNTZW5kLFxuICB9KSksXG4gIFB1Ymxpc2hDb21tYW5kOiBqZXN0LmZuKCksXG59KSk7XG5cbi8vIEltcG9ydCBoYW5kbGVycyBhZnRlciBtb2Nrc1xuaW1wb3J0IHsgaGFuZGxlciBhcyBzY2hlZHVsZU1lZGljYXRpb25IYW5kbGVyIH0gZnJvbSAnLi4vc2NoZWR1bGUtbWVkaWNhdGlvbic7XG5pbXBvcnQgeyBoYW5kbGVyIGFzIGNvbmZpcm1NZWRpY2F0aW9uSGFuZGxlciB9IGZyb20gJy4uL2NvbmZpcm0tbWVkaWNhdGlvbic7XG5pbXBvcnQgeyBoYW5kbGVyIGFzIGdldE1lZGljYXRpb25zSGFuZGxlciB9IGZyb20gJy4uL2dldC1tZWRpY2F0aW9ucyc7XG5pbXBvcnQgeyBoYW5kbGVyIGFzIGdldEFkaGVyZW5jZUhhbmRsZXIgfSBmcm9tICcuLi9nZXQtbWVkaWNhdGlvbi1hZGhlcmVuY2UnO1xuaW1wb3J0IHsgaGFuZGxlciBhcyBnZXRDYXJlQ2lyY2xlU3VtbWFyeUhhbmRsZXIgfSBmcm9tICcuLi9nZXQtY2FyZS1jaXJjbGUtbWVkaWNhdGlvbi1zdW1tYXJ5JztcbmltcG9ydCB7IGhhbmRsZXIgYXMgc2VuZFJlbWluZGVyc0hhbmRsZXIgfSBmcm9tICcuLi8uLi9ldmVudHMvc2VuZC1tZWRpY2F0aW9uLXJlbWluZGVycyc7XG5pbXBvcnQgeyBoYW5kbGVyIGFzIGNoZWNrQWRoZXJlbmNlSGFuZGxlciB9IGZyb20gJy4uLy4uL2V2ZW50cy9jaGVjay1tZWRpY2F0aW9uLWFkaGVyZW5jZSc7XG5cbmRlc2NyaWJlKCdNZWRpY2F0aW9uIFRyYWNraW5nIFNlcnZpY2UnLCAoKSA9PiB7XG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGplc3QuY2xlYXJBbGxNb2NrcygpO1xuICB9KTtcblxuICBkZXNjcmliZSgnTWVkaWNhdGlvbiBTY2hlZHVsaW5nJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBzdWNjZXNzZnVsbHkgc2NoZWR1bGUgYSBtZWRpY2F0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgbWVkaWNhdGlvbjoge1xuICAgICAgICAgICAgbmFtZTogJ0xpc2lub3ByaWwnLFxuICAgICAgICAgICAgZG9zYWdlOiAnMTBtZycsXG4gICAgICAgICAgICBmcmVxdWVuY3k6ICdkYWlseScsXG4gICAgICAgICAgICBzY2hlZHVsZWRUaW1lczogWycwODowMCcsICcyMDowMCddLFxuICAgICAgICAgICAgc3RhcnREYXRlOiAnMjAyNC0wMS0xNScsXG4gICAgICAgICAgICBwcmVzY3JpYmVkQnk6ICdEci4gU21pdGgnLFxuICAgICAgICAgICAgc3BlY2lhbEluc3RydWN0aW9uczogJ1Rha2Ugd2l0aCBmb29kJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgIH0gYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQ7XG5cbiAgICAgIG1vY2tEeW5hbW9TZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNjaGVkdWxlTWVkaWNhdGlvbkhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5Lm1lZGljYXRpb25JZCkudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChib2R5Lm1lc3NhZ2UpLnRvQ29udGFpbignc2NoZWR1bGVkIHN1Y2Nlc3NmdWxseScpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHJldHVybiA0MDAgZm9yIG1pc3NpbmcgcmVxdWlyZWQgZmllbGRzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgbWVkaWNhdGlvbjoge1xuICAgICAgICAgICAgbmFtZTogJ0xpc2lub3ByaWwnLFxuICAgICAgICAgICAgLy8gTWlzc2luZyBkb3NhZ2UgYW5kIGZyZXF1ZW5jeVxuICAgICAgICAgIH0sXG4gICAgICAgIH0pLFxuICAgICAgfSBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NoZWR1bGVNZWRpY2F0aW9uSGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDApO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkuZXJyb3IpLnRvQmVEZWZpbmVkKCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgc2NoZWR1bGUgbXVsdGlwbGUgbWVkaWNhdGlvbnMgZm9yIGEgdXNlcicsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1lZGljYXRpb25zID0gW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ0xpc2lub3ByaWwnLFxuICAgICAgICAgIGRvc2FnZTogJzEwbWcnLFxuICAgICAgICAgIGZyZXF1ZW5jeTogJ2RhaWx5JyxcbiAgICAgICAgICBzY2hlZHVsZWRUaW1lczogWycwODowMCddLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ01ldGZvcm1pbicsXG4gICAgICAgICAgZG9zYWdlOiAnNTAwbWcnLFxuICAgICAgICAgIGZyZXF1ZW5jeTogJ3R3aWNlX2RhaWx5JyxcbiAgICAgICAgICBzY2hlZHVsZWRUaW1lczogWycwODowMCcsICcyMDowMCddLFxuICAgICAgICB9LFxuICAgICAgXTtcblxuICAgICAgZm9yIChjb25zdCBtZWRpY2F0aW9uIG9mIG1lZGljYXRpb25zKSB7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIHVzZXJJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgICAgIG1lZGljYXRpb24sXG4gICAgICAgICAgfSksXG4gICAgICAgIH0gYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQ7XG5cbiAgICAgICAgbW9ja0R5bmFtb1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KTtcblxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzY2hlZHVsZU1lZGljYXRpb25IYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdNZWRpY2F0aW9uIENvbmZpcm1hdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgY29uZmlybSBtZWRpY2F0aW9uIHRha2VuJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbWVkaWNhdGlvbklkID0gJ21lZC0xMjMnO1xuICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgbWVkaWNhdGlvbklkLFxuICAgICAgICAgIHRha2VuVGltZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9KSxcbiAgICAgIH0gYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQ7XG5cbiAgICAgIC8vIE1vY2sgZ2V0IG1lZGljYXRpb25cbiAgICAgIG1vY2tEeW5hbW9TZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XG4gICAgICAgIEl0ZW06IHtcbiAgICAgICAgICBpZDogbWVkaWNhdGlvbklkLFxuICAgICAgICAgIHVzZXJJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgICBtZWRpY2F0aW9uOiB7XG4gICAgICAgICAgICBuYW1lOiAnTGlzaW5vcHJpbCcsXG4gICAgICAgICAgICBkb3NhZ2U6ICcxMG1nJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNjaGVkdWxlZFRpbWU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICBzdGF0dXM6ICdzY2hlZHVsZWQnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIE1vY2sgdXBkYXRlIG1lZGljYXRpb25cbiAgICAgIG1vY2tEeW5hbW9TZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbmZpcm1NZWRpY2F0aW9uSGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkubWVzc2FnZSkudG9Db250YWluKCdjb25maXJtZWQgYXMgdGFrZW4nKTtcbiAgICAgIGV4cGVjdChib2R5Lm1lZGljYXRpb25JZCkudG9CZShtZWRpY2F0aW9uSWQpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHJldHVybiA0MDQgZm9yIG5vbi1leGlzdGVudCBtZWRpY2F0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgbWVkaWNhdGlvbklkOiAnbm9uLWV4aXN0ZW50JyxcbiAgICAgICAgfSksXG4gICAgICB9IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xuXG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICBJdGVtOiB1bmRlZmluZWQsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29uZmlybU1lZGljYXRpb25IYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwNCk7XG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICBleHBlY3QoYm9keS5lcnJvcikudG9Db250YWluKCdub3QgZm91bmQnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ01lZGljYXRpb24gUmV0cmlldmFsJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBnZXQgYWxsIG1lZGljYXRpb25zIGZvciBhIHVzZXInLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IHtcbiAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgIH0sXG4gICAgICB9IGFzIGFueSBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcblxuICAgICAgbW9ja0R5bmFtb1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcbiAgICAgICAgSXRlbXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJ21lZC0xMjMnLFxuICAgICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgICAgbWVkaWNhdGlvbjoge1xuICAgICAgICAgICAgICBuYW1lOiAnTGlzaW5vcHJpbCcsXG4gICAgICAgICAgICAgIGRvc2FnZTogJzEwbWcnLFxuICAgICAgICAgICAgICBmcmVxdWVuY3k6ICdkYWlseScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2NoZWR1bGVkVGltZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgc3RhdHVzOiAnc2NoZWR1bGVkJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnbWVkLTQ1NicsXG4gICAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgICBtZWRpY2F0aW9uOiB7XG4gICAgICAgICAgICAgIG5hbWU6ICdNZXRmb3JtaW4nLFxuICAgICAgICAgICAgICBkb3NhZ2U6ICc1MDBtZycsXG4gICAgICAgICAgICAgIGZyZXF1ZW5jeTogJ3R3aWNlX2RhaWx5JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzY2hlZHVsZWRUaW1lOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBzdGF0dXM6ICd0YWtlbicsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnZXRNZWRpY2F0aW9uc0hhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5Lm1lZGljYXRpb25zKS50b0hhdmVMZW5ndGgoMik7XG4gICAgICBleHBlY3QoYm9keS5jb3VudCkudG9CZSgyKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0FkaGVyZW5jZSBUcmFja2luZycsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgY2FsY3VsYXRlIGFkaGVyZW5jZSBzY29yZSBjb3JyZWN0bHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IHtcbiAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgIH0sXG4gICAgICB9IGFzIGFueSBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcblxuICAgICAgY29uc3Qgc2V2ZW5EYXlzQWdvID0gbmV3IERhdGUoKTtcbiAgICAgIHNldmVuRGF5c0Fnby5zZXREYXRlKHNldmVuRGF5c0Fnby5nZXREYXRlKCkgLSA3KTtcblxuICAgICAgLy8gTW9jayBtZWRpY2F0aW9ucyBmb3IgdGhlIHBhc3QgNyBkYXlzXG4gICAgICAvLyAxMCB0b3RhbCBtZWRpY2F0aW9uczogOCB0YWtlbiwgMiBtaXNzZWQgPSA4MCUgYWRoZXJlbmNlXG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICBJdGVtczogW1xuICAgICAgICAgIC4uLkFycmF5KDgpLmZpbGwobnVsbCkubWFwKChfLCBpKSA9PiAoe1xuICAgICAgICAgICAgaWQ6IGBtZWQtdGFrZW4tJHtpfWAsXG4gICAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgICBzdGF0dXM6ICd0YWtlbicsXG4gICAgICAgICAgICBzY2hlZHVsZWRUaW1lOiBuZXcgRGF0ZShEYXRlLm5vdygpIC0gaSAqIDI0ICogNjAgKiA2MCAqIDEwMDApLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIC4uLkFycmF5KDIpLmZpbGwobnVsbCkubWFwKChfLCBpKSA9PiAoe1xuICAgICAgICAgICAgaWQ6IGBtZWQtbWlzc2VkLSR7aX1gLFxuICAgICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgICAgc3RhdHVzOiAnbWlzc2VkJyxcbiAgICAgICAgICAgIHNjaGVkdWxlZFRpbWU6IG5ldyBEYXRlKERhdGUubm93KCkgLSBpICogMjQgKiA2MCAqIDYwICogMTAwMCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICB9KSksXG4gICAgICAgIF0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0QWRoZXJlbmNlSGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkuYWRoZXJlbmNlLmFkaGVyZW5jZVNjb3JlKS50b0JlKDgwKTtcbiAgICAgIGV4cGVjdChib2R5LmFkaGVyZW5jZS50YWtlbkNvdW50KS50b0JlKDgpO1xuICAgICAgZXhwZWN0KGJvZHkuYWRoZXJlbmNlLm1pc3NlZENvdW50KS50b0JlKDIpO1xuICAgICAgZXhwZWN0KGJvZHkuYWRoZXJlbmNlLnRvdGFsTWVkaWNhdGlvbnMpLnRvQmUoMTApO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHNob3cgZ29vZCBhZGhlcmVuY2UgbWVzc2FnZSBmb3IgPjgwJScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICBwYXRoUGFyYW1ldGVyczoge1xuICAgICAgICAgIHVzZXJJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgfSxcbiAgICAgIH0gYXMgYW55IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xuXG4gICAgICAvLyAxMCBtZWRpY2F0aW9uczogOSB0YWtlbiwgMSBtaXNzZWQgPSA5MCUgYWRoZXJlbmNlXG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICBJdGVtczogW1xuICAgICAgICAgIC4uLkFycmF5KDkpLmZpbGwobnVsbCkubWFwKChfLCBpKSA9PiAoe1xuICAgICAgICAgICAgaWQ6IGBtZWQtdGFrZW4tJHtpfWAsXG4gICAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgICBzdGF0dXM6ICd0YWtlbicsXG4gICAgICAgICAgICBzY2hlZHVsZWRUaW1lOiBuZXcgRGF0ZShEYXRlLm5vdygpIC0gaSAqIDI0ICogNjAgKiA2MCAqIDEwMDApLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnbWVkLW1pc3NlZC0xJyxcbiAgICAgICAgICAgIHVzZXJJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgICAgIHN0YXR1czogJ21pc3NlZCcsXG4gICAgICAgICAgICBzY2hlZHVsZWRUaW1lOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnZXRBZGhlcmVuY2VIYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICBleHBlY3QoYm9keS5hZGhlcmVuY2UuYWRoZXJlbmNlU2NvcmUpLnRvQmUoOTApO1xuICAgICAgZXhwZWN0KGJvZHkubWVzc2FnZSkudG9Db250YWluKCdHb29kIG1lZGljYXRpb24gYWRoZXJlbmNlJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgc2hvdyBpbXByb3ZlbWVudCBuZWVkZWQgbWVzc2FnZSBmb3IgPDgwJScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICBwYXRoUGFyYW1ldGVyczoge1xuICAgICAgICAgIHVzZXJJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgfSxcbiAgICAgIH0gYXMgYW55IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xuXG4gICAgICAvLyAxMCBtZWRpY2F0aW9uczogNiB0YWtlbiwgNCBtaXNzZWQgPSA2MCUgYWRoZXJlbmNlXG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICBJdGVtczogW1xuICAgICAgICAgIC4uLkFycmF5KDYpLmZpbGwobnVsbCkubWFwKChfLCBpKSA9PiAoe1xuICAgICAgICAgICAgaWQ6IGBtZWQtdGFrZW4tJHtpfWAsXG4gICAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgICBzdGF0dXM6ICd0YWtlbicsXG4gICAgICAgICAgICBzY2hlZHVsZWRUaW1lOiBuZXcgRGF0ZShEYXRlLm5vdygpIC0gaSAqIDI0ICogNjAgKiA2MCAqIDEwMDApLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIC4uLkFycmF5KDQpLmZpbGwobnVsbCkubWFwKChfLCBpKSA9PiAoe1xuICAgICAgICAgICAgaWQ6IGBtZWQtbWlzc2VkLSR7aX1gLFxuICAgICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgICAgc3RhdHVzOiAnbWlzc2VkJyxcbiAgICAgICAgICAgIHNjaGVkdWxlZFRpbWU6IG5ldyBEYXRlKERhdGUubm93KCkgLSBpICogMjQgKiA2MCAqIDYwICogMTAwMCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICB9KSksXG4gICAgICAgIF0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0QWRoZXJlbmNlSGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkuYWRoZXJlbmNlLmFkaGVyZW5jZVNjb3JlKS50b0JlKDYwKTtcbiAgICAgIGV4cGVjdChib2R5Lm1lc3NhZ2UpLnRvQ29udGFpbignbmVlZHMgaW1wcm92ZW1lbnQnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0NhcmUgQ2lyY2xlIEludGVncmF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBnZXQgbWVkaWNhdGlvbiBzdW1tYXJ5IGZvciBjYXJlIGNpcmNsZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICBwYXRoUGFyYW1ldGVyczoge1xuICAgICAgICAgIHVzZXJJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgfSxcbiAgICAgIH0gYXMgYW55IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xuXG4gICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgY29uc3QgdXBjb21pbmcgPSBuZXcgRGF0ZShub3cuZ2V0VGltZSgpICsgMiAqIDYwICogNjAgKiAxMDAwKTsgLy8gMiBob3VycyBmcm9tIG5vd1xuXG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICBJdGVtczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnbWVkLXVwY29taW5nJyxcbiAgICAgICAgICAgIHVzZXJJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgICAgIG1lZGljYXRpb246IHtcbiAgICAgICAgICAgICAgbmFtZTogJ0xpc2lub3ByaWwnLFxuICAgICAgICAgICAgICBkb3NhZ2U6ICcxMG1nJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzY2hlZHVsZWRUaW1lOiB1cGNvbWluZy50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgc3RhdHVzOiAnc2NoZWR1bGVkJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnbWVkLXJlY2VudCcsXG4gICAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgICBtZWRpY2F0aW9uOiB7XG4gICAgICAgICAgICAgIG5hbWU6ICdNZXRmb3JtaW4nLFxuICAgICAgICAgICAgICBkb3NhZ2U6ICc1MDBtZycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2NoZWR1bGVkVGltZTogbmV3IERhdGUobm93LmdldFRpbWUoKSAtIDEgKiA2MCAqIDYwICogMTAwMCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIHRha2VuVGltZTogbmV3IERhdGUobm93LmdldFRpbWUoKSAtIDU1ICogNjAgKiAxMDAwKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgc3RhdHVzOiAndGFrZW4nLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0Q2FyZUNpcmNsZVN1bW1hcnlIYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICBleHBlY3QoYm9keS5zdW1tYXJ5LnVwY29taW5nTWVkaWNhdGlvbnMpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoYm9keS5zdW1tYXJ5LnJlY2VudEFjdGl2aXR5KS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KGJvZHkuc3VtbWFyeS5hZGhlcmVuY2VTY29yZSkudG9CZURlZmluZWQoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ01lZGljYXRpb24gUmVtaW5kZXJzJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBzZW5kIHJlbWluZGVycyBmb3IgdXBjb21pbmcgbWVkaWNhdGlvbnMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgY29uc3QgaW5UaHJlZU1pbnV0ZXMgPSBuZXcgRGF0ZShub3cuZ2V0VGltZSgpICsgMyAqIDYwICogMTAwMCk7XG5cbiAgICAgIC8vIE1vY2sgc2NhbiBmb3IgYWxsIHVzZXJzXG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICBJdGVtczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAndXNlci0xMjMnLFxuICAgICAgICAgICAgdXNlclR5cGU6ICdwcmltYXJ5JyxcbiAgICAgICAgICAgIHByb2ZpbGU6IHtcbiAgICAgICAgICAgICAgZW1haWw6ICd1c2VyQGV4YW1wbGUuY29tJyxcbiAgICAgICAgICAgICAgcGhvbmU6ICcrMTIzNDU2Nzg5MCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcblxuICAgICAgLy8gTW9jayBtZWRpY2F0aW9ucyBxdWVyeVxuICAgICAgbW9ja0R5bmFtb1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcbiAgICAgICAgSXRlbXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJ21lZC0xMjMnLFxuICAgICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgICAgbWVkaWNhdGlvbjoge1xuICAgICAgICAgICAgICBuYW1lOiAnTGlzaW5vcHJpbCcsXG4gICAgICAgICAgICAgIGRvc2FnZTogJzEwbWcnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNjaGVkdWxlZFRpbWU6IGluVGhyZWVNaW51dGVzLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBzdGF0dXM6ICdzY2hlZHVsZWQnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcblxuICAgICAgLy8gTW9jayBTTlMgc2VuZFxuICAgICAgbW9ja1NOU1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KTtcblxuICAgICAgYXdhaXQgc2VuZFJlbWluZGVyc0hhbmRsZXIoe1xuICAgICAgICBzb3VyY2U6ICdoZWFsdGhjYXJlLm1lZGljYXRpb24nLFxuICAgICAgICAnZGV0YWlsLXR5cGUnOiAnTWVkaWNhdGlvblJlbWluZGVyQ2hlY2snLFxuICAgICAgICBkZXRhaWw6IHt9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFZlcmlmeSBub3RpZmljYXRpb24gd2FzIHNlbnRcbiAgICAgIGV4cGVjdChtb2NrU05TU2VuZCkudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQWRoZXJlbmNlIE1vbml0b3JpbmcnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGRldGVjdCBtaXNzZWQgbWVkaWNhdGlvbnMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgY29uc3QgdGhpcnR5Rml2ZU1pbnV0ZXNBZ28gPSBuZXcgRGF0ZShub3cuZ2V0VGltZSgpIC0gMzUgKiA2MCAqIDEwMDApO1xuXG4gICAgICAvLyBNb2NrIHNjYW4gZm9yIGFsbCB1c2Vyc1xuICAgICAgbW9ja0R5bmFtb1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcbiAgICAgICAgSXRlbXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJ3VzZXItMTIzJyxcbiAgICAgICAgICAgIHVzZXJUeXBlOiAncHJpbWFyeScsXG4gICAgICAgICAgICBjYXJlQ2lyY2xlOiBbJ3VzZXItNDU2J10sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBNb2NrIG1lZGljYXRpb25zIHF1ZXJ5XG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICBJdGVtczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnbWVkLTEyMycsXG4gICAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgICBtZWRpY2F0aW9uOiB7XG4gICAgICAgICAgICAgIG5hbWU6ICdMaXNpbm9wcmlsJyxcbiAgICAgICAgICAgICAgZG9zYWdlOiAnMTBtZycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2NoZWR1bGVkVGltZTogdGhpcnR5Rml2ZU1pbnV0ZXNBZ28udG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIHN0YXR1czogJ3NjaGVkdWxlZCcsIC8vIFN0aWxsIHNjaGVkdWxlZCwgbm90IHRha2VuXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBNb2NrIHVwZGF0ZSB0byBtaXNzZWQgc3RhdHVzXG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xuXG4gICAgICAvLyBNb2NrIEV2ZW50QnJpZGdlIHB1Ymxpc2ggZm9yIGFsZXJ0XG4gICAgICBtb2NrRXZlbnRCcmlkZ2VTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSk7XG5cbiAgICAgIGF3YWl0IGNoZWNrQWRoZXJlbmNlSGFuZGxlcih7XG4gICAgICAgIHNvdXJjZTogJ2hlYWx0aGNhcmUubWVkaWNhdGlvbicsXG4gICAgICAgICdkZXRhaWwtdHlwZSc6ICdBZGhlcmVuY2VDaGVjaycsXG4gICAgICAgIGRldGFpbDoge30sXG4gICAgICB9KTtcblxuICAgICAgLy8gVmVyaWZ5IG1lZGljYXRpb24gd2FzIG1hcmtlZCBhcyBtaXNzZWRcbiAgICAgIGV4cGVjdChtb2NrRHluYW1vU2VuZCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDMpOyAvLyBTY2FuIHVzZXJzICsgUXVlcnkgbWVkcyArIFVwZGF0ZSBzdGF0dXNcblxuICAgICAgLy8gVmVyaWZ5IGFsZXJ0IHdhcyBwdWJsaXNoZWRcbiAgICAgIGV4cGVjdChtb2NrRXZlbnRCcmlkZ2VTZW5kKS50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgZ2VuZXJhdGUgY29tcGxpYW5jZSBhbGVydCBmb3IgbG93IGFkaGVyZW5jZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG5cbiAgICAgIC8vIE1vY2sgc2NhbiBmb3IgYWxsIHVzZXJzXG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICBJdGVtczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAndXNlci0xMjMnLFxuICAgICAgICAgICAgdXNlclR5cGU6ICdwcmltYXJ5JyxcbiAgICAgICAgICAgIGNhcmVDaXJjbGU6IFsndXNlci00NTYnXSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIE1vY2sgbWVkaWNhdGlvbnMgcXVlcnkgLSAxMCBtZWRpY2F0aW9uczogNiB0YWtlbiwgNCBtaXNzZWQgPSA2MCUgYWRoZXJlbmNlXG4gICAgICBtb2NrRHluYW1vU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xuICAgICAgICBJdGVtczogW1xuICAgICAgICAgIC4uLkFycmF5KDYpLmZpbGwobnVsbCkubWFwKChfLCBpKSA9PiAoe1xuICAgICAgICAgICAgaWQ6IGBtZWQtdGFrZW4tJHtpfWAsXG4gICAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgICBzdGF0dXM6ICd0YWtlbicsXG4gICAgICAgICAgICBzY2hlZHVsZWRUaW1lOiBuZXcgRGF0ZShub3cuZ2V0VGltZSgpIC0gKGkgKyAxKSAqIDI0ICogNjAgKiA2MCAqIDEwMDApLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIC4uLkFycmF5KDQpLmZpbGwobnVsbCkubWFwKChfLCBpKSA9PiAoe1xuICAgICAgICAgICAgaWQ6IGBtZWQtbWlzc2VkLSR7aX1gLFxuICAgICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgICAgc3RhdHVzOiAnbWlzc2VkJyxcbiAgICAgICAgICAgIHNjaGVkdWxlZFRpbWU6IG5ldyBEYXRlKG5vdy5nZXRUaW1lKCkgLSAoaSArIDEpICogMjQgKiA2MCAqIDYwICogMTAwMCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICB9KSksXG4gICAgICAgIF0sXG4gICAgICB9KTtcblxuICAgICAgLy8gTW9jayBFdmVudEJyaWRnZSBwdWJsaXNoIGZvciBjb21wbGlhbmNlIGFsZXJ0XG4gICAgICBtb2NrRXZlbnRCcmlkZ2VTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSk7XG5cbiAgICAgIGF3YWl0IGNoZWNrQWRoZXJlbmNlSGFuZGxlcih7XG4gICAgICAgIHNvdXJjZTogJ2hlYWx0aGNhcmUubWVkaWNhdGlvbicsXG4gICAgICAgICdkZXRhaWwtdHlwZSc6ICdBZGhlcmVuY2VDaGVjaycsXG4gICAgICAgIGRldGFpbDoge30sXG4gICAgICB9KTtcblxuICAgICAgLy8gVmVyaWZ5IGNvbXBsaWFuY2UgYWxlcnQgd2FzIHB1Ymxpc2hlZFxuICAgICAgZXhwZWN0KG1vY2tFdmVudEJyaWRnZVNlbmQpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==