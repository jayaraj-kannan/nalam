"use strict";
// Unit tests for Record Vital Signs Lambda function
// Requirements: 1.1, 1.4 - Test vital signs recording with validation
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
const timestreamClient = __importStar(require("../../shared/timestream-client"));
const auditLogger = __importStar(require("../../shared/audit-logger"));
const usersDataAccess = __importStar(require("../../shared/data-access/users"));
// Mock dependencies
jest.mock('../../shared/timestream-client');
jest.mock('../../shared/audit-logger');
jest.mock('../../shared/data-access/users');
describe('Record Vital Signs Lambda', () => {
    const mockWriteVitalSigns = timestreamClient.writeVitalSigns;
    const mockLogDataAccess = auditLogger.logDataAccess;
    const mockGetUser = usersDataAccess.getUser;
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
    const createMockEvent = (body, userId = 'user-123') => ({
        body: JSON.stringify(body),
        requestContext: {
            authorizer: {
                principalId: userId,
                userType: 'primary',
            },
        },
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
            const result = await (0, record_vital_signs_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Vital signs recorded successfully');
            expect(body.vitals.heartRate).toBe(75);
            expect(body.vitals.bloodPressure.systolic).toBe(120);
            expect(mockWriteVitalSigns).toHaveBeenCalledWith('user-123', expect.objectContaining({
                heartRate: 75,
                systolicBP: 120,
                diastolicBP: 80,
                temperature: 98.6,
                oxygenSaturation: 98,
                weight: 170,
            }), expect.any(Date), 'manual');
        });
        it('should record partial vital signs', async () => {
            const event = createMockEvent({
                vitals: {
                    heartRate: 72,
                    temperature: 98.2,
                },
            });
            const result = await (0, record_vital_signs_1.handler)(event);
            expect(result.statusCode).toBe(200);
            expect(mockWriteVitalSigns).toHaveBeenCalledWith('user-123', expect.objectContaining({
                heartRate: 72,
                temperature: 98.2,
            }), expect.any(Date), 'manual');
        });
        it('should mark source as device when deviceId is provided', async () => {
            const event = createMockEvent({
                vitals: {
                    heartRate: 75,
                },
                deviceId: 'device-456',
            });
            const result = await (0, record_vital_signs_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.vitals.source).toBe('device');
            expect(mockWriteVitalSigns).toHaveBeenCalledWith('user-123', expect.any(Object), expect.any(Date), 'device');
        });
    });
    describe('Validation errors', () => {
        it('should reject heart rate below minimum', async () => {
            const event = createMockEvent({
                vitals: {
                    heartRate: 30,
                },
            });
            const result = await (0, record_vital_signs_1.handler)(event);
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
            const result = await (0, record_vital_signs_1.handler)(event);
            expect(result.statusCode).toBe(400);
            expect(mockWriteVitalSigns).not.toHaveBeenCalled();
        });
        it('should reject invalid blood pressure', async () => {
            const event = createMockEvent({
                vitals: {
                    bloodPressure: { systolic: 250, diastolic: 150 },
                },
            });
            const result = await (0, record_vital_signs_1.handler)(event);
            expect(result.statusCode).toBe(400);
            expect(mockWriteVitalSigns).not.toHaveBeenCalled();
        });
        it('should reject invalid temperature', async () => {
            const event = createMockEvent({
                vitals: {
                    temperature: 110,
                },
            });
            const result = await (0, record_vital_signs_1.handler)(event);
            expect(result.statusCode).toBe(400);
            expect(mockWriteVitalSigns).not.toHaveBeenCalled();
        });
        it('should reject invalid oxygen saturation', async () => {
            const event = createMockEvent({
                vitals: {
                    oxygenSaturation: 50,
                },
            });
            const result = await (0, record_vital_signs_1.handler)(event);
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
            const result = await (0, record_vital_signs_1.handler)(event);
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
            const result = await (0, record_vital_signs_1.handler)(event);
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
                requestContext: {},
            };
            const result = await (0, record_vital_signs_1.handler)(event);
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
                },
            };
            const result = await (0, record_vital_signs_1.handler)(event);
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
                },
            };
            const result = await (0, record_vital_signs_1.handler)(event);
            expect(result.statusCode).toBe(400);
            expect(mockWriteVitalSigns).not.toHaveBeenCalled();
        });
        it('should reject missing vitals data', async () => {
            const event = createMockEvent({});
            const result = await (0, record_vital_signs_1.handler)(event);
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
            await (0, record_vital_signs_1.handler)(event);
            expect(mockLogDataAccess).toHaveBeenCalledWith('user-123', 'primary', 'user-123', 'vitals', 'write', true, ['vitals'], expect.objectContaining({
                source: 'manual',
                anomaliesDetected: false,
                alertTriggered: false,
            }));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb3JkLXZpdGFsLXNpZ25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWNvcmQtdml0YWwtc2lnbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0RBQW9EO0FBQ3BELHNFQUFzRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHdEUsOERBQWdEO0FBQ2hELGlGQUFtRTtBQUNuRSx1RUFBeUQ7QUFDekQsZ0ZBQWtFO0FBRWxFLG9CQUFvQjtBQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDNUMsSUFBSSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQ3ZDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUU1QyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLE1BQU0sbUJBQW1CLEdBQUcsZ0JBQWdCLENBQUMsZUFBK0UsQ0FBQztJQUM3SCxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxhQUFzRSxDQUFDO0lBQzdHLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxPQUE4RCxDQUFDO0lBRW5HLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDckIsbUJBQW1CLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDL0MsV0FBVyxDQUFDLGlCQUFpQixDQUFDO1lBQzVCLEVBQUUsRUFBRSxVQUFVO1lBQ2QsT0FBTyxFQUFFO2dCQUNQLFNBQVMsRUFBRSxNQUFNO2dCQUNqQixRQUFRLEVBQUUsS0FBSztnQkFDZixLQUFLLEVBQUUsa0JBQWtCO2dCQUN6QixLQUFLLEVBQUUsVUFBVTtnQkFDakIsV0FBVyxFQUFFLFlBQVk7YUFDMUI7WUFDRCxhQUFhLEVBQUU7Z0JBQ2Is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YUFDRixDQUFDLENBQUM7WUFFSCxNQUFNLElBQUEsNEJBQU8sRUFBQyxLQUE2QixDQUFDLENBQUM7WUFFN0MsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsb0JBQW9CLENBQzVDLFVBQVUsRUFDVixTQUFTLEVBQ1QsVUFBVSxFQUNWLFFBQVEsRUFDUixPQUFPLEVBQ1AsSUFBSSxFQUNKLENBQUMsUUFBUSxDQUFDLEVBQ1YsTUFBTSxDQUFDLGdCQUFnQixDQUFDO2dCQUN0QixNQUFNLEVBQUUsUUFBUTtnQkFDaEIsaUJBQWlCLEVBQUUsS0FBSztnQkFDeEIsY0FBYyxFQUFFLEtBQUs7YUFDdEIsQ0FBQyxDQUNILENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBVbml0IHRlc3RzIGZvciBSZWNvcmQgVml0YWwgU2lnbnMgTGFtYmRhIGZ1bmN0aW9uXG4vLyBSZXF1aXJlbWVudHM6IDEuMSwgMS40IC0gVGVzdCB2aXRhbCBzaWducyByZWNvcmRpbmcgd2l0aCB2YWxpZGF0aW9uXG5cbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBoYW5kbGVyIH0gZnJvbSAnLi4vcmVjb3JkLXZpdGFsLXNpZ25zJztcbmltcG9ydCAqIGFzIHRpbWVzdHJlYW1DbGllbnQgZnJvbSAnLi4vLi4vc2hhcmVkL3RpbWVzdHJlYW0tY2xpZW50JztcbmltcG9ydCAqIGFzIGF1ZGl0TG9nZ2VyIGZyb20gJy4uLy4uL3NoYXJlZC9hdWRpdC1sb2dnZXInO1xuaW1wb3J0ICogYXMgdXNlcnNEYXRhQWNjZXNzIGZyb20gJy4uLy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy91c2Vycyc7XG5cbi8vIE1vY2sgZGVwZW5kZW5jaWVzXG5qZXN0Lm1vY2soJy4uLy4uL3NoYXJlZC90aW1lc3RyZWFtLWNsaWVudCcpO1xuamVzdC5tb2NrKCcuLi8uLi9zaGFyZWQvYXVkaXQtbG9nZ2VyJyk7XG5qZXN0Lm1vY2soJy4uLy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy91c2VycycpO1xuXG5kZXNjcmliZSgnUmVjb3JkIFZpdGFsIFNpZ25zIExhbWJkYScsICgpID0+IHtcbiAgY29uc3QgbW9ja1dyaXRlVml0YWxTaWducyA9IHRpbWVzdHJlYW1DbGllbnQud3JpdGVWaXRhbFNpZ25zIGFzIGplc3QuTW9ja2VkRnVuY3Rpb248dHlwZW9mIHRpbWVzdHJlYW1DbGllbnQud3JpdGVWaXRhbFNpZ25zPjtcbiAgY29uc3QgbW9ja0xvZ0RhdGFBY2Nlc3MgPSBhdWRpdExvZ2dlci5sb2dEYXRhQWNjZXNzIGFzIGplc3QuTW9ja2VkRnVuY3Rpb248dHlwZW9mIGF1ZGl0TG9nZ2VyLmxvZ0RhdGFBY2Nlc3M+O1xuICBjb25zdCBtb2NrR2V0VXNlciA9IHVzZXJzRGF0YUFjY2Vzcy5nZXRVc2VyIGFzIGplc3QuTW9ja2VkRnVuY3Rpb248dHlwZW9mIHVzZXJzRGF0YUFjY2Vzcy5nZXRVc2VyPjtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcbiAgICBtb2NrV3JpdGVWaXRhbFNpZ25zLm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XG4gICAgbW9ja0xvZ0RhdGFBY2Nlc3MubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcbiAgICBtb2NrR2V0VXNlci5tb2NrUmVzb2x2ZWRWYWx1ZSh7XG4gICAgICBpZDogJ3VzZXItMTIzJyxcbiAgICAgIHByb2ZpbGU6IHtcbiAgICAgICAgZmlyc3ROYW1lOiAnSm9obicsXG4gICAgICAgIGxhc3ROYW1lOiAnRG9lJyxcbiAgICAgICAgZW1haWw6ICdqb2huQGV4YW1wbGUuY29tJyxcbiAgICAgICAgcGhvbmU6ICc1NTUtMDEwMCcsXG4gICAgICAgIGRhdGVPZkJpcnRoOiAnMTk1MC0wMS0wMScsXG4gICAgICB9LFxuICAgICAgaGVhbHRoUHJvZmlsZToge1xuICAgICAgICBjb25kaXRpb25zOiBbXSxcbiAgICAgICAgbWVkaWNhdGlvbnM6IFtdLFxuICAgICAgICBhbGxlcmdpZXM6IFtdLFxuICAgICAgICBlbWVyZ2VuY3lDb250YWN0czogW10sXG4gICAgICAgIGhlYWx0aGNhcmVQcm92aWRlcnM6IFtdLFxuICAgICAgICBiYXNlbGluZVZpdGFsczoge1xuICAgICAgICAgIGhlYXJ0UmF0ZTogeyBtaW46IDYwLCBtYXg6IDEwMCB9LFxuICAgICAgICAgIGJsb29kUHJlc3N1cmU6IHtcbiAgICAgICAgICAgIHN5c3RvbGljOiB7IG1pbjogOTAsIG1heDogMTQwIH0sXG4gICAgICAgICAgICBkaWFzdG9saWM6IHsgbWluOiA2MCwgbWF4OiA5MCB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgdGVtcGVyYXR1cmU6IHsgbWluOiA5Ny4wLCBtYXg6IDk5LjUgfSxcbiAgICAgICAgICBveHlnZW5TYXR1cmF0aW9uOiB7IG1pbjogOTUsIG1heDogMTAwIH0sXG4gICAgICAgICAgd2VpZ2h0OiB7IG1pbjogMTUwLCBtYXg6IDIwMCB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGNhcmVDaXJjbGU6IFtdLFxuICAgICAgcHJlZmVyZW5jZXM6IHtcbiAgICAgICAgZm9udFNpemU6ICdsYXJnZScsXG4gICAgICAgIGNvbnRyYXN0OiAnaGlnaCcsXG4gICAgICAgIHZvaWNlTmF2aWdhdGlvbjogdHJ1ZSxcbiAgICAgICAgc2NyZWVuUmVhZGVyOiBmYWxzZSxcbiAgICAgICAgbGFuZ3VhZ2U6ICdlbicsXG4gICAgICAgIHRpbWV6b25lOiAnQW1lcmljYS9OZXdfWW9yaycsXG4gICAgICAgIG5vdGlmaWNhdGlvbkNoYW5uZWxzOiBbJ3B1c2gnLCAnZW1haWwnXSxcbiAgICAgIH0sXG4gICAgICBkZXZpY2VzOiBbXSxcbiAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoJzIwMjQtMDEtMDEnKSxcbiAgICAgIGxhc3RBY3RpdmU6IG5ldyBEYXRlKCksXG4gICAgfSk7XG4gIH0pO1xuXG4gIGNvbnN0IGNyZWF0ZU1vY2tFdmVudCA9IChib2R5OiBhbnksIHVzZXJJZDogc3RyaW5nID0gJ3VzZXItMTIzJyk6IFBhcnRpYWw8QVBJR2F0ZXdheVByb3h5RXZlbnQ+ID0+ICh7XG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSksXG4gICAgcmVxdWVzdENvbnRleHQ6IHtcbiAgICAgIGF1dGhvcml6ZXI6IHtcbiAgICAgICAgcHJpbmNpcGFsSWQ6IHVzZXJJZCxcbiAgICAgICAgdXNlclR5cGU6ICdwcmltYXJ5JyxcbiAgICAgIH0sXG4gICAgfSBhcyBhbnksXG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdTdWNjZXNzZnVsIHZpdGFsIHNpZ25zIHJlY29yZGluZycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJlY29yZCB2YWxpZCB2aXRhbCBzaWducyB3aXRoIGFsbCBtZXRyaWNzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoe1xuICAgICAgICB2aXRhbHM6IHtcbiAgICAgICAgICBoZWFydFJhdGU6IDc1LFxuICAgICAgICAgIGJsb29kUHJlc3N1cmU6IHsgc3lzdG9saWM6IDEyMCwgZGlhc3RvbGljOiA4MCB9LFxuICAgICAgICAgIHRlbXBlcmF0dXJlOiA5OC42LFxuICAgICAgICAgIG94eWdlblNhdHVyYXRpb246IDk4LFxuICAgICAgICAgIHdlaWdodDogMTcwLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5Lm1lc3NhZ2UpLnRvQmUoJ1ZpdGFsIHNpZ25zIHJlY29yZGVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgZXhwZWN0KGJvZHkudml0YWxzLmhlYXJ0UmF0ZSkudG9CZSg3NSk7XG4gICAgICBleHBlY3QoYm9keS52aXRhbHMuYmxvb2RQcmVzc3VyZS5zeXN0b2xpYykudG9CZSgxMjApO1xuICAgICAgZXhwZWN0KG1vY2tXcml0ZVZpdGFsU2lnbnMpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICAgICAndXNlci0xMjMnLFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgaGVhcnRSYXRlOiA3NSxcbiAgICAgICAgICBzeXN0b2xpY0JQOiAxMjAsXG4gICAgICAgICAgZGlhc3RvbGljQlA6IDgwLFxuICAgICAgICAgIHRlbXBlcmF0dXJlOiA5OC42LFxuICAgICAgICAgIG94eWdlblNhdHVyYXRpb246IDk4LFxuICAgICAgICAgIHdlaWdodDogMTcwLFxuICAgICAgICB9KSxcbiAgICAgICAgZXhwZWN0LmFueShEYXRlKSxcbiAgICAgICAgJ21hbnVhbCdcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlY29yZCBwYXJ0aWFsIHZpdGFsIHNpZ25zJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoe1xuICAgICAgICB2aXRhbHM6IHtcbiAgICAgICAgICBoZWFydFJhdGU6IDcyLFxuICAgICAgICAgIHRlbXBlcmF0dXJlOiA5OC4yLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGV4cGVjdChtb2NrV3JpdGVWaXRhbFNpZ25zKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICAgICAgJ3VzZXItMTIzJyxcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAgIGhlYXJ0UmF0ZTogNzIsXG4gICAgICAgICAgdGVtcGVyYXR1cmU6IDk4LjIsXG4gICAgICAgIH0pLFxuICAgICAgICBleHBlY3QuYW55KERhdGUpLFxuICAgICAgICAnbWFudWFsJ1xuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgbWFyayBzb3VyY2UgYXMgZGV2aWNlIHdoZW4gZGV2aWNlSWQgaXMgcHJvdmlkZWQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCh7XG4gICAgICAgIHZpdGFsczoge1xuICAgICAgICAgIGhlYXJ0UmF0ZTogNzUsXG4gICAgICAgIH0sXG4gICAgICAgIGRldmljZUlkOiAnZGV2aWNlLTQ1NicsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkudml0YWxzLnNvdXJjZSkudG9CZSgnZGV2aWNlJyk7XG4gICAgICBleHBlY3QobW9ja1dyaXRlVml0YWxTaWducykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgICAgICd1c2VyLTEyMycsXG4gICAgICAgIGV4cGVjdC5hbnkoT2JqZWN0KSxcbiAgICAgICAgZXhwZWN0LmFueShEYXRlKSxcbiAgICAgICAgJ2RldmljZSdcbiAgICAgICk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdWYWxpZGF0aW9uIGVycm9ycycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJlamVjdCBoZWFydCByYXRlIGJlbG93IG1pbmltdW0nLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCh7XG4gICAgICAgIHZpdGFsczoge1xuICAgICAgICAgIGhlYXJ0UmF0ZTogMzAsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDApO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkuZXJyb3IpLnRvQ29udGFpbignSGVhcnQgcmF0ZSBtdXN0IGJlIGJldHdlZW4nKTtcbiAgICAgIGV4cGVjdChtb2NrV3JpdGVWaXRhbFNpZ25zKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZWplY3QgaGVhcnQgcmF0ZSBhYm92ZSBtYXhpbXVtJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoe1xuICAgICAgICB2aXRhbHM6IHtcbiAgICAgICAgICBoZWFydFJhdGU6IDI1MCxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XG4gICAgICBleHBlY3QobW9ja1dyaXRlVml0YWxTaWducykubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVqZWN0IGludmFsaWQgYmxvb2QgcHJlc3N1cmUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCh7XG4gICAgICAgIHZpdGFsczoge1xuICAgICAgICAgIGJsb29kUHJlc3N1cmU6IHsgc3lzdG9saWM6IDI1MCwgZGlhc3RvbGljOiAxNTAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XG4gICAgICBleHBlY3QobW9ja1dyaXRlVml0YWxTaWducykubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVqZWN0IGludmFsaWQgdGVtcGVyYXR1cmUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCh7XG4gICAgICAgIHZpdGFsczoge1xuICAgICAgICAgIHRlbXBlcmF0dXJlOiAxMTAsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDApO1xuICAgICAgZXhwZWN0KG1vY2tXcml0ZVZpdGFsU2lnbnMpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCBpbnZhbGlkIG94eWdlbiBzYXR1cmF0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoe1xuICAgICAgICB2aXRhbHM6IHtcbiAgICAgICAgICBveHlnZW5TYXR1cmF0aW9uOiA1MCxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XG4gICAgICBleHBlY3QobW9ja1dyaXRlVml0YWxTaWducykubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0Fub21hbHkgZGV0ZWN0aW9uJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZGV0ZWN0IGFub21hbGllcyBpbiB2aXRhbCBzaWducycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KHtcbiAgICAgICAgdml0YWxzOiB7XG4gICAgICAgICAgaGVhcnRSYXRlOiAxNTAsIC8vIEFib3ZlIG5vcm1hbCByYW5nZVxuICAgICAgICAgIGJsb29kUHJlc3N1cmU6IHsgc3lzdG9saWM6IDE4MCwgZGlhc3RvbGljOiAxMDAgfSwgLy8gSGlnaCBibG9vZCBwcmVzc3VyZVxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5LmFub21hbGllcykudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChib2R5LmFub21hbGllcy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICAgIGV4cGVjdChib2R5LmFsZXJ0VHJpZ2dlcmVkKS50b0JlKHRydWUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBub3QgdHJpZ2dlciBhbGVydCBmb3Igbm9ybWFsIHZpdGFscycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KHtcbiAgICAgICAgdml0YWxzOiB7XG4gICAgICAgICAgaGVhcnRSYXRlOiA3NSxcbiAgICAgICAgICBibG9vZFByZXNzdXJlOiB7IHN5c3RvbGljOiAxMjAsIGRpYXN0b2xpYzogODAgfSxcbiAgICAgICAgICB0ZW1wZXJhdHVyZTogOTguNixcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICBleHBlY3QoYm9keS5hbm9tYWxpZXMpLnRvQmVVbmRlZmluZWQoKTtcbiAgICAgIGV4cGVjdChib2R5LmFsZXJ0VHJpZ2dlcmVkKS50b0JlKGZhbHNlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0F1dGhvcml6YXRpb24nLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZWplY3QgcmVxdWVzdHMgd2l0aG91dCB1c2VyIGNvbnRleHQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyB2aXRhbHM6IHsgaGVhcnRSYXRlOiA3NSB9IH0pLFxuICAgICAgICByZXF1ZXN0Q29udGV4dDoge30gYXMgYW55LFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDEpO1xuICAgICAgZXhwZWN0KG1vY2tXcml0ZVZpdGFsU2lnbnMpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCBzZWNvbmRhcnkgdXNlcnMgZnJvbSByZWNvcmRpbmcgdml0YWxzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdml0YWxzOiB7IGhlYXJ0UmF0ZTogNzUgfSB9KSxcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHtcbiAgICAgICAgICBhdXRob3JpemVyOiB7XG4gICAgICAgICAgICBwcmluY2lwYWxJZDogJ3NlY29uZGFyeS11c2VyLTEyMycsXG4gICAgICAgICAgICB1c2VyVHlwZTogJ3NlY29uZGFyeScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSBhcyBhbnksXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMyk7XG4gICAgICBleHBlY3QobW9ja1dyaXRlVml0YWxTaWducykubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0lucHV0IHZhbGlkYXRpb24nLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZWplY3QgbWlzc2luZyByZXF1ZXN0IGJvZHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHtcbiAgICAgICAgICBhdXRob3JpemVyOiB7XG4gICAgICAgICAgICBwcmluY2lwYWxJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgICAgIHVzZXJUeXBlOiAncHJpbWFyeScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSBhcyBhbnksXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XG4gICAgICBleHBlY3QobW9ja1dyaXRlVml0YWxTaWducykubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVqZWN0IG1pc3Npbmcgdml0YWxzIGRhdGEnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcbiAgICAgIGV4cGVjdChtb2NrV3JpdGVWaXRhbFNpZ25zKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQXVkaXQgbG9nZ2luZycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGxvZyBzdWNjZXNzZnVsIGRhdGEgYWNjZXNzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoe1xuICAgICAgICB2aXRhbHM6IHtcbiAgICAgICAgICBoZWFydFJhdGU6IDc1LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xuXG4gICAgICBleHBlY3QobW9ja0xvZ0RhdGFBY2Nlc3MpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICAgICAndXNlci0xMjMnLFxuICAgICAgICAncHJpbWFyeScsXG4gICAgICAgICd1c2VyLTEyMycsXG4gICAgICAgICd2aXRhbHMnLFxuICAgICAgICAnd3JpdGUnLFxuICAgICAgICB0cnVlLFxuICAgICAgICBbJ3ZpdGFscyddLFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgc291cmNlOiAnbWFudWFsJyxcbiAgICAgICAgICBhbm9tYWxpZXNEZXRlY3RlZDogZmFsc2UsXG4gICAgICAgICAgYWxlcnRUcmlnZ2VyZWQ6IGZhbHNlLFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==