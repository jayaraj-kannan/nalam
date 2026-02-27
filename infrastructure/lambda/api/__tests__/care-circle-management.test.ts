// Care Circle Management Service Tests
// Requirements: 4.1, 4.3, 4.4, 4.5, 8.5, 9.2

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-ses');
jest.mock('@aws-sdk/client-sns');

// Mock data access layers
jest.mock('../../shared/data-access/care-circle');
jest.mock('../../shared/data-access/users');
jest.mock('../../shared/data-access/medications');
jest.mock('../../shared/data-access/appointments');
jest.mock('../../shared/data-access/alerts');
jest.mock('../../shared/audit-logger');
jest.mock('../../shared/notification-service');
jest.mock('../../shared/timestream-client');
jest.mock('../../shared/dynamodb-client', () => ({
  TABLES: {
    USERS: 'test-users-table',
    CARE_CIRCLE: 'test-care-circle-table',
    CARE_CIRCLE_INVITATIONS: 'test-invitations-table',
    CARE_CIRCLE_MESSAGES: 'test-messages-table',
  },
  putItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  queryItems: jest.fn().mockResolvedValue([]),
  updateItem: jest.fn().mockResolvedValue(undefined),
  deleteItem: jest.fn().mockResolvedValue(undefined),
}));

import { handler as getCareCircle } from '../get-care-circle';
import { handler as addMember } from '../add-care-circle-member';
import { handler as removeMember } from '../remove-care-circle-member';
import { handler as updatePermissions } from '../update-care-circle-permissions';
import { handler as inviteMember } from '../invite-care-circle-member';
import { handler as acceptInvitation } from '../accept-care-circle-invitation';
import { handler as rejectInvitation } from '../reject-care-circle-invitation';
import { handler as getDashboard } from '../get-care-circle-dashboard';
import { handler as sendMessage } from '../send-care-circle-message';
import { handler as getMessages } from '../get-care-circle-messages';
import { handler as markRead } from '../mark-message-read';
import { handler as getAlertPreferences } from '../get-alert-preferences';
import { handler as updateAlertPreferences } from '../update-alert-preferences';

import * as careCircleDA from '../../shared/data-access/care-circle';
import * as usersDA from '../../shared/data-access/users';
import * as medicationsDA from '../../shared/data-access/medications';
import * as appointmentsDA from '../../shared/data-access/appointments';
import * as alertsDA from '../../shared/data-access/alerts';
import * as auditLogger from '../../shared/audit-logger';
import * as notificationService from '../../shared/notification-service';
import * as timestreamClient from '../../shared/timestream-client';
import * as dynamodbClient from '../../shared/dynamodb-client';
import { APIGatewayProxyEvent } from 'aws-lambda';

