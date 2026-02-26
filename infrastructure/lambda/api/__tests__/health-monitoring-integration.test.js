"use strict";
// Integration test for Health Monitoring and Alert Systems
// Checkpoint Task 7: Verify health monitoring and alerts are functional
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
const record_vital_signs_1 = require("../record-vital-signs");
const create_alert_1 = require("../create-alert");
const get_alerts_1 = require("../get-alerts");
const timestreamClient = __importStar(require("../../shared/timestream-client"));
const alertsDataAccess = __importStar(require("../../shared/data-access/alerts"));
const usersDataAccess = __importStar(require("../../shared/data-access/users"));
const auditLogger = __importStar(require("../../shared/audit-logger"));
// Mock dependencies
jest.mock('../../shared/timestream-client');
jest.mock('../../shared/data-access/alerts');
jest.mock('../../shared/data-access/users');
jest.mock('../../shared/audit-logger');
describe('Health Monitoring and Alert Systems Integration', () => {
    const mockWriteVitalSigns = timestreamClient.writeVitalSigns;
    const mockCreateAlert = alertsDataAccess.createAlert;
    const mockGetAlertsByUser = alertsDataAccess.getAlertsByUser;
    const mockGetUser = usersDataAccess.getUser;
    const mockLogAuditEvent = auditLogger.logAuditEvent;
    const mockLogDataAccess = auditLogger.logDataAccess;
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
                },
            };
            const result = await (0, record_vital_signs_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            // Verify anomalies were detected
            expect(body.anomalies).toBeDefined();
            expect(body.anomalies.length).toBeGreaterThan(0);
            expect(body.alertTriggered).toBe(true);
            // Verify vital signs were stored
            expect(mockWriteVitalSigns).toHaveBeenCalledWith('user-123', expect.objectContaining({
                heartRate: 150,
                systolicBP: 180,
                diastolicBP: 100,
            }), expect.any(Date), 'manual');
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
                },
            };
            const result = await (0, record_vital_signs_1.handler)(event);
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
            };
            const result = await (0, create_alert_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.alertId).toBe('alert-123');
            expect(body.message).toBe('Alert created successfully');
            // Verify alert was created with correct data
            expect(mockCreateAlert).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user-123',
                type: 'vital_signs',
                severity: 'high',
                message: 'Heart rate is critically high',
                acknowledged: false,
                escalated: false,
            }));
        });
        it('should retrieve alerts for a user', async () => {
            const mockAlerts = [
                {
                    id: 'alert-1',
                    userId: 'user-123',
                    type: 'vital_signs',
                    severity: 'high',
                    message: 'High heart rate detected',
                    timestamp: new Date('2024-01-15T10:00:00Z'),
                    acknowledged: false,
                    escalated: false,
                },
                {
                    id: 'alert-2',
                    userId: 'user-123',
                    type: 'medication',
                    severity: 'medium',
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
                },
            };
            const result = await (0, get_alerts_1.handler)(event);
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
            };
            const result = await (0, create_alert_1.handler)(event);
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
            };
            const result = await (0, create_alert_1.handler)(event);
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
                },
            };
            const recordResult = await (0, record_vital_signs_1.handler)(recordEvent);
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
            };
            const alertResult = await (0, create_alert_1.handler)(createAlertEvent);
            expect(alertResult.statusCode).toBe(200);
            const alertBody = JSON.parse(alertResult.body);
            expect(alertBody.alertId).toBe('alert-456');
            // Verify audit logging occurred
            expect(mockLogDataAccess).toHaveBeenCalled();
            expect(mockLogAuditEvent).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVhbHRoLW1vbml0b3JpbmctaW50ZWdyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhlYWx0aC1tb25pdG9yaW5nLWludGVncmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDJEQUEyRDtBQUMzRCx3RUFBd0U7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRXhFLDhEQUEyRTtBQUMzRSxrREFBZ0U7QUFDaEUsOENBQTREO0FBRTVELGlGQUFtRTtBQUNuRSxrRkFBb0U7QUFDcEUsZ0ZBQWtFO0FBQ2xFLHVFQUF5RDtBQUV6RCxvQkFBb0I7QUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQUM3QyxJQUFJLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDNUMsSUFBSSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBRXZDLFFBQVEsQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7SUFDL0QsTUFBTSxtQkFBbUIsR0FBRyxnQkFBZ0IsQ0FBQyxlQUErRSxDQUFDO0lBQzdILE1BQU0sZUFBZSxHQUFHLGdCQUFnQixDQUFDLFdBQXVFLENBQUM7SUFDakgsTUFBTSxtQkFBbUIsR0FBRyxnQkFBZ0IsQ0FBQyxlQUErRSxDQUFDO0lBQzdILE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxPQUE4RCxDQUFDO0lBQ25HLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLGFBQXNFLENBQUM7SUFDN0csTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsYUFBc0UsQ0FBQztJQUU3RyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3JCLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pELGlC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QUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9DLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRTVDLGdDQUFnQztZQUNoQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzdDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDL0MsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gSW50ZWdyYXRpb24gdGVzdCBmb3IgSGVhbHRoIE1vbml0b3JpbmcgYW5kIEFsZXJ0IFN5c3RlbXNcbi8vIENoZWNrcG9pbnQgVGFzayA3OiBWZXJpZnkgaGVhbHRoIG1vbml0b3JpbmcgYW5kIGFsZXJ0cyBhcmUgZnVuY3Rpb25hbFxuXG5pbXBvcnQgeyBoYW5kbGVyIGFzIHJlY29yZFZpdGFsU2lnbnNIYW5kbGVyIH0gZnJvbSAnLi4vcmVjb3JkLXZpdGFsLXNpZ25zJztcbmltcG9ydCB7IGhhbmRsZXIgYXMgY3JlYXRlQWxlcnRIYW5kbGVyIH0gZnJvbSAnLi4vY3JlYXRlLWFsZXJ0JztcbmltcG9ydCB7IGhhbmRsZXIgYXMgZ2V0QWxlcnRzSGFuZGxlciB9IGZyb20gJy4uL2dldC1hbGVydHMnO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIHRpbWVzdHJlYW1DbGllbnQgZnJvbSAnLi4vLi4vc2hhcmVkL3RpbWVzdHJlYW0tY2xpZW50JztcbmltcG9ydCAqIGFzIGFsZXJ0c0RhdGFBY2Nlc3MgZnJvbSAnLi4vLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2FsZXJ0cyc7XG5pbXBvcnQgKiBhcyB1c2Vyc0RhdGFBY2Nlc3MgZnJvbSAnLi4vLi4vc2hhcmVkL2RhdGEtYWNjZXNzL3VzZXJzJztcbmltcG9ydCAqIGFzIGF1ZGl0TG9nZ2VyIGZyb20gJy4uLy4uL3NoYXJlZC9hdWRpdC1sb2dnZXInO1xuXG4vLyBNb2NrIGRlcGVuZGVuY2llc1xuamVzdC5tb2NrKCcuLi8uLi9zaGFyZWQvdGltZXN0cmVhbS1jbGllbnQnKTtcbmplc3QubW9jaygnLi4vLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2FsZXJ0cycpO1xuamVzdC5tb2NrKCcuLi8uLi9zaGFyZWQvZGF0YS1hY2Nlc3MvdXNlcnMnKTtcbmplc3QubW9jaygnLi4vLi4vc2hhcmVkL2F1ZGl0LWxvZ2dlcicpO1xuXG5kZXNjcmliZSgnSGVhbHRoIE1vbml0b3JpbmcgYW5kIEFsZXJ0IFN5c3RlbXMgSW50ZWdyYXRpb24nLCAoKSA9PiB7XG4gIGNvbnN0IG1vY2tXcml0ZVZpdGFsU2lnbnMgPSB0aW1lc3RyZWFtQ2xpZW50LndyaXRlVml0YWxTaWducyBhcyBqZXN0Lk1vY2tlZEZ1bmN0aW9uPHR5cGVvZiB0aW1lc3RyZWFtQ2xpZW50LndyaXRlVml0YWxTaWducz47XG4gIGNvbnN0IG1vY2tDcmVhdGVBbGVydCA9IGFsZXJ0c0RhdGFBY2Nlc3MuY3JlYXRlQWxlcnQgYXMgamVzdC5Nb2NrZWRGdW5jdGlvbjx0eXBlb2YgYWxlcnRzRGF0YUFjY2Vzcy5jcmVhdGVBbGVydD47XG4gIGNvbnN0IG1vY2tHZXRBbGVydHNCeVVzZXIgPSBhbGVydHNEYXRhQWNjZXNzLmdldEFsZXJ0c0J5VXNlciBhcyBqZXN0Lk1vY2tlZEZ1bmN0aW9uPHR5cGVvZiBhbGVydHNEYXRhQWNjZXNzLmdldEFsZXJ0c0J5VXNlcj47XG4gIGNvbnN0IG1vY2tHZXRVc2VyID0gdXNlcnNEYXRhQWNjZXNzLmdldFVzZXIgYXMgamVzdC5Nb2NrZWRGdW5jdGlvbjx0eXBlb2YgdXNlcnNEYXRhQWNjZXNzLmdldFVzZXI+O1xuICBjb25zdCBtb2NrTG9nQXVkaXRFdmVudCA9IGF1ZGl0TG9nZ2VyLmxvZ0F1ZGl0RXZlbnQgYXMgamVzdC5Nb2NrZWRGdW5jdGlvbjx0eXBlb2YgYXVkaXRMb2dnZXIubG9nQXVkaXRFdmVudD47XG4gIGNvbnN0IG1vY2tMb2dEYXRhQWNjZXNzID0gYXVkaXRMb2dnZXIubG9nRGF0YUFjY2VzcyBhcyBqZXN0Lk1vY2tlZEZ1bmN0aW9uPHR5cGVvZiBhdWRpdExvZ2dlci5sb2dEYXRhQWNjZXNzPjtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcbiAgICBtb2NrV3JpdGVWaXRhbFNpZ25zLm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XG4gICAgbW9ja0xvZ0F1ZGl0RXZlbnQubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcbiAgICBtb2NrTG9nRGF0YUFjY2Vzcy5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xuICAgIG1vY2tHZXRVc2VyLm1vY2tSZXNvbHZlZFZhbHVlKHtcbiAgICAgIGlkOiAndXNlci0xMjMnLFxuICAgICAgcHJvZmlsZToge1xuICAgICAgICBmaXJzdE5hbWU6ICdKb2huJyxcbiAgICAgICAgbGFzdE5hbWU6ICdEb2UnLFxuICAgICAgICBlbWFpbDogJ2pvaG5AZXhhbXBsZS5jb20nLFxuICAgICAgICBwaG9uZTogJzU1NS0wMTAwJyxcbiAgICAgICAgZGF0ZU9mQmlydGg6ICcxOTUwLTAxLTAxJyxcbiAgICAgIH0sXG4gICAgICBoZWFsdGhQcm9maWxlOiB7XG4gICAgICAgIGNvbmRpdGlvbnM6IFtdLFxuICAgICAgICBtZWRpY2F0aW9uczogW10sXG4gICAgICAgIGFsbGVyZ2llczogW10sXG4gICAgICAgIGVtZXJnZW5jeUNvbnRhY3RzOiBbXSxcbiAgICAgICAgaGVhbHRoY2FyZVByb3ZpZGVyczogW10sXG4gICAgICAgIGJhc2VsaW5lVml0YWxzOiB7XG4gICAgICAgICAgaGVhcnRSYXRlOiB7IG1pbjogNjAsIG1heDogMTAwIH0sXG4gICAgICAgICAgYmxvb2RQcmVzc3VyZToge1xuICAgICAgICAgICAgc3lzdG9saWM6IHsgbWluOiA5MCwgbWF4OiAxNDAgfSxcbiAgICAgICAgICAgIGRpYXN0b2xpYzogeyBtaW46IDYwLCBtYXg6IDkwIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0ZW1wZXJhdHVyZTogeyBtaW46IDk3LjAsIG1heDogOTkuNSB9LFxuICAgICAgICAgIG94eWdlblNhdHVyYXRpb246IHsgbWluOiA5NSwgbWF4OiAxMDAgfSxcbiAgICAgICAgICB3ZWlnaHQ6IHsgbWluOiAxNTAsIG1heDogMjAwIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgY2FyZUNpcmNsZTogW10sXG4gICAgICBwcmVmZXJlbmNlczoge1xuICAgICAgICBmb250U2l6ZTogJ2xhcmdlJyxcbiAgICAgICAgY29udHJhc3Q6ICdoaWdoJyxcbiAgICAgICAgdm9pY2VOYXZpZ2F0aW9uOiB0cnVlLFxuICAgICAgICBzY3JlZW5SZWFkZXI6IGZhbHNlLFxuICAgICAgICBsYW5ndWFnZTogJ2VuJyxcbiAgICAgICAgdGltZXpvbmU6ICdBbWVyaWNhL05ld19Zb3JrJyxcbiAgICAgICAgbm90aWZpY2F0aW9uQ2hhbm5lbHM6IFsncHVzaCcsICdlbWFpbCddLFxuICAgICAgfSxcbiAgICAgIGRldmljZXM6IFtdLFxuICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgnMjAyNC0wMS0wMScpLFxuICAgICAgbGFzdEFjdGl2ZTogbmV3IERhdGUoKSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0hlYWx0aCBNb25pdG9yaW5nIEZsb3cnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZWNvcmQgdml0YWwgc2lnbnMgYW5kIGRldGVjdCBhbm9tYWxpZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHZpdGFsczoge1xuICAgICAgICAgICAgaGVhcnRSYXRlOiAxNTAsIC8vIEFibm9ybWFsIC0gc2hvdWxkIHRyaWdnZXIgYWxlcnRcbiAgICAgICAgICAgIGJsb29kUHJlc3N1cmU6IHsgc3lzdG9saWM6IDE4MCwgZGlhc3RvbGljOiAxMDAgfSwgLy8gSGlnaCBCUFxuICAgICAgICAgICAgdGVtcGVyYXR1cmU6IDk4LjYsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSksXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7XG4gICAgICAgICAgYXV0aG9yaXplcjoge1xuICAgICAgICAgICAgcHJpbmNpcGFsSWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgICB1c2VyVHlwZTogJ3ByaW1hcnknLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0gYXMgYW55LFxuICAgICAgfSBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVjb3JkVml0YWxTaWduc0hhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIFxuICAgICAgLy8gVmVyaWZ5IGFub21hbGllcyB3ZXJlIGRldGVjdGVkXG4gICAgICBleHBlY3QoYm9keS5hbm9tYWxpZXMpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoYm9keS5hbm9tYWxpZXMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgICBleHBlY3QoYm9keS5hbGVydFRyaWdnZXJlZCkudG9CZSh0cnVlKTtcbiAgICAgIFxuICAgICAgLy8gVmVyaWZ5IHZpdGFsIHNpZ25zIHdlcmUgc3RvcmVkXG4gICAgICBleHBlY3QobW9ja1dyaXRlVml0YWxTaWducykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgICAgICd1c2VyLTEyMycsXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICBoZWFydFJhdGU6IDE1MCxcbiAgICAgICAgICBzeXN0b2xpY0JQOiAxODAsXG4gICAgICAgICAgZGlhc3RvbGljQlA6IDEwMCxcbiAgICAgICAgfSksXG4gICAgICAgIGV4cGVjdC5hbnkoRGF0ZSksXG4gICAgICAgICdtYW51YWwnXG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZWNvcmQgbm9ybWFsIHZpdGFsIHNpZ25zIHdpdGhvdXQgdHJpZ2dlcmluZyBhbGVydHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHZpdGFsczoge1xuICAgICAgICAgICAgaGVhcnRSYXRlOiA3NSxcbiAgICAgICAgICAgIGJsb29kUHJlc3N1cmU6IHsgc3lzdG9saWM6IDEyMCwgZGlhc3RvbGljOiA4MCB9LFxuICAgICAgICAgICAgdGVtcGVyYXR1cmU6IDk4LjYsXG4gICAgICAgICAgICBveHlnZW5TYXR1cmF0aW9uOiA5OCxcbiAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHtcbiAgICAgICAgICBhdXRob3JpemVyOiB7XG4gICAgICAgICAgICBwcmluY2lwYWxJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgICAgIHVzZXJUeXBlOiAncHJpbWFyeScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSBhcyBhbnksXG4gICAgICB9IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByZWNvcmRWaXRhbFNpZ25zSGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgXG4gICAgICAvLyBWZXJpZnkgbm8gYW5vbWFsaWVzIGRldGVjdGVkXG4gICAgICBleHBlY3QoYm9keS5hbm9tYWxpZXMpLnRvQmVVbmRlZmluZWQoKTtcbiAgICAgIGV4cGVjdChib2R5LmFsZXJ0VHJpZ2dlcmVkKS50b0JlKGZhbHNlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0FsZXJ0IE1hbmFnZW1lbnQgRmxvdycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBhbiBhbGVydCBzdWNjZXNzZnVsbHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrQ3JlYXRlQWxlcnQubW9ja1Jlc29sdmVkVmFsdWUoJ2FsZXJ0LTEyMycpO1xuXG4gICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHVzZXJJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgICB0eXBlOiAndml0YWxfc2lnbnMnLFxuICAgICAgICAgIHNldmVyaXR5OiAnaGlnaCcsXG4gICAgICAgICAgbWVzc2FnZTogJ0hlYXJ0IHJhdGUgaXMgY3JpdGljYWxseSBoaWdoJyxcbiAgICAgICAgfSksXG4gICAgICB9IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjcmVhdGVBbGVydEhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIFxuICAgICAgZXhwZWN0KGJvZHkuYWxlcnRJZCkudG9CZSgnYWxlcnQtMTIzJyk7XG4gICAgICBleHBlY3QoYm9keS5tZXNzYWdlKS50b0JlKCdBbGVydCBjcmVhdGVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgXG4gICAgICAvLyBWZXJpZnkgYWxlcnQgd2FzIGNyZWF0ZWQgd2l0aCBjb3JyZWN0IGRhdGFcbiAgICAgIGV4cGVjdChtb2NrQ3JlYXRlQWxlcnQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgIHR5cGU6ICd2aXRhbF9zaWducycsXG4gICAgICAgICAgc2V2ZXJpdHk6ICdoaWdoJyxcbiAgICAgICAgICBtZXNzYWdlOiAnSGVhcnQgcmF0ZSBpcyBjcml0aWNhbGx5IGhpZ2gnLFxuICAgICAgICAgIGFja25vd2xlZGdlZDogZmFsc2UsXG4gICAgICAgICAgZXNjYWxhdGVkOiBmYWxzZSxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJldHJpZXZlIGFsZXJ0cyBmb3IgYSB1c2VyJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbW9ja0FsZXJ0cyA9IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnYWxlcnQtMScsXG4gICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgIHR5cGU6ICd2aXRhbF9zaWducycgYXMgY29uc3QsXG4gICAgICAgICAgc2V2ZXJpdHk6ICdoaWdoJyBhcyBjb25zdCxcbiAgICAgICAgICBtZXNzYWdlOiAnSGlnaCBoZWFydCByYXRlIGRldGVjdGVkJyxcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCcyMDI0LTAxLTE1VDEwOjAwOjAwWicpLFxuICAgICAgICAgIGFja25vd2xlZGdlZDogZmFsc2UsXG4gICAgICAgICAgZXNjYWxhdGVkOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnYWxlcnQtMicsXG4gICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgIHR5cGU6ICdtZWRpY2F0aW9uJyBhcyBjb25zdCxcbiAgICAgICAgICBzZXZlcml0eTogJ21lZGl1bScgYXMgY29uc3QsXG4gICAgICAgICAgbWVzc2FnZTogJ01lZGljYXRpb24gcmVtaW5kZXIgbWlzc2VkJyxcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCcyMDI0LTAxLTE1VDA5OjAwOjAwWicpLFxuICAgICAgICAgIGFja25vd2xlZGdlZDogdHJ1ZSxcbiAgICAgICAgICBlc2NhbGF0ZWQ6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgXTtcblxuICAgICAgbW9ja0dldEFsZXJ0c0J5VXNlci5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrQWxlcnRzKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgIHBhdGhQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICB9LFxuICAgICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IHtcbiAgICAgICAgICBsaW1pdDogJzEwJyxcbiAgICAgICAgfSxcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHtcbiAgICAgICAgICBhdXRob3JpemVyOiB7XG4gICAgICAgICAgICBwcmluY2lwYWxJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgICAgIHVzZXJUeXBlOiAncHJpbWFyeScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSBhcyBhbnksXG4gICAgICB9IGFzIGFueTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0QWxlcnRzSGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgXG4gICAgICBleHBlY3QoYm9keS5hbGVydHMpLnRvSGF2ZUxlbmd0aCgyKTtcbiAgICAgIGV4cGVjdChib2R5LmFsZXJ0c1swXS5pZCkudG9CZSgnYWxlcnQtMScpO1xuICAgICAgZXhwZWN0KGJvZHkuYWxlcnRzWzBdLmFja25vd2xlZGdlZCkudG9CZShmYWxzZSk7XG4gICAgICBleHBlY3QoYm9keS5hbGVydHNbMV0uYWNrbm93bGVkZ2VkKS50b0JlKHRydWUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB2YWxpZGF0ZSBhbGVydCBzZXZlcml0eScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgIHR5cGU6ICd2aXRhbF9zaWducycsXG4gICAgICAgICAgc2V2ZXJpdHk6ICdpbnZhbGlkLXNldmVyaXR5JyxcbiAgICAgICAgICBtZXNzYWdlOiAnVGVzdCBhbGVydCcsXG4gICAgICAgIH0pLFxuICAgICAgfSBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlQWxlcnRIYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICBleHBlY3QoYm9keS5lcnJvcikudG9Db250YWluKCdJbnZhbGlkIHNldmVyaXR5Jyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIGFsZXJ0IHR5cGUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHVzZXJJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgICB0eXBlOiAnaW52YWxpZC10eXBlJyxcbiAgICAgICAgICBzZXZlcml0eTogJ2hpZ2gnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdUZXN0IGFsZXJ0JyxcbiAgICAgICAgfSksXG4gICAgICB9IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjcmVhdGVBbGVydEhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5LmVycm9yKS50b0NvbnRhaW4oJ0ludmFsaWQgYWxlcnQgdHlwZScpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnRW5kLXRvLUVuZCBIZWFsdGggTW9uaXRvcmluZyBhbmQgQWxlcnQgRmxvdycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJlY29yZCBhYm5vcm1hbCB2aXRhbHMgYW5kIGNyZWF0ZSBhbGVydCcsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tDcmVhdGVBbGVydC5tb2NrUmVzb2x2ZWRWYWx1ZSgnYWxlcnQtNDU2Jyk7XG5cbiAgICAgIC8vIFN0ZXAgMTogUmVjb3JkIGFibm9ybWFsIHZpdGFsIHNpZ25zXG4gICAgICBjb25zdCByZWNvcmRFdmVudCA9IHtcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHZpdGFsczoge1xuICAgICAgICAgICAgaGVhcnRSYXRlOiAxODAsIC8vIENyaXRpY2FsXG4gICAgICAgICAgICBveHlnZW5TYXR1cmF0aW9uOiA4OCwgLy8gTG93XG4gICAgICAgICAgfSxcbiAgICAgICAgfSksXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7XG4gICAgICAgICAgYXV0aG9yaXplcjoge1xuICAgICAgICAgICAgcHJpbmNpcGFsSWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgICB1c2VyVHlwZTogJ3ByaW1hcnknLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0gYXMgYW55LFxuICAgICAgfSBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcblxuICAgICAgY29uc3QgcmVjb3JkUmVzdWx0ID0gYXdhaXQgcmVjb3JkVml0YWxTaWduc0hhbmRsZXIocmVjb3JkRXZlbnQpO1xuICAgICAgZXhwZWN0KHJlY29yZFJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlY29yZEJvZHkgPSBKU09OLnBhcnNlKHJlY29yZFJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChyZWNvcmRCb2R5LmFsZXJ0VHJpZ2dlcmVkKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KHJlY29yZEJvZHkuYW5vbWFsaWVzLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xuXG4gICAgICAvLyBTdGVwIDI6IENyZWF0ZSBhbGVydCBiYXNlZCBvbiBhbm9tYWxpZXNcbiAgICAgIGNvbnN0IGNyZWF0ZUFsZXJ0RXZlbnQgPSB7XG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgICAgdHlwZTogJ3ZpdGFsX3NpZ25zJyxcbiAgICAgICAgICBzZXZlcml0eTogJ2NyaXRpY2FsJyxcbiAgICAgICAgICBtZXNzYWdlOiAnQ3JpdGljYWwgdml0YWwgc2lnbnMgZGV0ZWN0ZWQ6IEhpZ2ggaGVhcnQgcmF0ZSBhbmQgbG93IG94eWdlbiBzYXR1cmF0aW9uJyxcbiAgICAgICAgICByZWxhdGVkRGF0YToge1xuICAgICAgICAgICAgYW5vbWFsaWVzOiByZWNvcmRCb2R5LmFub21hbGllcyxcbiAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgIH0gYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQ7XG5cbiAgICAgIGNvbnN0IGFsZXJ0UmVzdWx0ID0gYXdhaXQgY3JlYXRlQWxlcnRIYW5kbGVyKGNyZWF0ZUFsZXJ0RXZlbnQpO1xuICAgICAgZXhwZWN0KGFsZXJ0UmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIFxuICAgICAgY29uc3QgYWxlcnRCb2R5ID0gSlNPTi5wYXJzZShhbGVydFJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChhbGVydEJvZHkuYWxlcnRJZCkudG9CZSgnYWxlcnQtNDU2Jyk7XG5cbiAgICAgIC8vIFZlcmlmeSBhdWRpdCBsb2dnaW5nIG9jY3VycmVkXG4gICAgICBleHBlY3QobW9ja0xvZ0RhdGFBY2Nlc3MpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICAgIGV4cGVjdChtb2NrTG9nQXVkaXRFdmVudCkudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19