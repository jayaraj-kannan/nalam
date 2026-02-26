// Integration test for Health Monitoring and Alert Systems
// Checkpoint Task 7: Verify health monitoring and alerts are functional

import { handler as recordVitalSignsHandler } from '../record-vital-signs';
import { handler as createAlertHandler } from '../create-alert';
import { handler as getAlertsHandler } from '../get-alerts';
import { APIGatewayProxyEvent } from 'aws-lambda';
import * as timestreamClient from '../../shared/timestream-client';
import * as alertsDataAccess from '../../shared/data-access/alerts';
import * as usersDataAccess from '../../shared/data-access/users';
import * as auditLogger from '../../shared/audit-logger';

// Mock dependencies
jest.mock('../../shared/timestream-client');
jest.mock('../../shared/data-access/alerts');
jest.mock('../../shared/data-access/users');
jest.mock('../../shared/audit-logger');

describe('Health Monitoring and Alert Systems Integration', () => {
  const mockWriteVitalSigns = timestreamClient.writeVitalSigns as jest.MockedFunction<typeof timestreamClient.writeVitalSigns>;
  const mockCreateAlert = alertsDataAccess.createAlert as jest.MockedFunction<typeof alertsDataAccess.createAlert>;
  const mockGetAlertsByUser = alertsDataAccess.getAlertsByUser as jest.MockedFunction<typeof alertsDataAccess.getAlertsByUser>;
  const mockGetUser = usersDataAccess.getUser as jest.MockedFunction<typeof usersDataAccess.getUser>;
  const mockLogAuditEvent = auditLogger.logAuditEvent as jest.MockedFunction<typeof auditLogger.logAuditEvent>;
  const mockLogDataAccess = auditLogger.logDataAccess as jest.MockedFunction<typeof auditLogger.logDataAccess>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteVitalSigns.mockResolvedValue(undefined);
    mockLogAuditEvent.mockResolvedValue(undefined);
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

  describe('Health Monitoring Flow', () => {
    it('should record vital signs and detect anomalies', async () => {
      const event = {
        body: JSON.stringify({
          vitals: {
            heartRate: 150, // Abnormal - should trigger alert
            bloodPressure: { systolic: 180, diastolic: 100 }, // High BP
            temperature: 98.6,
          },
        }),
        requestContext: {
          authorizer: {
            principalId: 'user-123',
            userType: 'primary',
          },
        } as any,
      } as APIGatewayProxyEvent;

      const result = await recordVitalSignsHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // Verify anomalies were detected
      expect(body.anomalies).toBeDefined();
      expect(body.anomalies.length).toBeGreaterThan(0);
      expect(body.alertTriggered).toBe(true);
      
      // Verify vital signs were stored
      expect(mockWriteVitalSigns).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          heartRate: 150,
          systolicBP: 180,
          diastolicBP: 100,
        }),
        expect.any(Date),
        'manual'
      );
    });

    it('should record normal vital signs without triggering alerts', async () => {
      const event = {
        body: JSON.stringify({
          vitals: {
            heartRate: 75,
            bloodPressure: { systolic: 120, diastolic: 80 },
            temperature: 98.6,
            oxygenSaturation: 98,
          },
        }),
        requestContext: {
          authorizer: {
            principalId: 'user-123',
            userType: 'primary',
          },
        } as any,
      } as APIGatewayProxyEvent;

      const result = await recordVitalSignsHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // Verify no anomalies detected
      expect(body.anomalies).toBeUndefined();
      expect(body.alertTriggered).toBe(false);
    });
  });

  describe('Alert Management Flow', () => {
    it('should create an alert successfully', async () => {
      mockCreateAlert.mockResolvedValue('alert-123');

      const event = {
        body: JSON.stringify({
          userId: 'user-123',
          type: 'vital_signs',
          severity: 'high',
          message: 'Heart rate is critically high',
        }),
      } as APIGatewayProxyEvent;

      const result = await createAlertHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.alertId).toBe('alert-123');
      expect(body.message).toBe('Alert created successfully');
      
      // Verify alert was created with correct data
      expect(mockCreateAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: 'vital_signs',
          severity: 'high',
          message: 'Heart rate is critically high',
          acknowledged: false,
          escalated: false,
        })
      );
    });

    it('should retrieve alerts for a user', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          userId: 'user-123',
          type: 'vital_signs' as const,
          severity: 'high' as const,
          message: 'High heart rate detected',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          acknowledged: false,
          escalated: false,
        },
        {
          id: 'alert-2',
          userId: 'user-123',
          type: 'medication' as const,
          severity: 'medium' as const,
          message: 'Medication reminder missed',
          timestamp: new Date('2024-01-15T09:00:00Z'),
          acknowledged: true,
          escalated: false,
        },
      ];

      mockGetAlertsByUser.mockResolvedValue(mockAlerts);

      const event = {
        pathParameters: {
          userId: 'user-123',
        },
        queryStringParameters: {
          limit: '10',
        },
        requestContext: {
          authorizer: {
            principalId: 'user-123',
            userType: 'primary',
          },
        } as any,
      } as any;

      const result = await getAlertsHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.alerts).toHaveLength(2);
      expect(body.alerts[0].id).toBe('alert-1');
      expect(body.alerts[0].acknowledged).toBe(false);
      expect(body.alerts[1].acknowledged).toBe(true);
    });

    it('should validate alert severity', async () => {
      const event = {
        body: JSON.stringify({
          userId: 'user-123',
          type: 'vital_signs',
          severity: 'invalid-severity',
          message: 'Test alert',
        }),
      } as APIGatewayProxyEvent;

      const result = await createAlertHandler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid severity');
    });

    it('should validate alert type', async () => {
      const event = {
        body: JSON.stringify({
          userId: 'user-123',
          type: 'invalid-type',
          severity: 'high',
          message: 'Test alert',
        }),
      } as APIGatewayProxyEvent;

      const result = await createAlertHandler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid alert type');
    });
  });

  describe('End-to-End Health Monitoring and Alert Flow', () => {
    it('should record abnormal vitals and create alert', async () => {
      mockCreateAlert.mockResolvedValue('alert-456');

      // Step 1: Record abnormal vital signs
      const recordEvent = {
        body: JSON.stringify({
          vitals: {
            heartRate: 180, // Critical
            oxygenSaturation: 88, // Low
          },
        }),
        requestContext: {
          authorizer: {
            principalId: 'user-123',
            userType: 'primary',
          },
        } as any,
      } as APIGatewayProxyEvent;

      const recordResult = await recordVitalSignsHandler(recordEvent);
      expect(recordResult.statusCode).toBe(200);
      
      const recordBody = JSON.parse(recordResult.body);
      expect(recordBody.alertTriggered).toBe(true);
      expect(recordBody.anomalies.length).toBeGreaterThan(0);

      // Step 2: Create alert based on anomalies
      const createAlertEvent = {
        body: JSON.stringify({
          userId: 'user-123',
          type: 'vital_signs',
          severity: 'critical',
          message: 'Critical vital signs detected: High heart rate and low oxygen saturation',
          relatedData: {
            anomalies: recordBody.anomalies,
          },
        }),
      } as APIGatewayProxyEvent;

      const alertResult = await createAlertHandler(createAlertEvent);
      expect(alertResult.statusCode).toBe(200);
      
      const alertBody = JSON.parse(alertResult.body);
      expect(alertBody.alertId).toBe('alert-456');

      // Verify audit logging occurred
      expect(mockLogDataAccess).toHaveBeenCalled();
      expect(mockLogAuditEvent).toHaveBeenCalled();
    });
  });
});
