"use strict";
// Audit Logger Unit Tests
// Requirements: 8.4 - Test audit logging functionality
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
const audit_logger_1 = require("../audit-logger");
const dynamodbClient = __importStar(require("../dynamodb-client"));
// Mock dependencies
jest.mock('../dynamodb-client');
jest.mock('@aws-sdk/client-cloudwatch-logs');
const mockPutItem = dynamodbClient.putItem;
describe('Audit Logger', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPutItem.mockResolvedValue();
    });
    describe('logAuditEvent', () => {
        it('should log audit event to DynamoDB', async () => {
            const event = {
                eventType: 'DATA_ACCESS',
                userId: 'user-123',
                userType: 'primary',
                resource: '/api/health/vitals',
                action: 'read',
                timestamp: '2024-01-15T12:00:00Z',
                success: true,
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
            };
            await (0, audit_logger_1.logAuditEvent)(event);
            expect(mockPutItem).toHaveBeenCalledWith('audit-logs', expect.objectContaining({
                eventType: 'DATA_ACCESS',
                userId: 'user-123',
                userType: 'primary',
                resource: '/api/health/vitals',
                action: 'read',
                timestamp: '2024-01-15T12:00:00Z',
                success: true,
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
                ttl: expect.any(Number),
            }));
        });
        it('should not throw error if logging fails', async () => {
            mockPutItem.mockRejectedValue(new Error('DynamoDB error'));
            const event = {
                eventType: 'DATA_ACCESS',
                userId: 'user-123',
                userType: 'primary',
                timestamp: '2024-01-15T12:00:00Z',
                success: true,
            };
            await expect((0, audit_logger_1.logAuditEvent)(event)).resolves.not.toThrow();
        });
        it('should set TTL to 7 years for HIPAA compliance', async () => {
            const event = {
                eventType: 'DATA_ACCESS',
                userId: 'user-123',
                userType: 'primary',
                timestamp: '2024-01-15T12:00:00Z',
                success: true,
            };
            const now = Date.now();
            await (0, audit_logger_1.logAuditEvent)(event);
            const sevenYearsInSeconds = 7 * 365 * 24 * 60 * 60;
            const expectedTTL = Math.floor(now / 1000) + sevenYearsInSeconds;
            expect(mockPutItem).toHaveBeenCalledWith('audit-logs', expect.objectContaining({
                ttl: expect.any(Number),
            }));
            const actualTTL = mockPutItem.mock.calls[0][1].ttl;
            expect(actualTTL).toBeGreaterThanOrEqual(expectedTTL - 10);
            expect(actualTTL).toBeLessThanOrEqual(expectedTTL + 10);
        });
    });
    describe('logDataAccess', () => {
        it('should log data access event with correct structure', async () => {
            await (0, audit_logger_1.logDataAccess)('user-123', 'secondary', 'primary-456', 'vitals', 'read', true, ['canViewVitals'], { relationship: 'child' });
            expect(mockPutItem).toHaveBeenCalledWith('audit-logs', expect.objectContaining({
                eventType: 'DATA_ACCESS',
                userId: 'user-123',
                userType: 'secondary',
                targetUserId: 'primary-456',
                dataType: 'vitals',
                action: 'read',
                success: true,
                permissionsChecked: ['canViewVitals'],
                relationship: 'child',
                timestamp: expect.any(String),
            }));
        });
        it('should log failed data access attempts', async () => {
            await (0, audit_logger_1.logDataAccess)('user-123', 'secondary', 'primary-456', 'healthRecords', 'read', false, ['canViewHealthRecords'], { reason: 'Insufficient permissions' });
            expect(mockPutItem).toHaveBeenCalledWith('audit-logs', expect.objectContaining({
                success: false,
                reason: 'Insufficient permissions',
            }));
        });
    });
    describe('logPermissionChange', () => {
        it('should log permission changes with old and new values', async () => {
            const oldPermissions = {
                canViewVitals: true,
                canViewMedications: false,
            };
            const newPermissions = {
                canViewVitals: true,
                canViewMedications: true,
            };
            await (0, audit_logger_1.logPermissionChange)('primary-123', 'primary', 'secondary-456', 'primary-123', oldPermissions, newPermissions, { relationship: 'child' });
            expect(mockPutItem).toHaveBeenCalledWith('audit-logs', expect.objectContaining({
                eventType: 'PERMISSION_CHANGE',
                userId: 'primary-123',
                userType: 'primary',
                targetUserId: 'secondary-456',
                success: true,
                dataAccessed: [
                    `Old: ${JSON.stringify(oldPermissions)}`,
                    `New: ${JSON.stringify(newPermissions)}`,
                    'Primary: primary-123',
                ],
                relationship: 'child',
                timestamp: expect.any(String),
            }));
        });
    });
    describe('logCareCircleAccess', () => {
        it('should log care circle access events', async () => {
            await (0, audit_logger_1.logCareCircleAccess)('secondary-456', 'primary-123', 'view-dashboard', true, ['canViewVitals', 'canViewMedications'], { dataViewed: ['vitals', 'medications'] });
            expect(mockPutItem).toHaveBeenCalledWith('audit-logs', expect.objectContaining({
                eventType: 'CARE_CIRCLE_ACCESS',
                userId: 'secondary-456',
                userType: 'secondary',
                targetUserId: 'primary-123',
                action: 'view-dashboard',
                success: true,
                permissionsChecked: ['canViewVitals', 'canViewMedications'],
                dataViewed: ['vitals', 'medications'],
                timestamp: expect.any(String),
            }));
        });
        it('should log failed care circle access attempts', async () => {
            await (0, audit_logger_1.logCareCircleAccess)('secondary-456', 'primary-123', 'view-health-records', false, ['canViewHealthRecords'], { reason: 'Permission denied' });
            expect(mockPutItem).toHaveBeenCalledWith('audit-logs', expect.objectContaining({
                success: false,
                reason: 'Permission denied',
            }));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXVkaXQtbG9nZ2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhdWRpdC1sb2dnZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsMEJBQTBCO0FBQzFCLHVEQUF1RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFdkQsa0RBTXlCO0FBQ3pCLG1FQUFxRDtBQUdyRCxvQkFBb0I7QUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQUU3QyxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsT0FBNkQsQ0FBQztBQUVqRyxRQUFRLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUM1QixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3JCLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQ2xDLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDN0IsRUFBRSxDQUFDLG9DQUFvQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2xELE1BQU0sS0FBSyxHQUFlO2dCQUN4QixTQUFTLEVBQUUsYUFBYTtnQkFDeEIsTUFBTSxFQUFFLFVBQVU7Z0JBQ2xCLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixRQUFRLEVBQUUsb0JBQW9CO2dCQUM5QixNQUFNLEVBQUUsTUFBTTtnQkFDZCxTQUFTLEVBQUUsc0JBQXNCO2dCQUNqQyxPQUFPLEVBQUUsSUFBSTtnQkFDYixTQUFTLEVBQUUsYUFBYTtnQkFDeEIsU0FBUyxFQUFFLGFBQWE7YUFDekIsQ0FBQztZQUVGLE1BQU0sSUFBQSw0QkFBYSxFQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxvQkFBb0IsQ0FDdEMsWUFBWSxFQUNaLE1BQU0s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RUFBRSxvQkFBb0I7Z0JBQy9CLE1BQU0sRUFBRSxlQUFlO2dCQUN2QixRQUFRLEVBQUUsV0FBVztnQkFDckIsWUFBWSxFQUFFLGFBQWE7Z0JBQzNCLE1BQU0sRUFBRSxnQkFBZ0I7Z0JBQ3hCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLGtCQUFrQixFQUFFLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDO2dCQUMzRCxVQUFVLEVBQUUsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDO2dCQUNyQyxTQUFTLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7YUFDOUIsQ0FBQyxDQUNILENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3RCxNQUFNLElBQUEsa0NBQW1CLEVBQ3ZCLGVBQWUsRUFDZixhQUFhLEVBQ2IscUJBQXFCLEVBQ3JCLEtBQUssRUFDTCxDQUFDLHNCQUFzQixDQUFDLEVBQ3hCLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixFQUFFLENBQ2hDLENBQUM7WUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsb0JBQW9CLENBQ3RDLFlBQVksRUFDWixNQUFNLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ3RCLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE1BQU0sRUFBRSxtQkFBbUI7YUFDNUIsQ0FBQyxDQUNILENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBBdWRpdCBMb2dnZXIgVW5pdCBUZXN0c1xuLy8gUmVxdWlyZW1lbnRzOiA4LjQgLSBUZXN0IGF1ZGl0IGxvZ2dpbmcgZnVuY3Rpb25hbGl0eVxuXG5pbXBvcnQge1xuICBsb2dBdWRpdEV2ZW50LFxuICBsb2dEYXRhQWNjZXNzLFxuICBsb2dQZXJtaXNzaW9uQ2hhbmdlLFxuICBsb2dDYXJlQ2lyY2xlQWNjZXNzLFxuICBBdWRpdEV2ZW50LFxufSBmcm9tICcuLi9hdWRpdC1sb2dnZXInO1xuaW1wb3J0ICogYXMgZHluYW1vZGJDbGllbnQgZnJvbSAnLi4vZHluYW1vZGItY2xpZW50JztcbmltcG9ydCB7IENsb3VkV2F0Y2hMb2dzQ2xpZW50LCBQdXRMb2dFdmVudHNDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNsb3Vkd2F0Y2gtbG9ncyc7XG5cbi8vIE1vY2sgZGVwZW5kZW5jaWVzXG5qZXN0Lm1vY2soJy4uL2R5bmFtb2RiLWNsaWVudCcpO1xuamVzdC5tb2NrKCdAYXdzLXNkay9jbGllbnQtY2xvdWR3YXRjaC1sb2dzJyk7XG5cbmNvbnN0IG1vY2tQdXRJdGVtID0gZHluYW1vZGJDbGllbnQucHV0SXRlbSBhcyBqZXN0Lk1vY2tlZEZ1bmN0aW9uPHR5cGVvZiBkeW5hbW9kYkNsaWVudC5wdXRJdGVtPjtcblxuZGVzY3JpYmUoJ0F1ZGl0IExvZ2dlcicsICgpID0+IHtcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XG4gICAgbW9ja1B1dEl0ZW0ubW9ja1Jlc29sdmVkVmFsdWUoKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2xvZ0F1ZGl0RXZlbnQnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBsb2cgYXVkaXQgZXZlbnQgdG8gRHluYW1vREInLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudDogQXVkaXRFdmVudCA9IHtcbiAgICAgICAgZXZlbnRUeXBlOiAnREFUQV9BQ0NFU1MnLFxuICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgIHVzZXJUeXBlOiAncHJpbWFyeScsXG4gICAgICAgIHJlc291cmNlOiAnL2FwaS9oZWFsdGgvdml0YWxzJyxcbiAgICAgICAgYWN0aW9uOiAncmVhZCcsXG4gICAgICAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTI6MDA6MDBaJyxcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgaXBBZGRyZXNzOiAnMTkyLjE2OC4xLjEnLFxuICAgICAgICB1c2VyQWdlbnQ6ICdNb3ppbGxhLzUuMCcsXG4gICAgICB9O1xuXG4gICAgICBhd2FpdCBsb2dBdWRpdEV2ZW50KGV2ZW50KTtcblxuICAgICAgZXhwZWN0KG1vY2tQdXRJdGVtKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICAgICAgJ2F1ZGl0LWxvZ3MnLFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgZXZlbnRUeXBlOiAnREFUQV9BQ0NFU1MnLFxuICAgICAgICAgIHVzZXJJZDogJ3VzZXItMTIzJyxcbiAgICAgICAgICB1c2VyVHlwZTogJ3ByaW1hcnknLFxuICAgICAgICAgIHJlc291cmNlOiAnL2FwaS9oZWFsdGgvdml0YWxzJyxcbiAgICAgICAgICBhY3Rpb246ICdyZWFkJyxcbiAgICAgICAgICB0aW1lc3RhbXA6ICcyMDI0LTAxLTE1VDEyOjAwOjAwWicsXG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICBpcEFkZHJlc3M6ICcxOTIuMTY4LjEuMScsXG4gICAgICAgICAgdXNlckFnZW50OiAnTW96aWxsYS81LjAnLFxuICAgICAgICAgIHR0bDogZXhwZWN0LmFueShOdW1iZXIpLFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgbm90IHRocm93IGVycm9yIGlmIGxvZ2dpbmcgZmFpbHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrUHV0SXRlbS5tb2NrUmVqZWN0ZWRWYWx1ZShuZXcgRXJyb3IoJ0R5bmFtb0RCIGVycm9yJykpO1xuXG4gICAgICBjb25zdCBldmVudDogQXVkaXRFdmVudCA9IHtcbiAgICAgICAgZXZlbnRUeXBlOiAnREFUQV9BQ0NFU1MnLFxuICAgICAgICB1c2VySWQ6ICd1c2VyLTEyMycsXG4gICAgICAgIHVzZXJUeXBlOiAncHJpbWFyeScsXG4gICAgICAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTI6MDA6MDBaJyxcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGV4cGVjdChsb2dBdWRpdEV2ZW50KGV2ZW50KSkucmVzb2x2ZXMubm90LnRvVGhyb3coKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgc2V0IFRUTCB0byA3IHllYXJzIGZvciBISVBBQSBjb21wbGlhbmNlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQ6IEF1ZGl0RXZlbnQgPSB7XG4gICAgICAgIGV2ZW50VHlwZTogJ0RBVEFfQUNDRVNTJyxcbiAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICB1c2VyVHlwZTogJ3ByaW1hcnknLFxuICAgICAgICB0aW1lc3RhbXA6ICcyMDI0LTAxLTE1VDEyOjAwOjAwWicsXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgYXdhaXQgbG9nQXVkaXRFdmVudChldmVudCk7XG5cbiAgICAgIGNvbnN0IHNldmVuWWVhcnNJblNlY29uZHMgPSA3ICogMzY1ICogMjQgKiA2MCAqIDYwO1xuICAgICAgY29uc3QgZXhwZWN0ZWRUVEwgPSBNYXRoLmZsb29yKG5vdyAvIDEwMDApICsgc2V2ZW5ZZWFyc0luU2Vjb25kcztcblxuICAgICAgZXhwZWN0KG1vY2tQdXRJdGVtKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICAgICAgJ2F1ZGl0LWxvZ3MnLFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgdHRsOiBleHBlY3QuYW55KE51bWJlciksXG4gICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgICBjb25zdCBhY3R1YWxUVEwgPSAobW9ja1B1dEl0ZW0ubW9jay5jYWxsc1swXVsxXSBhcyBhbnkpLnR0bDtcbiAgICAgIGV4cGVjdChhY3R1YWxUVEwpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoZXhwZWN0ZWRUVEwgLSAxMCk7XG4gICAgICBleHBlY3QoYWN0dWFsVFRMKS50b0JlTGVzc1RoYW5PckVxdWFsKGV4cGVjdGVkVFRMICsgMTApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnbG9nRGF0YUFjY2VzcycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGxvZyBkYXRhIGFjY2VzcyBldmVudCB3aXRoIGNvcnJlY3Qgc3RydWN0dXJlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgbG9nRGF0YUFjY2VzcyhcbiAgICAgICAgJ3VzZXItMTIzJyxcbiAgICAgICAgJ3NlY29uZGFyeScsXG4gICAgICAgICdwcmltYXJ5LTQ1NicsXG4gICAgICAgICd2aXRhbHMnLFxuICAgICAgICAncmVhZCcsXG4gICAgICAgIHRydWUsXG4gICAgICAgIFsnY2FuVmlld1ZpdGFscyddLFxuICAgICAgICB7IHJlbGF0aW9uc2hpcDogJ2NoaWxkJyB9XG4gICAgICApO1xuXG4gICAgICBleHBlY3QobW9ja1B1dEl0ZW0pLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICAgICAnYXVkaXQtbG9ncycsXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICBldmVudFR5cGU6ICdEQVRBX0FDQ0VTUycsXG4gICAgICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgICAgIHVzZXJUeXBlOiAnc2Vjb25kYXJ5JyxcbiAgICAgICAgICB0YXJnZXRVc2VySWQ6ICdwcmltYXJ5LTQ1NicsXG4gICAgICAgICAgZGF0YVR5cGU6ICd2aXRhbHMnLFxuICAgICAgICAgIGFjdGlvbjogJ3JlYWQnLFxuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgcGVybWlzc2lvbnNDaGVja2VkOiBbJ2NhblZpZXdWaXRhbHMnXSxcbiAgICAgICAgICByZWxhdGlvbnNoaXA6ICdjaGlsZCcsXG4gICAgICAgICAgdGltZXN0YW1wOiBleHBlY3QuYW55KFN0cmluZyksXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBsb2cgZmFpbGVkIGRhdGEgYWNjZXNzIGF0dGVtcHRzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgbG9nRGF0YUFjY2VzcyhcbiAgICAgICAgJ3VzZXItMTIzJyxcbiAgICAgICAgJ3NlY29uZGFyeScsXG4gICAgICAgICdwcmltYXJ5LTQ1NicsXG4gICAgICAgICdoZWFsdGhSZWNvcmRzJyxcbiAgICAgICAgJ3JlYWQnLFxuICAgICAgICBmYWxzZSxcbiAgICAgICAgWydjYW5WaWV3SGVhbHRoUmVjb3JkcyddLFxuICAgICAgICB7IHJlYXNvbjogJ0luc3VmZmljaWVudCBwZXJtaXNzaW9ucycgfVxuICAgICAgKTtcblxuICAgICAgZXhwZWN0KG1vY2tQdXRJdGVtKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICAgICAgJ2F1ZGl0LWxvZ3MnLFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgcmVhc29uOiAnSW5zdWZmaWNpZW50IHBlcm1pc3Npb25zJyxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdsb2dQZXJtaXNzaW9uQ2hhbmdlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgbG9nIHBlcm1pc3Npb24gY2hhbmdlcyB3aXRoIG9sZCBhbmQgbmV3IHZhbHVlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG9sZFBlcm1pc3Npb25zID0ge1xuICAgICAgICBjYW5WaWV3Vml0YWxzOiB0cnVlLFxuICAgICAgICBjYW5WaWV3TWVkaWNhdGlvbnM6IGZhbHNlLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgbmV3UGVybWlzc2lvbnMgPSB7XG4gICAgICAgIGNhblZpZXdWaXRhbHM6IHRydWUsXG4gICAgICAgIGNhblZpZXdNZWRpY2F0aW9uczogdHJ1ZSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGxvZ1Blcm1pc3Npb25DaGFuZ2UoXG4gICAgICAgICdwcmltYXJ5LTEyMycsXG4gICAgICAgICdwcmltYXJ5JyxcbiAgICAgICAgJ3NlY29uZGFyeS00NTYnLFxuICAgICAgICAncHJpbWFyeS0xMjMnLFxuICAgICAgICBvbGRQZXJtaXNzaW9ucyxcbiAgICAgICAgbmV3UGVybWlzc2lvbnMsXG4gICAgICAgIHsgcmVsYXRpb25zaGlwOiAnY2hpbGQnIH1cbiAgICAgICk7XG5cbiAgICAgIGV4cGVjdChtb2NrUHV0SXRlbSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgICAgICdhdWRpdC1sb2dzJyxcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAgIGV2ZW50VHlwZTogJ1BFUk1JU1NJT05fQ0hBTkdFJyxcbiAgICAgICAgICB1c2VySWQ6ICdwcmltYXJ5LTEyMycsXG4gICAgICAgICAgdXNlclR5cGU6ICdwcmltYXJ5JyxcbiAgICAgICAgICB0YXJnZXRVc2VySWQ6ICdzZWNvbmRhcnktNDU2JyxcbiAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgIGRhdGFBY2Nlc3NlZDogW1xuICAgICAgICAgICAgYE9sZDogJHtKU09OLnN0cmluZ2lmeShvbGRQZXJtaXNzaW9ucyl9YCxcbiAgICAgICAgICAgIGBOZXc6ICR7SlNPTi5zdHJpbmdpZnkobmV3UGVybWlzc2lvbnMpfWAsXG4gICAgICAgICAgICAnUHJpbWFyeTogcHJpbWFyeS0xMjMnLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgcmVsYXRpb25zaGlwOiAnY2hpbGQnLFxuICAgICAgICAgIHRpbWVzdGFtcDogZXhwZWN0LmFueShTdHJpbmcpLFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2xvZ0NhcmVDaXJjbGVBY2Nlc3MnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBsb2cgY2FyZSBjaXJjbGUgYWNjZXNzIGV2ZW50cycsIGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IGxvZ0NhcmVDaXJjbGVBY2Nlc3MoXG4gICAgICAgICdzZWNvbmRhcnktNDU2JyxcbiAgICAgICAgJ3ByaW1hcnktMTIzJyxcbiAgICAgICAgJ3ZpZXctZGFzaGJvYXJkJyxcbiAgICAgICAgdHJ1ZSxcbiAgICAgICAgWydjYW5WaWV3Vml0YWxzJywgJ2NhblZpZXdNZWRpY2F0aW9ucyddLFxuICAgICAgICB7IGRhdGFWaWV3ZWQ6IFsndml0YWxzJywgJ21lZGljYXRpb25zJ10gfVxuICAgICAgKTtcblxuICAgICAgZXhwZWN0KG1vY2tQdXRJdGVtKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICAgICAgJ2F1ZGl0LWxvZ3MnLFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgZXZlbnRUeXBlOiAnQ0FSRV9DSVJDTEVfQUNDRVNTJyxcbiAgICAgICAgICB1c2VySWQ6ICdzZWNvbmRhcnktNDU2JyxcbiAgICAgICAgICB1c2VyVHlwZTogJ3NlY29uZGFyeScsXG4gICAgICAgICAgdGFyZ2V0VXNlcklkOiAncHJpbWFyeS0xMjMnLFxuICAgICAgICAgIGFjdGlvbjogJ3ZpZXctZGFzaGJvYXJkJyxcbiAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgIHBlcm1pc3Npb25zQ2hlY2tlZDogWydjYW5WaWV3Vml0YWxzJywgJ2NhblZpZXdNZWRpY2F0aW9ucyddLFxuICAgICAgICAgIGRhdGFWaWV3ZWQ6IFsndml0YWxzJywgJ21lZGljYXRpb25zJ10sXG4gICAgICAgICAgdGltZXN0YW1wOiBleHBlY3QuYW55KFN0cmluZyksXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBsb2cgZmFpbGVkIGNhcmUgY2lyY2xlIGFjY2VzcyBhdHRlbXB0cycsIGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IGxvZ0NhcmVDaXJjbGVBY2Nlc3MoXG4gICAgICAgICdzZWNvbmRhcnktNDU2JyxcbiAgICAgICAgJ3ByaW1hcnktMTIzJyxcbiAgICAgICAgJ3ZpZXctaGVhbHRoLXJlY29yZHMnLFxuICAgICAgICBmYWxzZSxcbiAgICAgICAgWydjYW5WaWV3SGVhbHRoUmVjb3JkcyddLFxuICAgICAgICB7IHJlYXNvbjogJ1Blcm1pc3Npb24gZGVuaWVkJyB9XG4gICAgICApO1xuXG4gICAgICBleHBlY3QobW9ja1B1dEl0ZW0pLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICAgICAnYXVkaXQtbG9ncycsXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICByZWFzb246ICdQZXJtaXNzaW9uIGRlbmllZCcsXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19