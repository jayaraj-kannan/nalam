// Medication Tracking Service Tests
// Checkpoint Task 11: Verify medication tracking is functional
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.5

import { APIGatewayProxyEvent } from 'aws-lambda';

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
import { handler as scheduleMedicationHandler } from '../schedule-medication';
import { handler as confirmMedicationHandler } from '../confirm-medication';
import { handler as getMedicationsHandler } from '../get-medications';
import { handler as getAdherenceHandler } from '../get-medication-adherence';
import { handler as getCareCircleSummaryHandler } from '../get-care-circle-medication-summary';
import { handler as sendRemindersHandler } from '../../events/send-medication-reminders';
import { handler as checkAdherenceHandler } from '../../events/check-medication-adherence';

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
      } as APIGatewayProxyEvent;

      mockDynamoSend.mockResolvedValueOnce({});

      const result = await scheduleMedicationHandler(event);

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
      } as APIGatewayProxyEvent;

      const result = await scheduleMedicationHandler(event);

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
        } as APIGatewayProxyEvent;

        mockDynamoSend.mockResolvedValueOnce({});

        const result = await scheduleMedicationHandler(event);
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
      } as APIGatewayProxyEvent;

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

      const result = await confirmMedicationHandler(event);

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
      } as APIGatewayProxyEvent;

      mockDynamoSend.mockResolvedValueOnce({
        Item: undefined,
      });

      const result = await confirmMedicationHandler(event);

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
      } as any as APIGatewayProxyEvent;

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

      const result = await getMedicationsHandler(event);

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
      } as any as APIGatewayProxyEvent;

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

      const result = await getAdherenceHandler(event);

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
      } as any as APIGatewayProxyEvent;

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

      const result = await getAdherenceHandler(event);

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
      } as any as APIGatewayProxyEvent;

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

      const result = await getAdherenceHandler(event);

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
      } as any as APIGatewayProxyEvent;

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

      const result = await getCareCircleSummaryHandler(event);

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

      await sendRemindersHandler({
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

      await checkAdherenceHandler({
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

      await checkAdherenceHandler({
        source: 'healthcare.medication',
        'detail-type': 'AdherenceCheck',
        detail: {},
      });

      // Verify compliance alert was published
      expect(mockEventBridgeSend).toHaveBeenCalled();
    });
  });
});