describe('Care Circle Management Service', () => {
  const mockPrimaryUserId = 'primary-user-123';
  const mockSecondaryUserId = 'secondary-user-456';
  const mockRequestingUserId = 'requesting-user-789';

  const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789',
      apiId: 'api-id',
      authorizer: {
        claims: {
          sub: mockRequestingUserId,
          email: 'test@example.com',
        },
      },
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        user: null,
        userArn: null,
      },
      path: '/',
      stage: 'test',
      requestId: 'request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'resource-id',
      resourcePath: '/',
    },
    resource: '/',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Get Care Circle', () => {
    test('should return care circle members for primary user', async () => {
      const mockMembers = [
        {
          secondaryUserId: mockSecondaryUserId,
          relationship: 'child',
          permissions: {
            canViewVitals: true,
            canViewMedications: true,
            canViewAppointments: true,
            canViewHealthRecords: true,
            canReceiveAlerts: true,
            canSendMessages: true,
            canManageDevices: false,
          },
          joinedAt: '2024-01-01T00:00:00Z',
          lastActive: '2024-01-15T00:00:00Z',
        },
      ];

      const mockUser = {
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          dateOfBirth: '1990-01-01',
        },
      };

      (careCircleDA.getCareCircleMembers as jest.Mock).mockResolvedValue(mockMembers);
      (usersDA.getUser as jest.Mock).mockResolvedValue(mockUser);

      const event = createMockEvent({
        pathParameters: { userId: mockPrimaryUserId },
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: mockPrimaryUserId,
              email: 'primary@example.com',
            },
          },
        },
      });

      const result = await getCareCircle(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.primaryUserId).toBe(mockPrimaryUserId);
      expect(body.members).toHaveLength(1);
      expect(body.members[0].userId).toBe(mockSecondaryUserId);
    });

    test('should return 403 if requesting user is not authorized', async () => {
      (careCircleDA.getCareCircleMembers as jest.Mock).mockResolvedValue([]);

      const event = createMockEvent({
        pathParameters: { userId: mockPrimaryUserId },
      });

      const result = await getCareCircle(event);

      expect(result.statusCode).toBe(403);
    });
  });

  describe('Add Care Circle Member', () => {
    test('should add a new member to care circle', async () => {
      const mockUser = {
        id: mockSecondaryUserId,
        profile: { firstName: 'Jane', lastName: 'Doe' },
      };

      (usersDA.getUser as jest.Mock).mockResolvedValue(mockUser);
      (careCircleDA.addCareCircleMember as jest.Mock).mockResolvedValue(undefined);
      (auditLogger.logAuditEvent as jest.Mock).mockResolvedValue(undefined);

      const event = createMockEvent({
        httpMethod: 'POST',
        pathParameters: { userId: mockPrimaryUserId },
        body: JSON.stringify({
          secondaryUserId: mockSecondaryUserId,
          relationship: 'child',
          permissions: {
            canViewVitals: true,
            canViewMedications: true,
            canViewAppointments: true,
            canViewHealthRecords: true,
            canReceiveAlerts: true,
            canSendMessages: true,
            canManageDevices: false,
          },
        }),
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: mockPrimaryUserId,
              email: 'primary@example.com',
            },
          },
        },
      });

      const result = await addMember(event);

      expect(result.statusCode).toBe(200);
      expect(careCircleDA.addCareCircleMember).toHaveBeenCalledWith(
        mockPrimaryUserId,
        mockSecondaryUserId,
        'child',
        expect.any(Object)
      );
    });

    test('should return 403 if non-primary user tries to add member', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        pathParameters: { userId: mockPrimaryUserId },
        body: JSON.stringify({
          secondaryUserId: mockSecondaryUserId,
          relationship: 'child',
          permissions: {},
        }),
      });

      const result = await addMember(event);

      expect(result.statusCode).toBe(403);
    });
  });

  describe('Care Circle Invitations', () => {
    test('should send invitation email', async () => {
      (auditLogger.logAuditEvent as jest.Mock).mockResolvedValue(undefined);

      const event = createMockEvent({
        httpMethod: 'POST',
        pathParameters: { userId: mockPrimaryUserId },
        body: JSON.stringify({
          email: 'invitee@example.com',
          relationship: 'child',
          permissions: {
            canViewVitals: true,
            canReceiveAlerts: true,
          },
          message: 'Please join my care circle',
        }),
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: mockPrimaryUserId,
              email: 'primary@example.com',
              name: 'Primary User',
            },
          },
        },
      });

      const result = await inviteMember(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.invitationId).toBeDefined();
      expect(body.email).toBe('invitee@example.com');
    });

    test('should reject invalid email format', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        pathParameters: { userId: mockPrimaryUserId },
        body: JSON.stringify({
          email: 'invalid-email',
          relationship: 'child',
          permissions: {},
        }),
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: mockPrimaryUserId,
              email: 'primary@example.com',
            },
          },
        },
      });

      const result = await inviteMember(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('Care Circle Dashboard', () => {
    test('should return comprehensive dashboard data', async () => {
      const mockUser = {
        profile: { firstName: 'John', lastName: 'Doe' },
        lastActive: new Date(),
      };

      (careCircleDA.checkPermission as jest.Mock).mockResolvedValue(true);
      (usersDA.getUser as jest.Mock).mockResolvedValue(mockUser);
      (medicationsDA.getMedicationsByUser as jest.Mock).mockResolvedValue([]);
      (appointmentsDA.getAppointmentsByUser as jest.Mock).mockResolvedValue([]);
      (alertsDA.getAlertsByUser as jest.Mock).mockResolvedValue([]);
      (dynamodbClient.queryItems as jest.Mock).mockResolvedValue([]);

      const event = createMockEvent({
        pathParameters: { userId: mockPrimaryUserId },
      });

      const result = await getDashboard(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.dashboard).toBeDefined();
      expect(body.dashboard.primaryUser).toBeDefined();
      expect(body.dashboard.healthStatus).toBeDefined();
      expect(body.dashboard.medications).toBeDefined();
      expect(body.dashboard.appointments).toBeDefined();
      expect(body.dashboard.alerts).toBeDefined();
    });
  });

  describe('Family Communication', () => {
    test('should send message between care circle members', async () => {
      const mockSender = {
        profile: { firstName: 'Jane', lastName: 'Doe' },
      };
      const mockRecipient = {
        profile: { firstName: 'John', lastName: 'Doe' },
      };

      (careCircleDA.checkPermission as jest.Mock).mockResolvedValue(true);
      (usersDA.getUser as jest.Mock)
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockRecipient);
      (notificationService.sendNotification as jest.Mock).mockResolvedValue([]);

      const event = createMockEvent({
        httpMethod: 'POST',
        pathParameters: { userId: mockPrimaryUserId },
        body: JSON.stringify({
          recipientId: mockSecondaryUserId,
          subject: 'Test Message',
          content: 'This is a test message',
        }),
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: mockPrimaryUserId,
              email: 'primary@example.com',
            },
          },
        },
      });

      const result = await sendMessage(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.messageId).toBeDefined();
    });

    test('should reject message exceeding length limit', async () => {
      const longContent = 'a'.repeat(5001);

      const event = createMockEvent({
        httpMethod: 'POST',
        pathParameters: { userId: mockPrimaryUserId },
        body: JSON.stringify({
          recipientId: mockSecondaryUserId,
          content: longContent,
        }),
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: mockPrimaryUserId,
              email: 'primary@example.com',
            },
          },
        },
      });

      const result = await sendMessage(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('Alert Preferences', () => {
    test('should update alert preferences', async () => {
      const mockUser = {
        alertPreferences: {
          channels: ['push', 'email'],
          alertTypes: {},
        },
      };

      (usersDA.getUser as jest.Mock).mockResolvedValue(mockUser);
      (auditLogger.logAuditEvent as jest.Mock).mockResolvedValue(undefined);

      const event = createMockEvent({
        httpMethod: 'PUT',
        pathParameters: { userId: mockRequestingUserId },
        body: JSON.stringify({
          channels: ['push', 'sms', 'email'],
          alertTypes: {
            vital_signs: {
              enabled: true,
              urgencyLevels: ['high', 'critical'],
            },
            medication: {
              enabled: true,
              urgencyLevels: ['medium', 'high', 'critical'],
            },
          },
        }),
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: mockRequestingUserId,
              email: 'user@example.com',
            },
          },
        },
      });

      const result = await updateAlertPreferences(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.preferences).toBeDefined();
      expect(body.preferences.channels).toContain('sms');
    });

    test('should reject invalid notification channels', async () => {
      const event = createMockEvent({
        httpMethod: 'PUT',
        pathParameters: { userId: mockRequestingUserId },
        body: JSON.stringify({
          channels: ['invalid-channel'],
        }),
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: mockRequestingUserId,
              email: 'user@example.com',
            },
          },
        },
      });

      const result = await updateAlertPreferences(event);

      expect(result.statusCode).toBe(400);
    });

    test('should validate quiet hours format', async () => {
      const mockUser = { alertPreferences: {} };
      (usersDA.getUser as jest.Mock).mockResolvedValue(mockUser);

      const event = createMockEvent({
        httpMethod: 'PUT',
        pathParameters: { userId: mockRequestingUserId },
        body: JSON.stringify({
          quietHours: {
            start: '22:00',
            end: '07:00',
          },
        }),
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: mockRequestingUserId,
              email: 'user@example.com',
            },
          },
        },
      });

      const result = await updateAlertPreferences(event);

      expect(result.statusCode).toBe(200);
    });
  });

  describe('Permission Management', () => {
    test('should update care circle member permissions', async () => {
      (careCircleDA.updateCareCirclePermissions as jest.Mock).mockResolvedValue(undefined);
      (auditLogger.logAuditEvent as jest.Mock).mockResolvedValue(undefined);

      const event = createMockEvent({
        httpMethod: 'PUT',
        pathParameters: {
          userId: mockPrimaryUserId,
          memberId: mockSecondaryUserId,
        },
        body: JSON.stringify({
          permissions: {
            canViewVitals: true,
            canViewMedications: false,
            canViewAppointments: true,
            canViewHealthRecords: false,
            canReceiveAlerts: true,
            canSendMessages: true,
            canManageDevices: false,
          },
        }),
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: mockPrimaryUserId,
              email: 'primary@example.com',
            },
          },
        },
      });

      const result = await updatePermissions(event);

      expect(result.statusCode).toBe(200);
      expect(careCircleDA.updateCareCirclePermissions).toHaveBeenCalled();
    });

    test('should prevent non-primary user from updating permissions', async () => {
      const event = createMockEvent({
        httpMethod: 'PUT',
        pathParameters: {
          userId: mockPrimaryUserId,
          memberId: mockSecondaryUserId,
        },
        body: JSON.stringify({
          permissions: {},
        }),
      });

      const result = await updatePermissions(event);

      expect(result.statusCode).toBe(403);
    });
  });
});
