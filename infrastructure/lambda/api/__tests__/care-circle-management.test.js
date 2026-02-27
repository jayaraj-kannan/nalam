"use strict";
// Care Circle Management Service Tests
// Requirements: 4.1, 4.3, 4.4, 4.5, 8.5, 9.2
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock AWS SDK clients
globals_1.jest.mock('@aws-sdk/client-dynamodb');
globals_1.jest.mock('@aws-sdk/lib-dynamodb');
globals_1.jest.mock('@aws-sdk/client-ses');
globals_1.jest.mock('@aws-sdk/client-sns');
// Mock data access layers
globals_1.jest.mock('../../shared/data-access/care-circle');
globals_1.jest.mock('../../shared/data-access/users');
globals_1.jest.mock('../../shared/data-access/medications');
globals_1.jest.mock('../../shared/data-access/appointments');
globals_1.jest.mock('../../shared/data-access/alerts');
globals_1.jest.mock('../../shared/audit-logger');
globals_1.jest.mock('../../shared/notification-service');
globals_1.jest.mock('../../shared/timestream-client');
globals_1.jest.mock('../../shared/dynamodb-client', () => ({
    TABLES: {
        USERS: 'test-users-table',
        CARE_CIRCLE: 'test-care-circle-table',
        CARE_CIRCLE_INVITATIONS: 'test-invitations-table',
        CARE_CIRCLE_MESSAGES: 'test-messages-table',
    },
    putItem: globals_1.jest.fn().mockResolvedValue(undefined),
    getItem: globals_1.jest.fn().mockResolvedValue(null),
    queryItems: globals_1.jest.fn().mockResolvedValue([]),
    updateItem: globals_1.jest.fn().mockResolvedValue(undefined),
    deleteItem: globals_1.jest.fn().mockResolvedValue(undefined),
}));
const get_care_circle_1 = require("../get-care-circle");
const add_care_circle_member_1 = require("../add-care-circle-member");
const update_care_circle_permissions_1 = require("../update-care-circle-permissions");
const invite_care_circle_member_1 = require("../invite-care-circle-member");
const get_care_circle_dashboard_1 = require("../get-care-circle-dashboard");
const send_care_circle_message_1 = require("../send-care-circle-message");
const update_alert_preferences_1 = require("../update-alert-preferences");
const careCircleDA = __importStar(require("../../shared/data-access/care-circle"));
const usersDA = __importStar(require("../../shared/data-access/users"));
const medicationsDA = __importStar(require("../../shared/data-access/medications"));
const appointmentsDA = __importStar(require("../../shared/data-access/appointments"));
const alertsDA = __importStar(require("../../shared/data-access/alerts"));
const auditLogger = __importStar(require("../../shared/audit-logger"));
const notificationService = __importStar(require("../../shared/notification-service"));
const dynamodbClient = __importStar(require("../../shared/dynamodb-client"));
(0, globals_1.describe)('Care Circle Management Service', () => {
    const mockPrimaryUserId = 'primary-user-123';
    const mockSecondaryUserId = 'secondary-user-456';
    const mockRequestingUserId = 'requesting-user-789';
    const createMockEvent = (overrides = {}) => ({
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
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Get Care Circle', () => {
        (0, globals_1.test)('should return care circle members for primary user', async () => {
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
            careCircleDA.getCareCircleMembers.mockResolvedValue(mockMembers);
            usersDA.getUser.mockResolvedValue(mockUser);
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
            const result = await (0, get_care_circle_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            (0, globals_1.expect)(body.primaryUserId).toBe(mockPrimaryUserId);
            (0, globals_1.expect)(body.members).toHaveLength(1);
            (0, globals_1.expect)(body.members[0].userId).toBe(mockSecondaryUserId);
        });
        (0, globals_1.test)('should return 403 if requesting user is not authorized', async () => {
            careCircleDA.getCareCircleMembers.mockResolvedValue([]);
            const event = createMockEvent({
                pathParameters: { userId: mockPrimaryUserId },
            });
            const result = await (0, get_care_circle_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(403);
        });
    });
    (0, globals_1.describe)('Add Care Circle Member', () => {
        (0, globals_1.test)('should add a new member to care circle', async () => {
            const mockUser = {
                id: mockSecondaryUserId,
                profile: { firstName: 'Jane', lastName: 'Doe' },
            };
            usersDA.getUser.mockResolvedValue(mockUser);
            careCircleDA.addCareCircleMember.mockResolvedValue(undefined);
            auditLogger.logAuditEvent.mockResolvedValue(undefined);
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
            const result = await (0, add_care_circle_member_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(200);
            (0, globals_1.expect)(careCircleDA.addCareCircleMember).toHaveBeenCalledWith(mockPrimaryUserId, mockSecondaryUserId, 'child', globals_1.expect.any(Object));
        });
        (0, globals_1.test)('should return 403 if non-primary user tries to add member', async () => {
            const event = createMockEvent({
                httpMethod: 'POST',
                pathParameters: { userId: mockPrimaryUserId },
                body: JSON.stringify({
                    secondaryUserId: mockSecondaryUserId,
                    relationship: 'child',
                    permissions: {},
                }),
            });
            const result = await (0, add_care_circle_member_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(403);
        });
    });
    (0, globals_1.describe)('Care Circle Invitations', () => {
        (0, globals_1.test)('should send invitation email', async () => {
            auditLogger.logAuditEvent.mockResolvedValue(undefined);
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
            const result = await (0, invite_care_circle_member_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            (0, globals_1.expect)(body.invitationId).toBeDefined();
            (0, globals_1.expect)(body.email).toBe('invitee@example.com');
        });
        (0, globals_1.test)('should reject invalid email format', async () => {
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
            const result = await (0, invite_care_circle_member_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(400);
        });
    });
    (0, globals_1.describe)('Care Circle Dashboard', () => {
        (0, globals_1.test)('should return comprehensive dashboard data', async () => {
            const mockUser = {
                profile: { firstName: 'John', lastName: 'Doe' },
                lastActive: new Date(),
            };
            careCircleDA.checkPermission.mockResolvedValue(true);
            usersDA.getUser.mockResolvedValue(mockUser);
            medicationsDA.getMedicationsByUser.mockResolvedValue([]);
            appointmentsDA.getAppointmentsByUser.mockResolvedValue([]);
            alertsDA.getAlertsByUser.mockResolvedValue([]);
            dynamodbClient.queryItems.mockResolvedValue([]);
            const event = createMockEvent({
                pathParameters: { userId: mockPrimaryUserId },
            });
            const result = await (0, get_care_circle_dashboard_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            (0, globals_1.expect)(body.dashboard).toBeDefined();
            (0, globals_1.expect)(body.dashboard.primaryUser).toBeDefined();
            (0, globals_1.expect)(body.dashboard.healthStatus).toBeDefined();
            (0, globals_1.expect)(body.dashboard.medications).toBeDefined();
            (0, globals_1.expect)(body.dashboard.appointments).toBeDefined();
            (0, globals_1.expect)(body.dashboard.alerts).toBeDefined();
        });
    });
    (0, globals_1.describe)('Family Communication', () => {
        (0, globals_1.test)('should send message between care circle members', async () => {
            const mockSender = {
                profile: { firstName: 'Jane', lastName: 'Doe' },
            };
            const mockRecipient = {
                profile: { firstName: 'John', lastName: 'Doe' },
            };
            careCircleDA.checkPermission.mockResolvedValue(true);
            usersDA.getUser
                .mockResolvedValueOnce(mockSender)
                .mockResolvedValueOnce(mockRecipient);
            notificationService.sendNotification.mockResolvedValue([]);
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
            const result = await (0, send_care_circle_message_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            (0, globals_1.expect)(body.messageId).toBeDefined();
        });
        (0, globals_1.test)('should reject message exceeding length limit', async () => {
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
            const result = await (0, send_care_circle_message_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(400);
        });
    });
    (0, globals_1.describe)('Alert Preferences', () => {
        (0, globals_1.test)('should update alert preferences', async () => {
            const mockUser = {
                alertPreferences: {
                    channels: ['push', 'email'],
                    alertTypes: {},
                },
            };
            usersDA.getUser.mockResolvedValue(mockUser);
            auditLogger.logAuditEvent.mockResolvedValue(undefined);
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
            const result = await (0, update_alert_preferences_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            (0, globals_1.expect)(body.preferences).toBeDefined();
            (0, globals_1.expect)(body.preferences.channels).toContain('sms');
        });
        (0, globals_1.test)('should reject invalid notification channels', async () => {
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
            const result = await (0, update_alert_preferences_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(400);
        });
        (0, globals_1.test)('should validate quiet hours format', async () => {
            const mockUser = { alertPreferences: {} };
            usersDA.getUser.mockResolvedValue(mockUser);
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
            const result = await (0, update_alert_preferences_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(200);
        });
    });
    (0, globals_1.describe)('Permission Management', () => {
        (0, globals_1.test)('should update care circle member permissions', async () => {
            careCircleDA.updateCareCirclePermissions.mockResolvedValue(undefined);
            auditLogger.logAuditEvent.mockResolvedValue(undefined);
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
            const result = await (0, update_care_circle_permissions_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(200);
            (0, globals_1.expect)(careCircleDA.updateCareCirclePermissions).toHaveBeenCalled();
        });
        (0, globals_1.test)('should prevent non-primary user from updating permissions', async () => {
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
            const result = await (0, update_care_circle_permissions_1.handler)(event);
            (0, globals_1.expect)(result.statusCode).toBe(403);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZS1jaXJjbGUtbWFuYWdlbWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2FyZS1jaXJjbGUtbWFuYWdlbWVudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx1Q0FBdUM7QUFDdkMsNkNBQTZDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUU3QywyQ0FBeUU7QUFFekUsdUJBQXVCO0FBQ3ZCLGNBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUN0QyxjQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDbkMsY0FBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ2pDLGNBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUVqQywwQkFBMEI7QUFDMUIsY0FBSSxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0FBQ2xELGNBQUksQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUM1QyxjQUFJLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLENBQUM7QUFDbEQsY0FBSSxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0FBQ25ELGNBQUksQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQUM3QyxjQUFJLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFDdkMsY0FBSSxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBQy9DLGNBQUksQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUM1QyxjQUFJLENBQUMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDL0MsTUFBTSxFQUFFO1FBQ04sS0FBSyxFQUFFLGtCQUFrQjtRQUN6QixXQUFXLEVBQUUsd0JBQXdCO1FBQ3JDLHVCQUF1QixFQUFFLHdCQUF3QjtRQUNqRCxvQkFBb0IsRUFBRSxxQkFBcUI7S0FDNUM7SUFDRCxPQUFPLEVBQUUsY0FBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQztJQUMvQyxPQUFPLEVBQUUsY0FBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQztJQUMxQyxVQUFVLEVBQUUsY0FBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztJQUMzQyxVQUFVLEVBQUUsY0FBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQztJQUNsRCxVQUFVLEVBQUUsY0FBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQztDQUNuRCxDQUFDLENBQUMsQ0FBQztBQUVKLHdEQUE4RDtBQUM5RCxzRUFBaUU7QUFFakUsc0ZBQWlGO0FBQ2pGLDRFQUF1RTtBQUd2RSw0RUFBdUU7QUFDdkUsMEVBQXFFO0FBSXJFLDBFQUFnRjtBQUVoRixtRkFBcUU7QUFDckUsd0VBQTBEO0FBQzFELG9GQUFzRTtBQUN0RSxzRkFBd0U7QUFDeEUsMEVBQTREO0FBQzVELHVFQUF5RDtBQUN6RCx1RkFBeUU7QUFFekUsNkVBQStEO0FBRy9ELElBQUEsa0JBQVEsRUFBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7SUFDOUMsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQztJQUM3QyxNQUFNLG1CQUFtQixHQUFHLG9CQUFvQixDQUFDO0lBQ2pELE1BQU0sb0JBQW9CLEdBQUcscUJBQXFCLENBQUM7SUFFbkQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxZQUEyQyxFQUFFLEVBQXdCLEVBQUUsQ0FBQyxDQUFDO1FBQ2hHLElBQUksRUFBRSxJQUFJO1FBQ1YsT0FBTyxFQUFFLEVBQUU7UUFDWCxpQkFBaUIsRUFBRSxFQUFFO1FBQ3JCLFVBQVUsRUFBRSxLQUFLO1FBQ2pCLGVBQWUsRUFBRSxLQUFLO1FBQ3RCLElBQUksRUFBRSxHQUFHO1FBQ1QsY0FBYyxFQUFFLElBQUk7UUFDcEIscUJBQXFCLEVBQUUsSUFBSTtRQUMzQiwrQkFBK0IsRUFBRSxJQUFJO1FBQ3JDLGNBQWMsRUFBRSxJQUFJO1FBQ3BCLGNBQWMsRUFBRTtZQUNkLFNBQVMsRUFBRSxXQUFXO1lBQ3RCLEtBQUssRUFBRSxRQUFRO1lBQ2YsVUFBVSxFQUFFO2dCQUNWLE1BQU0sRUFBRTtvQkFDTixHQUFHLEVBQUUsb0JBQW9CO29CQUN6QixLQUFLLEVBQUUsa0JBQWtCO2lCQUMxQjthQUNGO1lBQ0QsUUFBUSxFQUFFLFVBQVU7WUFDcEIsVUFBVSxFQUFFLEtBQUs7WUFDakIsUUFBUSxFQUFFO2dCQUNSLFFBQVEsRUFBRSxXQUFXO2dCQUNyQixTQUFTLEVBQUUsWUFBWTtnQkFDdkIsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsTUFBTSxFQUFFLElBQUk7Z0JBQ1osUUFBUSxFQUFFLElBQUk7Z0JBQ2QsTUFBTSxFQUFFLElBQUk7Z0JBQ1osVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLDZCQUE2QixFQUFFLElBQUk7Z0JBQ25DLHlCQUF5QixFQUFFLElBQUk7Z0JBQy9CLGlCQUFpQixFQUFFLElBQUk7Z0JBQ3ZCLHFCQUFxQixFQUFFLElBQUk7Z0JBQzNCLGNBQWMsRUFBRSxJQUFJO2dCQUNwQixJQUFJLEVBQUUsSUFBSTtnQkFDVixPQUFPLEVBQUUsSUFBSTthQUNkO1lBQ0QsSUFBSSxFQUFFLEdBQUc7WUFDVCxLQUFLLEVBQUUsTUFBTTtZQUNiLFNBQVMsRUFBRSxZQUFZO1lBQ3ZCLGdCQUFnQixFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDNUIsVUFBVSxFQUFFLGFBQWE7WUFDekIsWUFBWSxFQUFFLEdBQUc7U0FDbEI7UUFDRCxRQUFRLEVBQUUsR0FBRztRQUNiLEdBQUcsU0FBUztLQUNiLENBQUMsQ0FBQztJQUVILElBQUEsb0JBQVUsRUFBQyxHQUFHLEVBQUU7UUFDZCxjQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFBLGtCQUFRLEVBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQy9CLElBQUEsY0FBSSxFQUFDLG9EQUFvRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3BFLE1BQU0sV0FBVyxHQUFHO2dCQUNsQjtvQkFDRSxlQUFlLEVBQUUsbUJBQW1CO29CQUNwQyxZQUFZLEVBQUUsT0FBTztvQkFDckIsV0FBVyxFQUFFO3dCQUNYLGFBQWEsRUFBRSxJQUFJO3dCQUNuQixrQkFBa0IsRUFBRSxJQUFJO3dCQUN4QixtQkFBbUIsRUFBRSxJQUFJO3dCQUN6QixvQkFBb0IsRUFBRSxJQUFJO3dCQUMxQixnQkFBZ0IsRUFBRSxJQUFJO3dCQUN0QixlQUFlLEVBQUUsSUFBSTt3QkFDckIsZ0JBQWdCLEVBQUUsS0FBSztxQkFDeEI7b0JBQ0QsUUFBUSxFQUFFLHNCQUFzQjtvQkFDaEMsVUFBVSxFQUFFLHNCQUFzQjtpQkFDbkM7YUFDRixDQUFDO1lBRUYsTUFBTSxRQUFRLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLFNBQVMsRUFBRSxNQUFNO29CQUNqQixRQUFRLEVBQUUsS0FBSztvQkFDZixLQUFLLEVBQUUsa0JBQWtCO29CQUN6QixLQUFLLEVBQUUsYUFBYTtvQkFDcEIsV0FBVyxFQUFFLFlBQVk7aUJBQzFCO2FBQ0YsQ0FBQztZQUVELFlBQVksQ0FBQyxvQkFBa0MsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMvRSxPQUFPLENBQUMsT0FBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUUzRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUM7Z0JBQzVCLGNBQWMsRUFBRSxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRTtnQkFDN0MsY0FBYyxFQUFFO29CQUNkLEdBQUcsZUFBZSxFQUFFLENBQUMsY0FBYztvQkFDbkMsVUFBVSxFQUFFO3dCQUNWLE1BQU0sRUFBRTs0QkFDTixHQUFHLEVBQUUsaUJBQWlCOzRCQUN0QixLQUFLLEVBQUUscUJBQXFCO3lCQUM3QjtxQkFDRjtpQkFDRjthQUNGLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSx5QkFBYSxFQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTFDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JDLElBQUEsZ0JBQU0sRUFBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDbkQsSUFBQSxnQkFBTSxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBQSxnQkFBTSxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFBLGNBQUksRUFBQyx3REFBd0QsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN2RSxZQUFZLENBQUMsb0JBQWtDLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFdkUsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDO2dCQUM1QixjQUFjLEVBQUUsRUFBRSxNQUFNLEVBQUUsaUJBQWlCLEVBQUU7YUFDOUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLHlCQUFhLEVBQUMsS0FBSyxDQUFDLENBQUM7WUFFMUMsSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUEsa0JBQVEsRUFBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDdEMsSUFBQSxjQUFJLEVBQUMsd0NBQXdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDeEQsTUFBTSxRQUFRLEdBQUc7Z0JBQ2YsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFO2FBQ2hELENBQUM7WUFFRCxPQUFPLENBQUMsT0FBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxRCxZQUFZLENBQUMsbUJBQWlDLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDNUUsV0FBVyxDQUFDLGFBQTJCLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFdEUsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDO2dCQUM1QixVQUFVLEVBQUUsTUFBTTtnQkFDbEIsY0FBYyxFQUFFLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixFQUFFO2dCQUM3QyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsZUFBZSxFQUFFLG1CQUFtQjtvQkFDcEMsWUFBWSxFQUFFLE9BQU87b0JBQ3JCLFdBQVcsRUFBRTt3QkFDWCxhQUFhLEVBQUUsSUFBSTt3QkFDbkIsa0JBQWtCLEVBQUUsSUFBSTt3QkFDeEIsbUJBQW1CLEVBQUUsSUFBSTt3QkFDekIsb0JBQW9CLEVBQUUsSUFBSTt3QkFDMUIsZ0JBQWdCLEVBQUUsSUFBSTt3QkFDdEIsZUFBZSxFQUFFLElBQUk7d0JBQ3JCLGdCQUFnQixFQUFFLEtBQUs7cUJBQ3hCO2lCQUNGLENBQUM7Z0JBQ0YsY0FBYyxFQUFFO29CQUNkLEdBQUcsZUFBZSxFQUFFLENBQUMsY0FBYztvQkFDbkMsVUFBVSxFQUFFO3dCQUNWLE1BQU0sRUFBRTs0QkFDTixHQUFHLEVBQUUsaUJBQWlCOzRCQUN0QixLQUFLLEVBQUUscUJBQXFCO3lCQUM3QjtxQkFDRjtpQkFDRjthQUNGLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSxnQ0FBUyxFQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXRDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BDLElBQUEsZ0JBQU0sRUFBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxvQkFBb0IsQ0FDM0QsaUJBQWlCLEVBQ2pCLG1CQUFtQixFQUNuQixPQUFPLEVBQ1AsZ0JBQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQ25CLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILElBQUEsY0FBSSxFQUFDLDJEQUEyRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzNFLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQztnQkFDNUIsVUFBVSxFQUFFLE1BQU07Z0JBQ2xCLGNBQWMsRUFBRSxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRTtnQkFDN0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLGVBQWUsRUFBRSxtQkFBbUI7b0JBQ3BDLFlBQVksRUFBRSxPQUFPO29CQUNyQixXQUFXLEVBQUUsRUFBRTtpQkFDaEIsQ0FBQzthQUNILENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSxnQ0FBUyxFQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXRDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFBLGtCQUFRLEVBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLElBQUEsY0FBSSxFQUFDLDhCQUE4QixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzdDLFdBQVcsQ0FBQyxhQUEyQixDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRXRFLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQztnQkFDNUIsVUFBVSxFQUFFLE1BQU07Z0JBQ2xCLGNBQWMsRUFBRSxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRTtnQkFDN0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRSxxQkFBcUI7b0JBQzVCLFlBQVksRUFBRSxPQUFPO29CQUNyQixXQUFXLEVBQUU7d0JBQ1gsYUFBYSxFQUFFLElBQUk7d0JBQ25CLGdCQUFnQixFQUFFLElBQUk7cUJBQ3ZCO29CQUNELE9BQU8sRUFBRSw0QkFBNEI7aUJBQ3RDLENBQUM7Z0JBQ0YsY0FBYyxFQUFFO29CQUNkLEdBQUcsZUFBZSxFQUFFLENBQUMsY0FBYztvQkFDbkMsVUFBVSxFQUFFO3dCQUNWLE1BQU0sRUFBRTs0QkFDTixHQUFHLEVBQUUsaUJBQWlCOzRCQUN0QixLQUFLLEVBQUUscUJBQXFCOzRCQUM1QixJQUFJLEVBQUUsY0FBYzt5QkFDckI7cUJBQ0Y7aUJBQ0Y7YUFDRixDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsbUNBQVksRUFBQyxLQUFLLENBQUMsQ0FBQztZQUV6QyxJQUFBLGdCQUFNLEVBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQyxJQUFBLGdCQUFNLEVBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3hDLElBQUEsZ0JBQU0sRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDakQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFBLGNBQUksRUFBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNwRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUM7Z0JBQzVCLFVBQVUsRUFBRSxNQUFNO2dCQUNsQixjQUFjLEVBQUUsRUFBRSxNQUFNLEVBQUUsaUJBQWlCLEVBQUU7Z0JBQzdDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUUsZUFBZTtvQkFDdEIsWUFBWSxFQUFFLE9BQU87b0JBQ3JCLFdBQVcsRUFBRSxFQUFFO2lCQUNoQixDQUFDO2dCQUNGLGNBQWMsRUFBRTtvQkFDZCxHQUFHLGVBQWUsRUFBRSxDQUFDLGNBQWM7b0JBQ25DLFVBQVUsRUFBRTt3QkFDVixNQUFNLEVBQUU7NEJBQ04sR0FBRyxFQUFFLGlCQUFpQjs0QkFDdEIsS0FBSyxFQUFFLHFCQUFxQjt5QkFDN0I7cUJBQ0Y7aUJBQ0Y7YUFDRixDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsbUNBQVksRUFBQyxLQUFLLENBQUMsQ0FBQztZQUV6QyxJQUFBLGdCQUFNLEVBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0QyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBQSxrQkFBUSxFQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUNyQyxJQUFBLGNBQUksRUFBQyw0Q0FBNEMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RCxNQUFNLFFBQVEsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUU7Z0JBQy9DLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRTthQUN2QixDQUFDO1lBRUQsWUFBWSxDQUFDLGVBQTZCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkUsT0FBTyxDQUFDLE9BQXFCLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDMUQsYUFBYSxDQUFDLG9CQUFrQyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZFLGNBQWMsQ0FBQyxxQkFBbUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN6RSxRQUFRLENBQUMsZUFBNkIsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM3RCxjQUFjLENBQUMsVUFBd0IsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUUvRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUM7Z0JBQzVCLGNBQWMsRUFBRSxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRTthQUM5QyxDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsbUNBQVksRUFBQyxLQUFLLENBQUMsQ0FBQztZQUV6QyxJQUFBLGdCQUFNLEVBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQyxJQUFBLGdCQUFNLEVBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3JDLElBQUEsZ0JBQU0sRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pELElBQUEsZ0JBQU0sRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xELElBQUEsZ0JBQU0sRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pELElBQUEsZ0JBQU0sRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xELElBQUEsZ0JBQU0sRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzlDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFBLGtCQUFRLEVBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQ3BDLElBQUEsY0FBSSxFQUFDLGlEQUFpRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2pFLE1BQU0sVUFBVSxHQUFHO2dCQUNqQixPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUU7YUFDaEQsQ0FBQztZQUNGLE1BQU0sYUFBYSxHQUFHO2dCQUNwQixPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUU7YUFDaEQsQ0FBQztZQUVELFlBQVksQ0FBQyxlQUE2QixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25FLE9BQU8sQ0FBQyxPQUFxQjtpQkFDM0IscUJBQXFCLENBQUMsVUFBVSxDQUFDO2lCQUNqQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUN2QyxtQkFBbUIsQ0FBQyxnQkFBOEIsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUUxRSxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUM7Z0JBQzVCLFVBQVUsRUFBRSxNQUFNO2dCQUNsQixjQUFjLEVBQUUsRUFBRSxNQUFNLEVBQUUsaUJBQWlCLEVBQUU7Z0JBQzdDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixXQUFXLEVBQUUsbUJBQW1CO29CQUNoQyxPQUFPLEVBQUUsY0FBYztvQkFDdkIsT0FBTyxFQUFFLHdCQUF3QjtpQkFDbEMsQ0FBQztnQkFDRixjQUFjLEVBQUU7b0JBQ2QsR0FBRyxlQUFlLEVBQUUsQ0FBQyxjQUFjO29CQUNuQyxVQUFVLEVBQUU7d0JBQ1YsTUFBTSxFQUFFOzRCQUNOLEdBQUcsRUFBRSxpQkFBaUI7NEJBQ3RCLEtBQUssRUFBRSxxQkFBcUI7eUJBQzdCO3FCQUNGO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLGtDQUFXLEVBQUMsS0FBSyxDQUFDLENBQUM7WUFFeEMsSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckMsSUFBQSxnQkFBTSxFQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUEsY0FBSSxFQUFDLDhDQUE4QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzlELE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFckMsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDO2dCQUM1QixVQUFVLEVBQUUsTUFBTTtnQkFDbEIsY0FBYyxFQUFFLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixFQUFFO2dCQUM3QyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsV0FBVyxFQUFFLG1CQUFtQjtvQkFDaEMsT0FBTyxFQUFFLFdBQVc7aUJBQ3JCLENBQUM7Z0JBQ0YsY0FBYyxFQUFFO29CQUNkLEdBQUcsZUFBZSxFQUFFLENBQUMsY0FBYztvQkFDbkMsVUFBVSxFQUFFO3dCQUNWLE1BQU0sRUFBRTs0QkFDTixHQUFHLEVBQUUsaUJBQWlCOzRCQUN0QixLQUFLLEVBQUUscUJBQXFCO3lCQUM3QjtxQkFDRjtpQkFDRjthQUNGLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSxrQ0FBVyxFQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXhDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFBLGtCQUFRLEVBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLElBQUEsY0FBSSxFQUFDLGlDQUFpQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2pELE1BQU0sUUFBUSxHQUFHO2dCQUNmLGdCQUFnQixFQUFFO29CQUNoQixRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDO29CQUMzQixVQUFVLEVBQUUsRUFBRTtpQkFDZjthQUNGLENBQUM7WUFFRCxPQUFPLENBQUMsT0FBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxRCxXQUFXLENBQUMsYUFBMkIsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV0RSxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUM7Z0JBQzVCLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixjQUFjLEVBQUUsRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUU7Z0JBQ2hELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQztvQkFDbEMsVUFBVSxFQUFFO3dCQUNWLFdBQVcsRUFBRTs0QkFDWCxPQUFPLEVBQUUsSUFBSTs0QkFDYixhQUFhLEVBQUUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDO3lCQUNwQzt3QkFDRCxVQUFVLEVBQUU7NEJBQ1YsT0FBTyxFQUFFLElBQUk7NEJBQ2IsYUFBYSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUM7eUJBQzlDO3FCQUNGO2lCQUNGLENBQUM7Z0JBQ0YsY0FBYyxFQUFFO29CQUNkLEdBQUcsZUFBZSxFQUFFLENBQUMsY0FBYztvQkFDbkMsVUFBVSxFQUFFO3dCQUNWLE1BQU0sRUFBRTs0QkFDTixHQUFHLEVBQUUsb0JBQW9COzRCQUN6QixLQUFLLEVBQUUsa0JBQWtCO3lCQUMxQjtxQkFDRjtpQkFDRjthQUNGLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSxrQ0FBc0IsRUFBQyxLQUFLLENBQUMsQ0FBQztZQUVuRCxJQUFBLGdCQUFNLEVBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQyxJQUFBLGdCQUFNLEVBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZDLElBQUEsZ0JBQU0sRUFBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUEsY0FBSSxFQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzdELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQztnQkFDNUIsVUFBVSxFQUFFLEtBQUs7Z0JBQ2pCLGNBQWMsRUFBRSxFQUFFLE1BQU0sRUFBRSxvQkFBb0IsRUFBRTtnQkFDaEQsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLFFBQVEsRUFBRSxDQUFDLGlCQUFpQixDQUFDO2lCQUM5QixDQUFDO2dCQUNGLGNBQWMsRUFBRTtvQkFDZCxHQUFHLGVBQWUsRUFBRSxDQUFDLGNBQWM7b0JBQ25DLFVBQVUsRUFBRTt3QkFDVixNQUFNLEVBQUU7NEJBQ04sR0FBRyxFQUFFLG9CQUFvQjs0QkFDekIsS0FBSyxFQUFFLGtCQUFrQjt5QkFDMUI7cUJBQ0Y7aUJBQ0Y7YUFDRixDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsa0NBQXNCLEVBQUMsS0FBSyxDQUFDLENBQUM7WUFFbkQsSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFBLGNBQUksRUFBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNwRCxNQUFNLFFBQVEsR0FBRyxFQUFFLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLE9BQU8sQ0FBQyxPQUFxQixDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTNELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQztnQkFDNUIsVUFBVSxFQUFFLEtBQUs7Z0JBQ2pCLGNBQWMsRUFBRSxFQUFFLE1BQU0sRUFBRSxvQkFBb0IsRUFBRTtnQkFDaEQsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLFVBQVUsRUFBRTt3QkFDVixLQUFLLEVBQUUsT0FBTzt3QkFDZCxHQUFHLEVBQUUsT0FBTztxQkFDYjtpQkFDRixDQUFDO2dCQUNGLGNBQWMsRUFBRTtvQkFDZCxHQUFHLGVBQWUsRUFBRSxDQUFDLGNBQWM7b0JBQ25DLFVBQVUsRUFBRTt3QkFDVixNQUFNLEVBQUU7NEJBQ04sR0FBRyxFQUFFLG9CQUFvQjs0QkFDekIsS0FBSyxFQUFFLGtCQUFrQjt5QkFDMUI7cUJBQ0Y7aUJBQ0Y7YUFDRixDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsa0NBQXNCLEVBQUMsS0FBSyxDQUFDLENBQUM7WUFFbkQsSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUEsa0JBQVEsRUFBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDckMsSUFBQSxjQUFJLEVBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0QsWUFBWSxDQUFDLDJCQUF5QyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3BGLFdBQVcsQ0FBQyxhQUEyQixDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRXRFLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQztnQkFDNUIsVUFBVSxFQUFFLEtBQUs7Z0JBQ2pCLGNBQWMsRUFBRTtvQkFDZCxNQUFNLEVBQUUsaUJBQWlCO29CQUN6QixRQUFRLEVBQUUsbUJBQW1CO2lCQUM5QjtnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsV0FBVyxFQUFFO3dCQUNYLGFBQWEsRUFBRSxJQUFJO3dCQUNuQixrQkFBa0IsRUFBRSxLQUFLO3dCQUN6QixtQkFBbUIsRUFBRSxJQUFJO3dCQUN6QixvQkFBb0IsRUFBRSxLQUFLO3dCQUMzQixnQkFBZ0IsRUFBRSxJQUFJO3dCQUN0QixlQUFlLEVBQUUsSUFBSTt3QkFDckIsZ0JBQWdCLEVBQUUsS0FBSztxQkFDeEI7aUJBQ0YsQ0FBQztnQkFDRixjQUFjLEVBQUU7b0JBQ2QsR0FBRyxlQUFlLEVBQUUsQ0FBQyxjQUFjO29CQUNuQyxVQUFVLEVBQUU7d0JBQ1YsTUFBTSxFQUFFOzRCQUNOLEdBQUcsRUFBRSxpQkFBaUI7NEJBQ3RCLEtBQUssRUFBRSxxQkFBcUI7eUJBQzdCO3FCQUNGO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLHdDQUFpQixFQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTlDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BDLElBQUEsZ0JBQU0sRUFBQyxZQUFZLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3RFLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBQSxjQUFJLEVBQUMsMkRBQTJELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDM0UsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDO2dCQUM1QixVQUFVLEVBQUUsS0FBSztnQkFDakIsY0FBYyxFQUFFO29CQUNkLE1BQU0sRUFBRSxpQkFBaUI7b0JBQ3pCLFFBQVEsRUFBRSxtQkFBbUI7aUJBQzlCO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixXQUFXLEVBQUUsRUFBRTtpQkFDaEIsQ0FBQzthQUNILENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSx3Q0FBaUIsRUFBQyxLQUFLLENBQUMsQ0FBQztZQUU5QyxJQUFBLGdCQUFNLEVBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0QyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDYXJlIENpcmNsZSBNYW5hZ2VtZW50IFNlcnZpY2UgVGVzdHNcbi8vIFJlcXVpcmVtZW50czogNC4xLCA0LjMsIDQuNCwgNC41LCA4LjUsIDkuMlxuXG5pbXBvcnQgeyBkZXNjcmliZSwgdGVzdCwgZXhwZWN0LCBiZWZvcmVFYWNoLCBqZXN0IH0gZnJvbSAnQGplc3QvZ2xvYmFscyc7XG5cbi8vIE1vY2sgQVdTIFNESyBjbGllbnRzXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYicpO1xuamVzdC5tb2NrKCdAYXdzLXNkay9saWItZHluYW1vZGInKTtcbmplc3QubW9jaygnQGF3cy1zZGsvY2xpZW50LXNlcycpO1xuamVzdC5tb2NrKCdAYXdzLXNkay9jbGllbnQtc25zJyk7XG5cbi8vIE1vY2sgZGF0YSBhY2Nlc3MgbGF5ZXJzXG5qZXN0Lm1vY2soJy4uLy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9jYXJlLWNpcmNsZScpO1xuamVzdC5tb2NrKCcuLi8uLi9zaGFyZWQvZGF0YS1hY2Nlc3MvdXNlcnMnKTtcbmplc3QubW9jaygnLi4vLi4vc2hhcmVkL2RhdGEtYWNjZXNzL21lZGljYXRpb25zJyk7XG5qZXN0Lm1vY2soJy4uLy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9hcHBvaW50bWVudHMnKTtcbmplc3QubW9jaygnLi4vLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2FsZXJ0cycpO1xuamVzdC5tb2NrKCcuLi8uLi9zaGFyZWQvYXVkaXQtbG9nZ2VyJyk7XG5qZXN0Lm1vY2soJy4uLy4uL3NoYXJlZC9ub3RpZmljYXRpb24tc2VydmljZScpO1xuamVzdC5tb2NrKCcuLi8uLi9zaGFyZWQvdGltZXN0cmVhbS1jbGllbnQnKTtcbmplc3QubW9jaygnLi4vLi4vc2hhcmVkL2R5bmFtb2RiLWNsaWVudCcsICgpID0+ICh7XG4gIFRBQkxFUzoge1xuICAgIFVTRVJTOiAndGVzdC11c2Vycy10YWJsZScsXG4gICAgQ0FSRV9DSVJDTEU6ICd0ZXN0LWNhcmUtY2lyY2xlLXRhYmxlJyxcbiAgICBDQVJFX0NJUkNMRV9JTlZJVEFUSU9OUzogJ3Rlc3QtaW52aXRhdGlvbnMtdGFibGUnLFxuICAgIENBUkVfQ0lSQ0xFX01FU1NBR0VTOiAndGVzdC1tZXNzYWdlcy10YWJsZScsXG4gIH0sXG4gIHB1dEl0ZW06IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpLFxuICBnZXRJdGVtOiBqZXN0LmZuKCkubW9ja1Jlc29sdmVkVmFsdWUobnVsbCksXG4gIHF1ZXJ5SXRlbXM6IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZShbXSksXG4gIHVwZGF0ZUl0ZW06IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpLFxuICBkZWxldGVJdGVtOiBqZXN0LmZuKCkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKSxcbn0pKTtcblxuaW1wb3J0IHsgaGFuZGxlciBhcyBnZXRDYXJlQ2lyY2xlIH0gZnJvbSAnLi4vZ2V0LWNhcmUtY2lyY2xlJztcbmltcG9ydCB7IGhhbmRsZXIgYXMgYWRkTWVtYmVyIH0gZnJvbSAnLi4vYWRkLWNhcmUtY2lyY2xlLW1lbWJlcic7XG5pbXBvcnQgeyBoYW5kbGVyIGFzIHJlbW92ZU1lbWJlciB9IGZyb20gJy4uL3JlbW92ZS1jYXJlLWNpcmNsZS1tZW1iZXInO1xuaW1wb3J0IHsgaGFuZGxlciBhcyB1cGRhdGVQZXJtaXNzaW9ucyB9IGZyb20gJy4uL3VwZGF0ZS1jYXJlLWNpcmNsZS1wZXJtaXNzaW9ucyc7XG5pbXBvcnQgeyBoYW5kbGVyIGFzIGludml0ZU1lbWJlciB9IGZyb20gJy4uL2ludml0ZS1jYXJlLWNpcmNsZS1tZW1iZXInO1xuaW1wb3J0IHsgaGFuZGxlciBhcyBhY2NlcHRJbnZpdGF0aW9uIH0gZnJvbSAnLi4vYWNjZXB0LWNhcmUtY2lyY2xlLWludml0YXRpb24nO1xuaW1wb3J0IHsgaGFuZGxlciBhcyByZWplY3RJbnZpdGF0aW9uIH0gZnJvbSAnLi4vcmVqZWN0LWNhcmUtY2lyY2xlLWludml0YXRpb24nO1xuaW1wb3J0IHsgaGFuZGxlciBhcyBnZXREYXNoYm9hcmQgfSBmcm9tICcuLi9nZXQtY2FyZS1jaXJjbGUtZGFzaGJvYXJkJztcbmltcG9ydCB7IGhhbmRsZXIgYXMgc2VuZE1lc3NhZ2UgfSBmcm9tICcuLi9zZW5kLWNhcmUtY2lyY2xlLW1lc3NhZ2UnO1xuaW1wb3J0IHsgaGFuZGxlciBhcyBnZXRNZXNzYWdlcyB9IGZyb20gJy4uL2dldC1jYXJlLWNpcmNsZS1tZXNzYWdlcyc7XG5pbXBvcnQgeyBoYW5kbGVyIGFzIG1hcmtSZWFkIH0gZnJvbSAnLi4vbWFyay1tZXNzYWdlLXJlYWQnO1xuaW1wb3J0IHsgaGFuZGxlciBhcyBnZXRBbGVydFByZWZlcmVuY2VzIH0gZnJvbSAnLi4vZ2V0LWFsZXJ0LXByZWZlcmVuY2VzJztcbmltcG9ydCB7IGhhbmRsZXIgYXMgdXBkYXRlQWxlcnRQcmVmZXJlbmNlcyB9IGZyb20gJy4uL3VwZGF0ZS1hbGVydC1wcmVmZXJlbmNlcyc7XG5cbmltcG9ydCAqIGFzIGNhcmVDaXJjbGVEQSBmcm9tICcuLi8uLi9zaGFyZWQvZGF0YS1hY2Nlc3MvY2FyZS1jaXJjbGUnO1xuaW1wb3J0ICogYXMgdXNlcnNEQSBmcm9tICcuLi8uLi9zaGFyZWQvZGF0YS1hY2Nlc3MvdXNlcnMnO1xuaW1wb3J0ICogYXMgbWVkaWNhdGlvbnNEQSBmcm9tICcuLi8uLi9zaGFyZWQvZGF0YS1hY2Nlc3MvbWVkaWNhdGlvbnMnO1xuaW1wb3J0ICogYXMgYXBwb2ludG1lbnRzREEgZnJvbSAnLi4vLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2FwcG9pbnRtZW50cyc7XG5pbXBvcnQgKiBhcyBhbGVydHNEQSBmcm9tICcuLi8uLi9zaGFyZWQvZGF0YS1hY2Nlc3MvYWxlcnRzJztcbmltcG9ydCAqIGFzIGF1ZGl0TG9nZ2VyIGZyb20gJy4uLy4uL3NoYXJlZC9hdWRpdC1sb2dnZXInO1xuaW1wb3J0ICogYXMgbm90aWZpY2F0aW9uU2VydmljZSBmcm9tICcuLi8uLi9zaGFyZWQvbm90aWZpY2F0aW9uLXNlcnZpY2UnO1xuaW1wb3J0ICogYXMgdGltZXN0cmVhbUNsaWVudCBmcm9tICcuLi8uLi9zaGFyZWQvdGltZXN0cmVhbS1jbGllbnQnO1xuaW1wb3J0ICogYXMgZHluYW1vZGJDbGllbnQgZnJvbSAnLi4vLi4vc2hhcmVkL2R5bmFtb2RiLWNsaWVudCc7XG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuXG5kZXNjcmliZSgnQ2FyZSBDaXJjbGUgTWFuYWdlbWVudCBTZXJ2aWNlJywgKCkgPT4ge1xuICBjb25zdCBtb2NrUHJpbWFyeVVzZXJJZCA9ICdwcmltYXJ5LXVzZXItMTIzJztcbiAgY29uc3QgbW9ja1NlY29uZGFyeVVzZXJJZCA9ICdzZWNvbmRhcnktdXNlci00NTYnO1xuICBjb25zdCBtb2NrUmVxdWVzdGluZ1VzZXJJZCA9ICdyZXF1ZXN0aW5nLXVzZXItNzg5JztcblxuICBjb25zdCBjcmVhdGVNb2NrRXZlbnQgPSAob3ZlcnJpZGVzOiBQYXJ0aWFsPEFQSUdhdGV3YXlQcm94eUV2ZW50PiA9IHt9KTogQVBJR2F0ZXdheVByb3h5RXZlbnQgPT4gKHtcbiAgICBib2R5OiBudWxsLFxuICAgIGhlYWRlcnM6IHt9LFxuICAgIG11bHRpVmFsdWVIZWFkZXJzOiB7fSxcbiAgICBodHRwTWV0aG9kOiAnR0VUJyxcbiAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxuICAgIHBhdGg6ICcvJyxcbiAgICBwYXRoUGFyYW1ldGVyczogbnVsbCxcbiAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXG4gICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcbiAgICBzdGFnZVZhcmlhYmxlczogbnVsbCxcbiAgICByZXF1ZXN0Q29udGV4dDoge1xuICAgICAgYWNjb3VudElkOiAnMTIzNDU2Nzg5JyxcbiAgICAgIGFwaUlkOiAnYXBpLWlkJyxcbiAgICAgIGF1dGhvcml6ZXI6IHtcbiAgICAgICAgY2xhaW1zOiB7XG4gICAgICAgICAgc3ViOiBtb2NrUmVxdWVzdGluZ1VzZXJJZCxcbiAgICAgICAgICBlbWFpbDogJ3Rlc3RAZXhhbXBsZS5jb20nLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHByb3RvY29sOiAnSFRUUC8xLjEnLFxuICAgICAgaHR0cE1ldGhvZDogJ0dFVCcsXG4gICAgICBpZGVudGl0eToge1xuICAgICAgICBzb3VyY2VJcDogJzEyNy4wLjAuMScsXG4gICAgICAgIHVzZXJBZ2VudDogJ3Rlc3QtYWdlbnQnLFxuICAgICAgICBhY2Nlc3NLZXk6IG51bGwsXG4gICAgICAgIGFjY291bnRJZDogbnVsbCxcbiAgICAgICAgYXBpS2V5OiBudWxsLFxuICAgICAgICBhcGlLZXlJZDogbnVsbCxcbiAgICAgICAgY2FsbGVyOiBudWxsLFxuICAgICAgICBjbGllbnRDZXJ0OiBudWxsLFxuICAgICAgICBjb2duaXRvQXV0aGVudGljYXRpb25Qcm92aWRlcjogbnVsbCxcbiAgICAgICAgY29nbml0b0F1dGhlbnRpY2F0aW9uVHlwZTogbnVsbCxcbiAgICAgICAgY29nbml0b0lkZW50aXR5SWQ6IG51bGwsXG4gICAgICAgIGNvZ25pdG9JZGVudGl0eVBvb2xJZDogbnVsbCxcbiAgICAgICAgcHJpbmNpcGFsT3JnSWQ6IG51bGwsXG4gICAgICAgIHVzZXI6IG51bGwsXG4gICAgICAgIHVzZXJBcm46IG51bGwsXG4gICAgICB9LFxuICAgICAgcGF0aDogJy8nLFxuICAgICAgc3RhZ2U6ICd0ZXN0JyxcbiAgICAgIHJlcXVlc3RJZDogJ3JlcXVlc3QtaWQnLFxuICAgICAgcmVxdWVzdFRpbWVFcG9jaDogRGF0ZS5ub3coKSxcbiAgICAgIHJlc291cmNlSWQ6ICdyZXNvdXJjZS1pZCcsXG4gICAgICByZXNvdXJjZVBhdGg6ICcvJyxcbiAgICB9LFxuICAgIHJlc291cmNlOiAnLycsXG4gICAgLi4ub3ZlcnJpZGVzLFxuICB9KTtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0dldCBDYXJlIENpcmNsZScsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgcmV0dXJuIGNhcmUgY2lyY2xlIG1lbWJlcnMgZm9yIHByaW1hcnkgdXNlcicsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tNZW1iZXJzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgc2Vjb25kYXJ5VXNlcklkOiBtb2NrU2Vjb25kYXJ5VXNlcklkLFxuICAgICAgICAgIHJlbGF0aW9uc2hpcDogJ2NoaWxkJyxcbiAgICAgICAgICBwZXJtaXNzaW9uczoge1xuICAgICAgICAgICAgY2FuVmlld1ZpdGFsczogdHJ1ZSxcbiAgICAgICAgICAgIGNhblZpZXdNZWRpY2F0aW9uczogdHJ1ZSxcbiAgICAgICAgICAgIGNhblZpZXdBcHBvaW50bWVudHM6IHRydWUsXG4gICAgICAgICAgICBjYW5WaWV3SGVhbHRoUmVjb3JkczogdHJ1ZSxcbiAgICAgICAgICAgIGNhblJlY2VpdmVBbGVydHM6IHRydWUsXG4gICAgICAgICAgICBjYW5TZW5kTWVzc2FnZXM6IHRydWUsXG4gICAgICAgICAgICBjYW5NYW5hZ2VEZXZpY2VzOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGpvaW5lZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMFonLFxuICAgICAgICAgIGxhc3RBY3RpdmU6ICcyMDI0LTAxLTE1VDAwOjAwOjAwWicsXG4gICAgICAgIH0sXG4gICAgICBdO1xuXG4gICAgICBjb25zdCBtb2NrVXNlciA9IHtcbiAgICAgICAgcHJvZmlsZToge1xuICAgICAgICAgIGZpcnN0TmFtZTogJ0pvaG4nLFxuICAgICAgICAgIGxhc3ROYW1lOiAnRG9lJyxcbiAgICAgICAgICBlbWFpbDogJ2pvaG5AZXhhbXBsZS5jb20nLFxuICAgICAgICAgIHBob25lOiAnKzEyMzQ1Njc4OTAnLFxuICAgICAgICAgIGRhdGVPZkJpcnRoOiAnMTk5MC0wMS0wMScsXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICAoY2FyZUNpcmNsZURBLmdldENhcmVDaXJjbGVNZW1iZXJzIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUobW9ja01lbWJlcnMpO1xuICAgICAgKHVzZXJzREEuZ2V0VXNlciBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tVc2VyKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoe1xuICAgICAgICBwYXRoUGFyYW1ldGVyczogeyB1c2VySWQ6IG1vY2tQcmltYXJ5VXNlcklkIH0sXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7XG4gICAgICAgICAgLi4uY3JlYXRlTW9ja0V2ZW50KCkucmVxdWVzdENvbnRleHQsXG4gICAgICAgICAgYXV0aG9yaXplcjoge1xuICAgICAgICAgICAgY2xhaW1zOiB7XG4gICAgICAgICAgICAgIHN1YjogbW9ja1ByaW1hcnlVc2VySWQsXG4gICAgICAgICAgICAgIGVtYWlsOiAncHJpbWFyeUBleGFtcGxlLmNvbScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0Q2FyZUNpcmNsZShldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkucHJpbWFyeVVzZXJJZCkudG9CZShtb2NrUHJpbWFyeVVzZXJJZCk7XG4gICAgICBleHBlY3QoYm9keS5tZW1iZXJzKS50b0hhdmVMZW5ndGgoMSk7XG4gICAgICBleHBlY3QoYm9keS5tZW1iZXJzWzBdLnVzZXJJZCkudG9CZShtb2NrU2Vjb25kYXJ5VXNlcklkKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCByZXR1cm4gNDAzIGlmIHJlcXVlc3RpbmcgdXNlciBpcyBub3QgYXV0aG9yaXplZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIChjYXJlQ2lyY2xlREEuZ2V0Q2FyZUNpcmNsZU1lbWJlcnMgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZShbXSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KHtcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IHsgdXNlcklkOiBtb2NrUHJpbWFyeVVzZXJJZCB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdldENhcmVDaXJjbGUoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAzKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0FkZCBDYXJlIENpcmNsZSBNZW1iZXInLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGFkZCBhIG5ldyBtZW1iZXIgdG8gY2FyZSBjaXJjbGUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtb2NrVXNlciA9IHtcbiAgICAgICAgaWQ6IG1vY2tTZWNvbmRhcnlVc2VySWQsXG4gICAgICAgIHByb2ZpbGU6IHsgZmlyc3ROYW1lOiAnSmFuZScsIGxhc3ROYW1lOiAnRG9lJyB9LFxuICAgICAgfTtcblxuICAgICAgKHVzZXJzREEuZ2V0VXNlciBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tVc2VyKTtcbiAgICAgIChjYXJlQ2lyY2xlREEuYWRkQ2FyZUNpcmNsZU1lbWJlciBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XG4gICAgICAoYXVkaXRMb2dnZXIubG9nQXVkaXRFdmVudCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KHtcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBwYXRoUGFyYW1ldGVyczogeyB1c2VySWQ6IG1vY2tQcmltYXJ5VXNlcklkIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzZWNvbmRhcnlVc2VySWQ6IG1vY2tTZWNvbmRhcnlVc2VySWQsXG4gICAgICAgICAgcmVsYXRpb25zaGlwOiAnY2hpbGQnLFxuICAgICAgICAgIHBlcm1pc3Npb25zOiB7XG4gICAgICAgICAgICBjYW5WaWV3Vml0YWxzOiB0cnVlLFxuICAgICAgICAgICAgY2FuVmlld01lZGljYXRpb25zOiB0cnVlLFxuICAgICAgICAgICAgY2FuVmlld0FwcG9pbnRtZW50czogdHJ1ZSxcbiAgICAgICAgICAgIGNhblZpZXdIZWFsdGhSZWNvcmRzOiB0cnVlLFxuICAgICAgICAgICAgY2FuUmVjZWl2ZUFsZXJ0czogdHJ1ZSxcbiAgICAgICAgICAgIGNhblNlbmRNZXNzYWdlczogdHJ1ZSxcbiAgICAgICAgICAgIGNhbk1hbmFnZURldmljZXM6IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pLFxuICAgICAgICByZXF1ZXN0Q29udGV4dDoge1xuICAgICAgICAgIC4uLmNyZWF0ZU1vY2tFdmVudCgpLnJlcXVlc3RDb250ZXh0LFxuICAgICAgICAgIGF1dGhvcml6ZXI6IHtcbiAgICAgICAgICAgIGNsYWltczoge1xuICAgICAgICAgICAgICBzdWI6IG1vY2tQcmltYXJ5VXNlcklkLFxuICAgICAgICAgICAgICBlbWFpbDogJ3ByaW1hcnlAZXhhbXBsZS5jb20nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGFkZE1lbWJlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgICAgZXhwZWN0KGNhcmVDaXJjbGVEQS5hZGRDYXJlQ2lyY2xlTWVtYmVyKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICAgICAgbW9ja1ByaW1hcnlVc2VySWQsXG4gICAgICAgIG1vY2tTZWNvbmRhcnlVc2VySWQsXG4gICAgICAgICdjaGlsZCcsXG4gICAgICAgIGV4cGVjdC5hbnkoT2JqZWN0KVxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCByZXR1cm4gNDAzIGlmIG5vbi1wcmltYXJ5IHVzZXIgdHJpZXMgdG8gYWRkIG1lbWJlcicsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KHtcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBwYXRoUGFyYW1ldGVyczogeyB1c2VySWQ6IG1vY2tQcmltYXJ5VXNlcklkIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzZWNvbmRhcnlVc2VySWQ6IG1vY2tTZWNvbmRhcnlVc2VySWQsXG4gICAgICAgICAgcmVsYXRpb25zaGlwOiAnY2hpbGQnLFxuICAgICAgICAgIHBlcm1pc3Npb25zOiB7fSxcbiAgICAgICAgfSksXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYWRkTWVtYmVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdDYXJlIENpcmNsZSBJbnZpdGF0aW9ucycsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgc2VuZCBpbnZpdGF0aW9uIGVtYWlsJywgYXN5bmMgKCkgPT4ge1xuICAgICAgKGF1ZGl0TG9nZ2VyLmxvZ0F1ZGl0RXZlbnQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCh7XG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IHsgdXNlcklkOiBtb2NrUHJpbWFyeVVzZXJJZCB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgZW1haWw6ICdpbnZpdGVlQGV4YW1wbGUuY29tJyxcbiAgICAgICAgICByZWxhdGlvbnNoaXA6ICdjaGlsZCcsXG4gICAgICAgICAgcGVybWlzc2lvbnM6IHtcbiAgICAgICAgICAgIGNhblZpZXdWaXRhbHM6IHRydWUsXG4gICAgICAgICAgICBjYW5SZWNlaXZlQWxlcnRzOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSBqb2luIG15IGNhcmUgY2lyY2xlJyxcbiAgICAgICAgfSksXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7XG4gICAgICAgICAgLi4uY3JlYXRlTW9ja0V2ZW50KCkucmVxdWVzdENvbnRleHQsXG4gICAgICAgICAgYXV0aG9yaXplcjoge1xuICAgICAgICAgICAgY2xhaW1zOiB7XG4gICAgICAgICAgICAgIHN1YjogbW9ja1ByaW1hcnlVc2VySWQsXG4gICAgICAgICAgICAgIGVtYWlsOiAncHJpbWFyeUBleGFtcGxlLmNvbScsXG4gICAgICAgICAgICAgIG5hbWU6ICdQcmltYXJ5IFVzZXInLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGludml0ZU1lbWJlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkuaW52aXRhdGlvbklkKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KGJvZHkuZW1haWwpLnRvQmUoJ2ludml0ZWVAZXhhbXBsZS5jb20nKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCByZWplY3QgaW52YWxpZCBlbWFpbCBmb3JtYXQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCh7XG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IHsgdXNlcklkOiBtb2NrUHJpbWFyeVVzZXJJZCB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgZW1haWw6ICdpbnZhbGlkLWVtYWlsJyxcbiAgICAgICAgICByZWxhdGlvbnNoaXA6ICdjaGlsZCcsXG4gICAgICAgICAgcGVybWlzc2lvbnM6IHt9LFxuICAgICAgICB9KSxcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHtcbiAgICAgICAgICAuLi5jcmVhdGVNb2NrRXZlbnQoKS5yZXF1ZXN0Q29udGV4dCxcbiAgICAgICAgICBhdXRob3JpemVyOiB7XG4gICAgICAgICAgICBjbGFpbXM6IHtcbiAgICAgICAgICAgICAgc3ViOiBtb2NrUHJpbWFyeVVzZXJJZCxcbiAgICAgICAgICAgICAgZW1haWw6ICdwcmltYXJ5QGV4YW1wbGUuY29tJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBpbnZpdGVNZW1iZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0NhcmUgQ2lyY2xlIERhc2hib2FyZCcsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgcmV0dXJuIGNvbXByZWhlbnNpdmUgZGFzaGJvYXJkIGRhdGEnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtb2NrVXNlciA9IHtcbiAgICAgICAgcHJvZmlsZTogeyBmaXJzdE5hbWU6ICdKb2huJywgbGFzdE5hbWU6ICdEb2UnIH0sXG4gICAgICAgIGxhc3RBY3RpdmU6IG5ldyBEYXRlKCksXG4gICAgICB9O1xuXG4gICAgICAoY2FyZUNpcmNsZURBLmNoZWNrUGVybWlzc2lvbiBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHRydWUpO1xuICAgICAgKHVzZXJzREEuZ2V0VXNlciBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tVc2VyKTtcbiAgICAgIChtZWRpY2F0aW9uc0RBLmdldE1lZGljYXRpb25zQnlVc2VyIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoW10pO1xuICAgICAgKGFwcG9pbnRtZW50c0RBLmdldEFwcG9pbnRtZW50c0J5VXNlciBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKFtdKTtcbiAgICAgIChhbGVydHNEQS5nZXRBbGVydHNCeVVzZXIgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZShbXSk7XG4gICAgICAoZHluYW1vZGJDbGllbnQucXVlcnlJdGVtcyBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKFtdKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoe1xuICAgICAgICBwYXRoUGFyYW1ldGVyczogeyB1c2VySWQ6IG1vY2tQcmltYXJ5VXNlcklkIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0RGFzaGJvYXJkKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICBleHBlY3QoYm9keS5kYXNoYm9hcmQpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoYm9keS5kYXNoYm9hcmQucHJpbWFyeVVzZXIpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoYm9keS5kYXNoYm9hcmQuaGVhbHRoU3RhdHVzKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KGJvZHkuZGFzaGJvYXJkLm1lZGljYXRpb25zKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KGJvZHkuZGFzaGJvYXJkLmFwcG9pbnRtZW50cykudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChib2R5LmRhc2hib2FyZC5hbGVydHMpLnRvQmVEZWZpbmVkKCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdGYW1pbHkgQ29tbXVuaWNhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgc2VuZCBtZXNzYWdlIGJldHdlZW4gY2FyZSBjaXJjbGUgbWVtYmVycycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tTZW5kZXIgPSB7XG4gICAgICAgIHByb2ZpbGU6IHsgZmlyc3ROYW1lOiAnSmFuZScsIGxhc3ROYW1lOiAnRG9lJyB9LFxuICAgICAgfTtcbiAgICAgIGNvbnN0IG1vY2tSZWNpcGllbnQgPSB7XG4gICAgICAgIHByb2ZpbGU6IHsgZmlyc3ROYW1lOiAnSm9obicsIGxhc3ROYW1lOiAnRG9lJyB9LFxuICAgICAgfTtcblxuICAgICAgKGNhcmVDaXJjbGVEQS5jaGVja1Blcm1pc3Npb24gYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh0cnVlKTtcbiAgICAgICh1c2Vyc0RBLmdldFVzZXIgYXMgamVzdC5Nb2NrKVxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKG1vY2tTZW5kZXIpXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UobW9ja1JlY2lwaWVudCk7XG4gICAgICAobm90aWZpY2F0aW9uU2VydmljZS5zZW5kTm90aWZpY2F0aW9uIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoW10pO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCh7XG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IHsgdXNlcklkOiBtb2NrUHJpbWFyeVVzZXJJZCB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgcmVjaXBpZW50SWQ6IG1vY2tTZWNvbmRhcnlVc2VySWQsXG4gICAgICAgICAgc3ViamVjdDogJ1Rlc3QgTWVzc2FnZScsXG4gICAgICAgICAgY29udGVudDogJ1RoaXMgaXMgYSB0ZXN0IG1lc3NhZ2UnLFxuICAgICAgICB9KSxcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHtcbiAgICAgICAgICAuLi5jcmVhdGVNb2NrRXZlbnQoKS5yZXF1ZXN0Q29udGV4dCxcbiAgICAgICAgICBhdXRob3JpemVyOiB7XG4gICAgICAgICAgICBjbGFpbXM6IHtcbiAgICAgICAgICAgICAgc3ViOiBtb2NrUHJpbWFyeVVzZXJJZCxcbiAgICAgICAgICAgICAgZW1haWw6ICdwcmltYXJ5QGV4YW1wbGUuY29tJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzZW5kTWVzc2FnZShldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkubWVzc2FnZUlkKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHJlamVjdCBtZXNzYWdlIGV4Y2VlZGluZyBsZW5ndGggbGltaXQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBsb25nQ29udGVudCA9ICdhJy5yZXBlYXQoNTAwMSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KHtcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBwYXRoUGFyYW1ldGVyczogeyB1c2VySWQ6IG1vY2tQcmltYXJ5VXNlcklkIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICByZWNpcGllbnRJZDogbW9ja1NlY29uZGFyeVVzZXJJZCxcbiAgICAgICAgICBjb250ZW50OiBsb25nQ29udGVudCxcbiAgICAgICAgfSksXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7XG4gICAgICAgICAgLi4uY3JlYXRlTW9ja0V2ZW50KCkucmVxdWVzdENvbnRleHQsXG4gICAgICAgICAgYXV0aG9yaXplcjoge1xuICAgICAgICAgICAgY2xhaW1zOiB7XG4gICAgICAgICAgICAgIHN1YjogbW9ja1ByaW1hcnlVc2VySWQsXG4gICAgICAgICAgICAgIGVtYWlsOiAncHJpbWFyeUBleGFtcGxlLmNvbScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VuZE1lc3NhZ2UoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0FsZXJ0IFByZWZlcmVuY2VzJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCB1cGRhdGUgYWxlcnQgcHJlZmVyZW5jZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtb2NrVXNlciA9IHtcbiAgICAgICAgYWxlcnRQcmVmZXJlbmNlczoge1xuICAgICAgICAgIGNoYW5uZWxzOiBbJ3B1c2gnLCAnZW1haWwnXSxcbiAgICAgICAgICBhbGVydFR5cGVzOiB7fSxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICAgICh1c2Vyc0RBLmdldFVzZXIgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrVXNlcik7XG4gICAgICAoYXVkaXRMb2dnZXIubG9nQXVkaXRFdmVudCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KHtcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BVVCcsXG4gICAgICAgIHBhdGhQYXJhbWV0ZXJzOiB7IHVzZXJJZDogbW9ja1JlcXVlc3RpbmdVc2VySWQgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGNoYW5uZWxzOiBbJ3B1c2gnLCAnc21zJywgJ2VtYWlsJ10sXG4gICAgICAgICAgYWxlcnRUeXBlczoge1xuICAgICAgICAgICAgdml0YWxfc2lnbnM6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgdXJnZW5jeUxldmVsczogWydoaWdoJywgJ2NyaXRpY2FsJ10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWVkaWNhdGlvbjoge1xuICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICB1cmdlbmN5TGV2ZWxzOiBbJ21lZGl1bScsICdoaWdoJywgJ2NyaXRpY2FsJ10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pLFxuICAgICAgICByZXF1ZXN0Q29udGV4dDoge1xuICAgICAgICAgIC4uLmNyZWF0ZU1vY2tFdmVudCgpLnJlcXVlc3RDb250ZXh0LFxuICAgICAgICAgIGF1dGhvcml6ZXI6IHtcbiAgICAgICAgICAgIGNsYWltczoge1xuICAgICAgICAgICAgICBzdWI6IG1vY2tSZXF1ZXN0aW5nVXNlcklkLFxuICAgICAgICAgICAgICBlbWFpbDogJ3VzZXJAZXhhbXBsZS5jb20nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHVwZGF0ZUFsZXJ0UHJlZmVyZW5jZXMoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5LnByZWZlcmVuY2VzKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KGJvZHkucHJlZmVyZW5jZXMuY2hhbm5lbHMpLnRvQ29udGFpbignc21zJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgcmVqZWN0IGludmFsaWQgbm90aWZpY2F0aW9uIGNoYW5uZWxzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoe1xuICAgICAgICBodHRwTWV0aG9kOiAnUFVUJyxcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IHsgdXNlcklkOiBtb2NrUmVxdWVzdGluZ1VzZXJJZCB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgY2hhbm5lbHM6IFsnaW52YWxpZC1jaGFubmVsJ10sXG4gICAgICAgIH0pLFxuICAgICAgICByZXF1ZXN0Q29udGV4dDoge1xuICAgICAgICAgIC4uLmNyZWF0ZU1vY2tFdmVudCgpLnJlcXVlc3RDb250ZXh0LFxuICAgICAgICAgIGF1dGhvcml6ZXI6IHtcbiAgICAgICAgICAgIGNsYWltczoge1xuICAgICAgICAgICAgICBzdWI6IG1vY2tSZXF1ZXN0aW5nVXNlcklkLFxuICAgICAgICAgICAgICBlbWFpbDogJ3VzZXJAZXhhbXBsZS5jb20nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHVwZGF0ZUFsZXJ0UHJlZmVyZW5jZXMoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCB2YWxpZGF0ZSBxdWlldCBob3VycyBmb3JtYXQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtb2NrVXNlciA9IHsgYWxlcnRQcmVmZXJlbmNlczoge30gfTtcbiAgICAgICh1c2Vyc0RBLmdldFVzZXIgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrVXNlcik7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KHtcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BVVCcsXG4gICAgICAgIHBhdGhQYXJhbWV0ZXJzOiB7IHVzZXJJZDogbW9ja1JlcXVlc3RpbmdVc2VySWQgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHF1aWV0SG91cnM6IHtcbiAgICAgICAgICAgIHN0YXJ0OiAnMjI6MDAnLFxuICAgICAgICAgICAgZW5kOiAnMDc6MDAnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pLFxuICAgICAgICByZXF1ZXN0Q29udGV4dDoge1xuICAgICAgICAgIC4uLmNyZWF0ZU1vY2tFdmVudCgpLnJlcXVlc3RDb250ZXh0LFxuICAgICAgICAgIGF1dGhvcml6ZXI6IHtcbiAgICAgICAgICAgIGNsYWltczoge1xuICAgICAgICAgICAgICBzdWI6IG1vY2tSZXF1ZXN0aW5nVXNlcklkLFxuICAgICAgICAgICAgICBlbWFpbDogJ3VzZXJAZXhhbXBsZS5jb20nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHVwZGF0ZUFsZXJ0UHJlZmVyZW5jZXMoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1Blcm1pc3Npb24gTWFuYWdlbWVudCcsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgdXBkYXRlIGNhcmUgY2lyY2xlIG1lbWJlciBwZXJtaXNzaW9ucycsIGFzeW5jICgpID0+IHtcbiAgICAgIChjYXJlQ2lyY2xlREEudXBkYXRlQ2FyZUNpcmNsZVBlcm1pc3Npb25zIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcbiAgICAgIChhdWRpdExvZ2dlci5sb2dBdWRpdEV2ZW50IGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoe1xuICAgICAgICBodHRwTWV0aG9kOiAnUFVUJyxcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IHtcbiAgICAgICAgICB1c2VySWQ6IG1vY2tQcmltYXJ5VXNlcklkLFxuICAgICAgICAgIG1lbWJlcklkOiBtb2NrU2Vjb25kYXJ5VXNlcklkLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgcGVybWlzc2lvbnM6IHtcbiAgICAgICAgICAgIGNhblZpZXdWaXRhbHM6IHRydWUsXG4gICAgICAgICAgICBjYW5WaWV3TWVkaWNhdGlvbnM6IGZhbHNlLFxuICAgICAgICAgICAgY2FuVmlld0FwcG9pbnRtZW50czogdHJ1ZSxcbiAgICAgICAgICAgIGNhblZpZXdIZWFsdGhSZWNvcmRzOiBmYWxzZSxcbiAgICAgICAgICAgIGNhblJlY2VpdmVBbGVydHM6IHRydWUsXG4gICAgICAgICAgICBjYW5TZW5kTWVzc2FnZXM6IHRydWUsXG4gICAgICAgICAgICBjYW5NYW5hZ2VEZXZpY2VzOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHtcbiAgICAgICAgICAuLi5jcmVhdGVNb2NrRXZlbnQoKS5yZXF1ZXN0Q29udGV4dCxcbiAgICAgICAgICBhdXRob3JpemVyOiB7XG4gICAgICAgICAgICBjbGFpbXM6IHtcbiAgICAgICAgICAgICAgc3ViOiBtb2NrUHJpbWFyeVVzZXJJZCxcbiAgICAgICAgICAgICAgZW1haWw6ICdwcmltYXJ5QGV4YW1wbGUuY29tJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB1cGRhdGVQZXJtaXNzaW9ucyhldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgICAgZXhwZWN0KGNhcmVDaXJjbGVEQS51cGRhdGVDYXJlQ2lyY2xlUGVybWlzc2lvbnMpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBwcmV2ZW50IG5vbi1wcmltYXJ5IHVzZXIgZnJvbSB1cGRhdGluZyBwZXJtaXNzaW9ucycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KHtcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BVVCcsXG4gICAgICAgIHBhdGhQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgdXNlcklkOiBtb2NrUHJpbWFyeVVzZXJJZCxcbiAgICAgICAgICBtZW1iZXJJZDogbW9ja1NlY29uZGFyeVVzZXJJZCxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHBlcm1pc3Npb25zOiB7fSxcbiAgICAgICAgfSksXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdXBkYXRlUGVybWlzc2lvbnMoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAzKTtcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==