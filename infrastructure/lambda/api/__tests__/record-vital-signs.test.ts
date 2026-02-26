// Unit tests for Record Vital Signs Lambda function
// Requirements: 1.1, 1.4 - Test vital signs recording with validation

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../record-vital-signs';
import * as timestreamClient from '../../shared/timestream-client';
import * as auditLogger from '../../shared/audit-logger';
import * as usersDataAccess from '../../shared/data-access/users';

// Mock dependencies
jest.mock('../../shared/timestream-client');
jest.mock('../../shared/audit-logger');
jest.mock('../../shared/data-access/users');

describe('Record Vital Signs Lambda', () => {
  const mockWriteVitalSigns = timestreamClient.writeVitalSigns as jest.MockedFunction<typeof timestreamClient.writeVitalSigns>;
  const mockLogDataAccess = auditLogger.logDataAccess as jest.MockedFunction<typeof auditLogger.logDataAccess>;
  const mockGetUser = usersDataAccess.getUser as jest.MockedFunction<typeof usersDataAccess.getUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteVitalSigns.mockResolvedValue(undefined);
    mockLogDataAccess.mockResolvedValue(undefined);
    mockGetUser.mockResolvedValue({
      id: 'user-123',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-0100',
        dateOfBirth: '1950-01-01',
      },
      healthProfile: {
        conditions: [],
        medications: [],
        allergies: [],
        emergencyContacts: [],
        healthcareProviders: [],
        baselineVitals: {
          heartRate: { min: 60, max: 100 },
          bloodPressure: {
            systolic: { min: 90, max: 140 },
            diastolic: { min: 60, max: 90 },
          },
          temperature: { min: 97.0, max: 99.5 },
          oxygenSaturation: { min: 95, max: 100 },
          weight: { min: 150, max: 200 },
        },
      },
      careCircle: [],
      preferences: {
        fontSize: 'large',
        contrast: 'high',
        voiceNavigation: true,
        screenReader: false,
        language: 'en',
        timezone: 'America/New_York',
        notificationChannels: ['push', 'email'],
      },
      devices: [],
      createdAt: new Date('2024-01-01'),
      lastActive: new Date(),
    });
  });

  const createMockEvent = (body: any, userId: string = 'user-123'): Partial<APIGatewayProxyEvent> => ({
    body: JSON.stringify(body),
    requestContext: {
      authorizer: {
        principalId: userId,
        userType: 'primary',
      },
    } as any,
  });

  describe('Successful vital signs recording', () => {
    it('should record valid vital signs with all metrics', async () => {
      const event = createMockEvent({
        vitals: {
          heartRate: 75,
          bloodPressure: { systolic: 120, diastolic: 80 },
          temperature: 98.6,
          oxygenSaturation: 98,
          weight: 170,
        },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Vital signs recorded successfully');
      expect(body.vitals.heartRate).toBe(75);
      expect(body.vitals.bloodPressure.systolic).toBe(120);
      expect(mockWriteVitalSigns).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          heartRate: 75,
          systolicBP: 120,
          diastolicBP: 80,
          temperature: 98.6,
          oxygenSaturation: 98,
          weight: 170,
        }),
        expect.any(Date),
        'manual'
      );
    });

    it('should record partial vital signs', async () => {
      const event = createMockEvent({
        vitals: {
          heartRate: 72,
          temperature: 98.2,
        },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockWriteVitalSigns).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          heartRate: 72,
          temperature: 98.2,
        }),
        expect.any(Date),
        'manual'
      );
    });

    it('should mark source as device when deviceId is provided', async () => {
      const event = createMockEvent({
        vitals: {
          heartRate: 75,
        },
        deviceId: 'device-456',
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.vitals.source).toBe('device');
      expect(mockWriteVitalSigns).toHaveBeenCalledWith(
        'user-123',
        expect.any(Object),
        expect.any(Date),
        'device'
      );
    });
  });

  describe('Validation errors', () => {
    it('should reject heart rate below minimum', async () => {
      const event = createMockEvent({
        vitals: {
          heartRate: 30,
        },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Heart rate must be between');
      expect(mockWriteVitalSigns).not.toHaveBeenCalled();
    });

    it('should reject heart rate above maximum', async () => {
      const event = createMockEvent({
        vitals: {
          heartRate: 250,
        },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      expect(mockWriteVitalSigns).not.toHaveBeenCalled();
    });

    it('should reject invalid blood pressure', async () => {
      const event = createMockEvent({
        vitals: {
          bloodPressure: { systolic: 250, diastolic: 150 },
        },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      expect(mockWriteVitalSigns).not.toHaveBeenCalled();
    });

    it('should reject invalid temperature', async () => {
      const event = createMockEvent({
        vitals: {
          temperature: 110,
        },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      expect(mockWriteVitalSigns).not.toHaveBeenCalled();
    });

    it('should reject invalid oxygen saturation', async () => {
      const event = createMockEvent({
        vitals: {
          oxygenSaturation: 50,
        },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      expect(mockWriteVitalSigns).not.toHaveBeenCalled();
    });
  });

  describe('Anomaly detection', () => {
    it('should detect anomalies in vital signs', async () => {
      const event = createMockEvent({
        vitals: {
          heartRate: 150, // Above normal range
          bloodPressure: { systolic: 180, diastolic: 100 }, // High blood pressure
        },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.anomalies).toBeDefined();
      expect(body.anomalies.length).toBeGreaterThan(0);
      expect(body.alertTriggered).toBe(true);
    });

    it('should not trigger alert for normal vitals', async () => {
      const event = createMockEvent({
        vitals: {
          heartRate: 75,
          bloodPressure: { systolic: 120, diastolic: 80 },
          temperature: 98.6,
        },
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.anomalies).toBeUndefined();
      expect(body.alertTriggered).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should reject requests without user context', async () => {
      const event = {
        body: JSON.stringify({ vitals: { heartRate: 75 } }),
        requestContext: {} as any,
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(401);
      expect(mockWriteVitalSigns).not.toHaveBeenCalled();
    });

    it('should reject secondary users from recording vitals', async () => {
      const event = {
        body: JSON.stringify({ vitals: { heartRate: 75 } }),
        requestContext: {
          authorizer: {
            principalId: 'secondary-user-123',
            userType: 'secondary',
          },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(403);
      expect(mockWriteVitalSigns).not.toHaveBeenCalled();
    });
  });

  describe('Input validation', () => {
    it('should reject missing request body', async () => {
      const event = {
        requestContext: {
          authorizer: {
            principalId: 'user-123',
            userType: 'primary',
          },
        } as any,
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      expect(mockWriteVitalSigns).not.toHaveBeenCalled();
    });

    it('should reject missing vitals data', async () => {
      const event = createMockEvent({});

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      expect(mockWriteVitalSigns).not.toHaveBeenCalled();
    });
  });

  describe('Audit logging', () => {
    it('should log successful data access', async () => {
      const event = createMockEvent({
        vitals: {
          heartRate: 75,
        },
      });

      await handler(event as APIGatewayProxyEvent);

      expect(mockLogDataAccess).toHaveBeenCalledWith(
        'user-123',
        'primary',
        'user-123',
        'vitals',
        'write',
        true,
        ['vitals'],
        expect.objectContaining({
          source: 'manual',
          anomaliesDetected: false,
          alertTriggered: false,
        })
      );
    });
  });
});
