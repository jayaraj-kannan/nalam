"use strict";
// Access Control Unit Tests
// Requirements: 8.4, 8.5 - Test authorization and permission system
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
const access_control_1 = require("../access-control");
const careCircleAccess = __importStar(require("../data-access/care-circle"));
const auditLogger = __importStar(require("../audit-logger"));
// Mock dependencies
jest.mock('../data-access/care-circle');
jest.mock('../audit-logger');
const mockGetCareCircleMember = careCircleAccess.getCareCircleMember;
const mockLogDataAccess = auditLogger.logDataAccess;
const mockLogCareCircleAccess = auditLogger.logCareCircleAccess;
describe('Access Control System', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('checkPermission', () => {
        it('should allow primary users to access their own data', async () => {
            const result = await (0, access_control_1.checkPermission)('user-123', 'primary', 'user-123', 'vitals', 'read');
            expect(result).toBe(true);
            expect(mockLogDataAccess).toHaveBeenCalledWith('user-123', 'primary', 'user-123', 'vitals', 'read', true, ['self-access'], { reason: 'Primary user accessing own data' });
        });
        it('should deny primary users access to other users\' data', async () => {
            const result = await (0, access_control_1.checkPermission)('user-123', 'primary', 'user-456', 'vitals', 'read');
            expect(result).toBe(false);
            expect(mockLogDataAccess).toHaveBeenCalledWith('user-123', 'primary', 'user-456', 'vitals', 'read', false, ['cross-user-access'], { reason: 'Primary user attempting to access another user\'s data' });
        });
        it('should allow secondary users with proper permissions', async () => {
            mockGetCareCircleMember.mockResolvedValue({
                primaryUserId: 'primary-123',
                secondaryUserId: 'secondary-456',
                relationship: 'child',
                permissions: {
                    canViewVitals: true,
                    canViewMedications: true,
                    canViewAppointments: true,
                    canViewHealthRecords: false,
                    canReceiveAlerts: true,
                    canSendMessages: true,
                    canManageDevices: false,
                },
                joinedAt: '2024-01-01T00:00:00Z',
                lastActive: '2024-01-15T00:00:00Z',
            });
            const result = await (0, access_control_1.checkPermission)('secondary-456', 'secondary', 'primary-123', 'vitals', 'read');
            expect(result).toBe(true);
            expect(mockGetCareCircleMember).toHaveBeenCalledWith('primary-123', 'secondary-456');
        });
        it('should deny secondary users without proper permissions', async () => {
            mockGetCareCircleMember.mockResolvedValue({
                primaryUserId: 'primary-123',
                secondaryUserId: 'secondary-456',
                relationship: 'friend',
                permissions: {
                    canViewVitals: false,
                    canViewMedications: false,
                    canViewAppointments: true,
                    canViewHealthRecords: false,
                    canReceiveAlerts: false,
                    canSendMessages: true,
                    canManageDevices: false,
                },
                joinedAt: '2024-01-01T00:00:00Z',
                lastActive: '2024-01-15T00:00:00Z',
            });
            const result = await (0, access_control_1.checkPermission)('secondary-456', 'secondary', 'primary-123', 'vitals', 'read');
            expect(result).toBe(false);
        });
        it('should deny secondary users who are not care circle members', async () => {
            mockGetCareCircleMember.mockResolvedValue(null);
            const result = await (0, access_control_1.checkPermission)('secondary-456', 'secondary', 'primary-123', 'vitals', 'read');
            expect(result).toBe(false);
            expect(mockLogDataAccess).toHaveBeenCalledWith('secondary-456', 'secondary', 'primary-123', 'vitals', 'read', false, ['care-circle-membership'], { reason: 'Not a care circle member' });
        });
    });
    describe('checkMultiplePermissions', () => {
        it('should check multiple permissions efficiently', async () => {
            mockGetCareCircleMember.mockResolvedValue({
                primaryUserId: 'primary-123',
                secondaryUserId: 'secondary-456',
                relationship: 'child',
                permissions: {
                    canViewVitals: true,
                    canViewMedications: true,
                    canViewAppointments: false,
                    canViewHealthRecords: false,
                    canReceiveAlerts: true,
                    canSendMessages: true,
                    canManageDevices: false,
                },
                joinedAt: '2024-01-01T00:00:00Z',
                lastActive: '2024-01-15T00:00:00Z',
            });
            const result = await (0, access_control_1.checkMultiplePermissions)('secondary-456', 'secondary', 'primary-123', ['vitals', 'medications', 'appointments'], 'read');
            expect(result).toEqual({
                vitals: true,
                medications: true,
                appointments: false,
            });
        });
    });
    describe('verifyCareCircleMembership', () => {
        it('should verify valid care circle membership', async () => {
            mockGetCareCircleMember.mockResolvedValue({
                primaryUserId: 'primary-123',
                secondaryUserId: 'secondary-456',
                relationship: 'child',
                permissions: access_control_1.DEFAULT_PERMISSIONS,
                joinedAt: '2024-01-01T00:00:00Z',
                lastActive: '2024-01-15T00:00:00Z',
            });
            const result = await (0, access_control_1.verifyCareCircleMembership)('secondary-456', 'primary-123');
            expect(result).toBe(true);
            expect(mockLogCareCircleAccess).toHaveBeenCalledWith('secondary-456', 'primary-123', 'verify-membership', true, ['care-circle-membership'], { isMember: true });
        });
        it('should reject invalid care circle membership', async () => {
            mockGetCareCircleMember.mockResolvedValue(null);
            const result = await (0, access_control_1.verifyCareCircleMembership)('secondary-456', 'primary-123');
            expect(result).toBe(false);
        });
    });
    describe('getEffectivePermissions', () => {
        it('should return permissions for valid care circle member', async () => {
            const expectedPermissions = {
                canViewVitals: true,
                canViewMedications: true,
                canViewAppointments: true,
                canViewHealthRecords: false,
                canReceiveAlerts: true,
                canSendMessages: true,
                canManageDevices: false,
            };
            mockGetCareCircleMember.mockResolvedValue({
                primaryUserId: 'primary-123',
                secondaryUserId: 'secondary-456',
                relationship: 'child',
                permissions: expectedPermissions,
                joinedAt: '2024-01-01T00:00:00Z',
                lastActive: '2024-01-15T00:00:00Z',
            });
            const result = await (0, access_control_1.getEffectivePermissions)('secondary-456', 'primary-123');
            expect(result).toEqual(expectedPermissions);
        });
        it('should return null for non-members', async () => {
            mockGetCareCircleMember.mockResolvedValue(null);
            const result = await (0, access_control_1.getEffectivePermissions)('secondary-456', 'primary-123');
            expect(result).toBeNull();
        });
    });
    describe('filterDataByPermissions', () => {
        it('should filter data based on permissions', () => {
            const data = {
                id: 'user-123',
                name: 'John Doe',
                vitals: { heartRate: 75 },
                medications: ['Med1', 'Med2'],
                healthRecords: ['Record1'],
                devices: ['Device1'],
            };
            const permissions = {
                canViewVitals: true,
                canViewMedications: true,
                canViewAppointments: true,
                canViewHealthRecords: false,
                canReceiveAlerts: true,
                canSendMessages: true,
                canManageDevices: false,
            };
            const dataTypeMap = {
                vitals: 'vitals',
                medications: 'medications',
                healthRecords: 'healthRecords',
                devices: 'devices',
            };
            const filtered = (0, access_control_1.filterDataByPermissions)(data, permissions, dataTypeMap);
            expect(filtered).toHaveProperty('id');
            expect(filtered).toHaveProperty('name');
            expect(filtered).toHaveProperty('vitals');
            expect(filtered).toHaveProperty('medications');
            expect(filtered).not.toHaveProperty('healthRecords');
            expect(filtered).not.toHaveProperty('devices');
        });
    });
    describe('checkWriteAccess', () => {
        it('should allow primary users to write their own data', async () => {
            const result = await (0, access_control_1.checkWriteAccess)('user-123', 'primary', 'user-123', 'vitals');
            expect(result).toBe(true);
            expect(mockLogDataAccess).toHaveBeenCalledWith('user-123', 'primary', 'user-123', 'vitals', 'write', true, ['self-write'], { reason: 'Primary user writing own data' });
        });
        it('should deny secondary users write access', async () => {
            const result = await (0, access_control_1.checkWriteAccess)('secondary-456', 'secondary', 'primary-123', 'vitals');
            expect(result).toBe(false);
            expect(mockLogDataAccess).toHaveBeenCalledWith('secondary-456', 'secondary', 'primary-123', 'vitals', 'write', false, ['write-access'], { reason: 'Write access denied' });
        });
    });
    describe('Permission Presets', () => {
        it('should have correct default permissions', () => {
            expect(access_control_1.DEFAULT_PERMISSIONS).toEqual({
                canViewVitals: true,
                canViewMedications: true,
                canViewAppointments: true,
                canViewHealthRecords: false,
                canReceiveAlerts: true,
                canSendMessages: true,
                canManageDevices: false,
            });
        });
        it('should have correct full access permissions', () => {
            expect(access_control_1.FULL_ACCESS_PERMISSIONS).toEqual({
                canViewVitals: true,
                canViewMedications: true,
                canViewAppointments: true,
                canViewHealthRecords: true,
                canReceiveAlerts: true,
                canSendMessages: true,
                canManageDevices: true,
            });
        });
        it('should have correct limited access permissions', () => {
            expect(access_control_1.LIMITED_ACCESS_PERMISSIONS).toEqual({
                canViewVitals: false,
                canViewMedications: false,
                canViewAppointments: true,
                canViewHealthRecords: false,
                canReceiveAlerts: false,
                canSendMessages: true,
                canManageDevices: false,
            });
        });
    });
    describe('Permission Matrix', () => {
        it('should map data types to permission keys correctly', () => {
            expect(access_control_1.PERMISSION_MATRIX).toEqual({
                vitals: 'canViewVitals',
                medications: 'canViewMedications',
                appointments: 'canViewAppointments',
                healthRecords: 'canViewHealthRecords',
                alerts: 'canReceiveAlerts',
                messages: 'canSendMessages',
                devices: 'canManageDevices',
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzLWNvbnRyb2wudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFjY2Vzcy1jb250cm9sLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDRCQUE0QjtBQUM1QixvRUFBb0U7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRXBFLHNEQVcyQjtBQUMzQiw2RUFBK0Q7QUFDL0QsNkRBQStDO0FBRS9DLG9CQUFvQjtBQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUM7QUFDeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRTdCLE1BQU0sdUJBQXVCLEdBQUcsZ0JBQWdCLENBQUMsbUJBRWhELENBQUM7QUFDRixNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxhQUVyQyxDQUFDO0FBQ0YsTUFBTSx1QkFBdUIsR0FBRyxXQUFXLENBQUMsbUJBRTNDLENBQUM7QUFFRixRQUFRLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQy9CLEVBQUUsQ0FBQyxxREFBcUQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNuRSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsZ0NBQWUsRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFMUYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxQixNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxvQkFBb0IsQ0FDNUMsVUFBVSxFQUNWLFNBQVMsRUFDVCxVQUFVLEVBQ1YsUUFBUSxFQUNSLE1BQU0sRUFDTixJQUFJ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SzthQUN4QixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUNqQyxFQUFFLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO1lBQzVELE1BQU0sQ0FBQyxrQ0FBaUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFDaEMsTUFBTSxFQUFFLGVBQWU7Z0JBQ3ZCLFdBQVcsRUFBRSxvQkFBb0I7Z0JBQ2pDLFlBQVksRUFBRSxxQkFBcUI7Z0JBQ25DLGFBQWEsRUFBRSxzQkFBc0I7Z0JBQ3JDLE1BQU0sRUFBRSxrQkFBa0I7Z0JBQzFCLFFBQVEsRUFBRSxpQkFBaUI7Z0JBQzNCLE9BQU8sRUFBRSxrQkFBa0I7YUFDNUIsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQWNjZXNzIENvbnRyb2wgVW5pdCBUZXN0c1xuLy8gUmVxdWlyZW1lbnRzOiA4LjQsIDguNSAtIFRlc3QgYXV0aG9yaXphdGlvbiBhbmQgcGVybWlzc2lvbiBzeXN0ZW1cblxuaW1wb3J0IHtcbiAgY2hlY2tQZXJtaXNzaW9uLFxuICBjaGVja011bHRpcGxlUGVybWlzc2lvbnMsXG4gIHZlcmlmeUNhcmVDaXJjbGVNZW1iZXJzaGlwLFxuICBnZXRFZmZlY3RpdmVQZXJtaXNzaW9ucyxcbiAgZmlsdGVyRGF0YUJ5UGVybWlzc2lvbnMsXG4gIGNoZWNrV3JpdGVBY2Nlc3MsXG4gIERFRkFVTFRfUEVSTUlTU0lPTlMsXG4gIEZVTExfQUNDRVNTX1BFUk1JU1NJT05TLFxuICBMSU1JVEVEX0FDQ0VTU19QRVJNSVNTSU9OUyxcbiAgUEVSTUlTU0lPTl9NQVRSSVgsXG59IGZyb20gJy4uL2FjY2Vzcy1jb250cm9sJztcbmltcG9ydCAqIGFzIGNhcmVDaXJjbGVBY2Nlc3MgZnJvbSAnLi4vZGF0YS1hY2Nlc3MvY2FyZS1jaXJjbGUnO1xuaW1wb3J0ICogYXMgYXVkaXRMb2dnZXIgZnJvbSAnLi4vYXVkaXQtbG9nZ2VyJztcblxuLy8gTW9jayBkZXBlbmRlbmNpZXNcbmplc3QubW9jaygnLi4vZGF0YS1hY2Nlc3MvY2FyZS1jaXJjbGUnKTtcbmplc3QubW9jaygnLi4vYXVkaXQtbG9nZ2VyJyk7XG5cbmNvbnN0IG1vY2tHZXRDYXJlQ2lyY2xlTWVtYmVyID0gY2FyZUNpcmNsZUFjY2Vzcy5nZXRDYXJlQ2lyY2xlTWVtYmVyIGFzIGplc3QuTW9ja2VkRnVuY3Rpb248XG4gIHR5cGVvZiBjYXJlQ2lyY2xlQWNjZXNzLmdldENhcmVDaXJjbGVNZW1iZXJcbj47XG5jb25zdCBtb2NrTG9nRGF0YUFjY2VzcyA9IGF1ZGl0TG9nZ2VyLmxvZ0RhdGFBY2Nlc3MgYXMgamVzdC5Nb2NrZWRGdW5jdGlvbjxcbiAgdHlwZW9mIGF1ZGl0TG9nZ2VyLmxvZ0RhdGFBY2Nlc3Ncbj47XG5jb25zdCBtb2NrTG9nQ2FyZUNpcmNsZUFjY2VzcyA9IGF1ZGl0TG9nZ2VyLmxvZ0NhcmVDaXJjbGVBY2Nlc3MgYXMgamVzdC5Nb2NrZWRGdW5jdGlvbjxcbiAgdHlwZW9mIGF1ZGl0TG9nZ2VyLmxvZ0NhcmVDaXJjbGVBY2Nlc3Ncbj47XG5cbmRlc2NyaWJlKCdBY2Nlc3MgQ29udHJvbCBTeXN0ZW0nLCAoKSA9PiB7XG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGplc3QuY2xlYXJBbGxNb2NrcygpO1xuICB9KTtcblxuICBkZXNjcmliZSgnY2hlY2tQZXJtaXNzaW9uJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgYWxsb3cgcHJpbWFyeSB1c2VycyB0byBhY2Nlc3MgdGhlaXIgb3duIGRhdGEnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaGVja1Blcm1pc3Npb24oJ3VzZXItMTIzJywgJ3ByaW1hcnknLCAndXNlci0xMjMnLCAndml0YWxzJywgJ3JlYWQnKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChtb2NrTG9nRGF0YUFjY2VzcykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgICAgICd1c2VyLTEyMycsXG4gICAgICAgICdwcmltYXJ5JyxcbiAgICAgICAgJ3VzZXItMTIzJyxcbiAgICAgICAgJ3ZpdGFscycsXG4gICAgICAgICdyZWFkJyxcbiAgICAgICAgdHJ1ZSxcbiAgICAgICAgWydzZWxmLWFjY2VzcyddLFxuICAgICAgICB7IHJlYXNvbjogJ1ByaW1hcnkgdXNlciBhY2Nlc3Npbmcgb3duIGRhdGEnIH1cbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGRlbnkgcHJpbWFyeSB1c2VycyBhY2Nlc3MgdG8gb3RoZXIgdXNlcnNcXCcgZGF0YScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNoZWNrUGVybWlzc2lvbigndXNlci0xMjMnLCAncHJpbWFyeScsICd1c2VyLTQ1NicsICd2aXRhbHMnLCAncmVhZCcpO1xuICAgICAgXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdChtb2NrTG9nRGF0YUFjY2VzcykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgICAgICd1c2VyLTEyMycsXG4gICAgICAgICdwcmltYXJ5JyxcbiAgICAgICAgJ3VzZXItNDU2JyxcbiAgICAgICAgJ3ZpdGFscycsXG4gICAgICAgICdyZWFkJyxcbiAgICAgICAgZmFsc2UsXG4gICAgICAgIFsnY3Jvc3MtdXNlci1hY2Nlc3MnXSxcbiAgICAgICAgeyByZWFzb246ICdQcmltYXJ5IHVzZXIgYXR0ZW1wdGluZyB0byBhY2Nlc3MgYW5vdGhlciB1c2VyXFwncyBkYXRhJyB9XG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBhbGxvdyBzZWNvbmRhcnkgdXNlcnMgd2l0aCBwcm9wZXIgcGVybWlzc2lvbnMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrR2V0Q2FyZUNpcmNsZU1lbWJlci5tb2NrUmVzb2x2ZWRWYWx1ZSh7XG4gICAgICAgIHByaW1hcnlVc2VySWQ6ICdwcmltYXJ5LTEyMycsXG4gICAgICAgIHNlY29uZGFyeVVzZXJJZDogJ3NlY29uZGFyeS00NTYnLFxuICAgICAgICByZWxhdGlvbnNoaXA6ICdjaGlsZCcsXG4gICAgICAgIHBlcm1pc3Npb25zOiB7XG4gICAgICAgICAgY2FuVmlld1ZpdGFsczogdHJ1ZSxcbiAgICAgICAgICBjYW5WaWV3TWVkaWNhdGlvbnM6IHRydWUsXG4gICAgICAgICAgY2FuVmlld0FwcG9pbnRtZW50czogdHJ1ZSxcbiAgICAgICAgICBjYW5WaWV3SGVhbHRoUmVjb3JkczogZmFsc2UsXG4gICAgICAgICAgY2FuUmVjZWl2ZUFsZXJ0czogdHJ1ZSxcbiAgICAgICAgICBjYW5TZW5kTWVzc2FnZXM6IHRydWUsXG4gICAgICAgICAgY2FuTWFuYWdlRGV2aWNlczogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIGpvaW5lZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMFonLFxuICAgICAgICBsYXN0QWN0aXZlOiAnMjAyNC0wMS0xNVQwMDowMDowMFonLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNoZWNrUGVybWlzc2lvbihcbiAgICAgICAgJ3NlY29uZGFyeS00NTYnLFxuICAgICAgICAnc2Vjb25kYXJ5JyxcbiAgICAgICAgJ3ByaW1hcnktMTIzJyxcbiAgICAgICAgJ3ZpdGFscycsXG4gICAgICAgICdyZWFkJ1xuICAgICAgKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChtb2NrR2V0Q2FyZUNpcmNsZU1lbWJlcikudG9IYXZlQmVlbkNhbGxlZFdpdGgoJ3ByaW1hcnktMTIzJywgJ3NlY29uZGFyeS00NTYnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZGVueSBzZWNvbmRhcnkgdXNlcnMgd2l0aG91dCBwcm9wZXIgcGVybWlzc2lvbnMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrR2V0Q2FyZUNpcmNsZU1lbWJlci5tb2NrUmVzb2x2ZWRWYWx1ZSh7XG4gICAgICAgIHByaW1hcnlVc2VySWQ6ICdwcmltYXJ5LTEyMycsXG4gICAgICAgIHNlY29uZGFyeVVzZXJJZDogJ3NlY29uZGFyeS00NTYnLFxuICAgICAgICByZWxhdGlvbnNoaXA6ICdmcmllbmQnLFxuICAgICAgICBwZXJtaXNzaW9uczoge1xuICAgICAgICAgIGNhblZpZXdWaXRhbHM6IGZhbHNlLFxuICAgICAgICAgIGNhblZpZXdNZWRpY2F0aW9uczogZmFsc2UsXG4gICAgICAgICAgY2FuVmlld0FwcG9pbnRtZW50czogdHJ1ZSxcbiAgICAgICAgICBjYW5WaWV3SGVhbHRoUmVjb3JkczogZmFsc2UsXG4gICAgICAgICAgY2FuUmVjZWl2ZUFsZXJ0czogZmFsc2UsXG4gICAgICAgICAgY2FuU2VuZE1lc3NhZ2VzOiB0cnVlLFxuICAgICAgICAgIGNhbk1hbmFnZURldmljZXM6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICBqb2luZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDBaJyxcbiAgICAgICAgbGFzdEFjdGl2ZTogJzIwMjQtMDEtMTVUMDA6MDA6MDBaJyxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaGVja1Blcm1pc3Npb24oXG4gICAgICAgICdzZWNvbmRhcnktNDU2JyxcbiAgICAgICAgJ3NlY29uZGFyeScsXG4gICAgICAgICdwcmltYXJ5LTEyMycsXG4gICAgICAgICd2aXRhbHMnLFxuICAgICAgICAncmVhZCdcbiAgICAgICk7XG4gICAgICBcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmUoZmFsc2UpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBkZW55IHNlY29uZGFyeSB1c2VycyB3aG8gYXJlIG5vdCBjYXJlIGNpcmNsZSBtZW1iZXJzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja0dldENhcmVDaXJjbGVNZW1iZXIubW9ja1Jlc29sdmVkVmFsdWUobnVsbCk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNoZWNrUGVybWlzc2lvbihcbiAgICAgICAgJ3NlY29uZGFyeS00NTYnLFxuICAgICAgICAnc2Vjb25kYXJ5JyxcbiAgICAgICAgJ3ByaW1hcnktMTIzJyxcbiAgICAgICAgJ3ZpdGFscycsXG4gICAgICAgICdyZWFkJ1xuICAgICAgKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9CZShmYWxzZSk7XG4gICAgICBleHBlY3QobW9ja0xvZ0RhdGFBY2Nlc3MpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICAgICAnc2Vjb25kYXJ5LTQ1NicsXG4gICAgICAgICdzZWNvbmRhcnknLFxuICAgICAgICAncHJpbWFyeS0xMjMnLFxuICAgICAgICAndml0YWxzJyxcbiAgICAgICAgJ3JlYWQnLFxuICAgICAgICBmYWxzZSxcbiAgICAgICAgWydjYXJlLWNpcmNsZS1tZW1iZXJzaGlwJ10sXG4gICAgICAgIHsgcmVhc29uOiAnTm90IGEgY2FyZSBjaXJjbGUgbWVtYmVyJyB9XG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnY2hlY2tNdWx0aXBsZVBlcm1pc3Npb25zJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgY2hlY2sgbXVsdGlwbGUgcGVybWlzc2lvbnMgZWZmaWNpZW50bHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrR2V0Q2FyZUNpcmNsZU1lbWJlci5tb2NrUmVzb2x2ZWRWYWx1ZSh7XG4gICAgICAgIHByaW1hcnlVc2VySWQ6ICdwcmltYXJ5LTEyMycsXG4gICAgICAgIHNlY29uZGFyeVVzZXJJZDogJ3NlY29uZGFyeS00NTYnLFxuICAgICAgICByZWxhdGlvbnNoaXA6ICdjaGlsZCcsXG4gICAgICAgIHBlcm1pc3Npb25zOiB7XG4gICAgICAgICAgY2FuVmlld1ZpdGFsczogdHJ1ZSxcbiAgICAgICAgICBjYW5WaWV3TWVkaWNhdGlvbnM6IHRydWUsXG4gICAgICAgICAgY2FuVmlld0FwcG9pbnRtZW50czogZmFsc2UsXG4gICAgICAgICAgY2FuVmlld0hlYWx0aFJlY29yZHM6IGZhbHNlLFxuICAgICAgICAgIGNhblJlY2VpdmVBbGVydHM6IHRydWUsXG4gICAgICAgICAgY2FuU2VuZE1lc3NhZ2VzOiB0cnVlLFxuICAgICAgICAgIGNhbk1hbmFnZURldmljZXM6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICBqb2luZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDBaJyxcbiAgICAgICAgbGFzdEFjdGl2ZTogJzIwMjQtMDEtMTVUMDA6MDA6MDBaJyxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaGVja011bHRpcGxlUGVybWlzc2lvbnMoXG4gICAgICAgICdzZWNvbmRhcnktNDU2JyxcbiAgICAgICAgJ3NlY29uZGFyeScsXG4gICAgICAgICdwcmltYXJ5LTEyMycsXG4gICAgICAgIFsndml0YWxzJywgJ21lZGljYXRpb25zJywgJ2FwcG9pbnRtZW50cyddLFxuICAgICAgICAncmVhZCdcbiAgICAgICk7XG4gICAgICBcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoe1xuICAgICAgICB2aXRhbHM6IHRydWUsXG4gICAgICAgIG1lZGljYXRpb25zOiB0cnVlLFxuICAgICAgICBhcHBvaW50bWVudHM6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd2ZXJpZnlDYXJlQ2lyY2xlTWVtYmVyc2hpcCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHZlcmlmeSB2YWxpZCBjYXJlIGNpcmNsZSBtZW1iZXJzaGlwJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja0dldENhcmVDaXJjbGVNZW1iZXIubW9ja1Jlc29sdmVkVmFsdWUoe1xuICAgICAgICBwcmltYXJ5VXNlcklkOiAncHJpbWFyeS0xMjMnLFxuICAgICAgICBzZWNvbmRhcnlVc2VySWQ6ICdzZWNvbmRhcnktNDU2JyxcbiAgICAgICAgcmVsYXRpb25zaGlwOiAnY2hpbGQnLFxuICAgICAgICBwZXJtaXNzaW9uczogREVGQVVMVF9QRVJNSVNTSU9OUyxcbiAgICAgICAgam9pbmVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwWicsXG4gICAgICAgIGxhc3RBY3RpdmU6ICcyMDI0LTAxLTE1VDAwOjAwOjAwWicsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdmVyaWZ5Q2FyZUNpcmNsZU1lbWJlcnNoaXAoJ3NlY29uZGFyeS00NTYnLCAncHJpbWFyeS0xMjMnKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChtb2NrTG9nQ2FyZUNpcmNsZUFjY2VzcykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgICAgICdzZWNvbmRhcnktNDU2JyxcbiAgICAgICAgJ3ByaW1hcnktMTIzJyxcbiAgICAgICAgJ3ZlcmlmeS1tZW1iZXJzaGlwJyxcbiAgICAgICAgdHJ1ZSxcbiAgICAgICAgWydjYXJlLWNpcmNsZS1tZW1iZXJzaGlwJ10sXG4gICAgICAgIHsgaXNNZW1iZXI6IHRydWUgfVxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVqZWN0IGludmFsaWQgY2FyZSBjaXJjbGUgbWVtYmVyc2hpcCcsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tHZXRDYXJlQ2lyY2xlTWVtYmVyLm1vY2tSZXNvbHZlZFZhbHVlKG51bGwpO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB2ZXJpZnlDYXJlQ2lyY2xlTWVtYmVyc2hpcCgnc2Vjb25kYXJ5LTQ1NicsICdwcmltYXJ5LTEyMycpO1xuICAgICAgXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlKGZhbHNlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2dldEVmZmVjdGl2ZVBlcm1pc3Npb25zJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgcmV0dXJuIHBlcm1pc3Npb25zIGZvciB2YWxpZCBjYXJlIGNpcmNsZSBtZW1iZXInLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBleHBlY3RlZFBlcm1pc3Npb25zID0ge1xuICAgICAgICBjYW5WaWV3Vml0YWxzOiB0cnVlLFxuICAgICAgICBjYW5WaWV3TWVkaWNhdGlvbnM6IHRydWUsXG4gICAgICAgIGNhblZpZXdBcHBvaW50bWVudHM6IHRydWUsXG4gICAgICAgIGNhblZpZXdIZWFsdGhSZWNvcmRzOiBmYWxzZSxcbiAgICAgICAgY2FuUmVjZWl2ZUFsZXJ0czogdHJ1ZSxcbiAgICAgICAgY2FuU2VuZE1lc3NhZ2VzOiB0cnVlLFxuICAgICAgICBjYW5NYW5hZ2VEZXZpY2VzOiBmYWxzZSxcbiAgICAgIH07XG5cbiAgICAgIG1vY2tHZXRDYXJlQ2lyY2xlTWVtYmVyLm1vY2tSZXNvbHZlZFZhbHVlKHtcbiAgICAgICAgcHJpbWFyeVVzZXJJZDogJ3ByaW1hcnktMTIzJyxcbiAgICAgICAgc2Vjb25kYXJ5VXNlcklkOiAnc2Vjb25kYXJ5LTQ1NicsXG4gICAgICAgIHJlbGF0aW9uc2hpcDogJ2NoaWxkJyxcbiAgICAgICAgcGVybWlzc2lvbnM6IGV4cGVjdGVkUGVybWlzc2lvbnMsXG4gICAgICAgIGpvaW5lZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMFonLFxuICAgICAgICBsYXN0QWN0aXZlOiAnMjAyNC0wMS0xNVQwMDowMDowMFonLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdldEVmZmVjdGl2ZVBlcm1pc3Npb25zKCdzZWNvbmRhcnktNDU2JywgJ3ByaW1hcnktMTIzJyk7XG4gICAgICBcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZXhwZWN0ZWRQZXJtaXNzaW9ucyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBudWxsIGZvciBub24tbWVtYmVycycsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tHZXRDYXJlQ2lyY2xlTWVtYmVyLm1vY2tSZXNvbHZlZFZhbHVlKG51bGwpO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnZXRFZmZlY3RpdmVQZXJtaXNzaW9ucygnc2Vjb25kYXJ5LTQ1NicsICdwcmltYXJ5LTEyMycpO1xuICAgICAgXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlTnVsbCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZmlsdGVyRGF0YUJ5UGVybWlzc2lvbnMnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBmaWx0ZXIgZGF0YSBiYXNlZCBvbiBwZXJtaXNzaW9ucycsICgpID0+IHtcbiAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgIGlkOiAndXNlci0xMjMnLFxuICAgICAgICBuYW1lOiAnSm9obiBEb2UnLFxuICAgICAgICB2aXRhbHM6IHsgaGVhcnRSYXRlOiA3NSB9LFxuICAgICAgICBtZWRpY2F0aW9uczogWydNZWQxJywgJ01lZDInXSxcbiAgICAgICAgaGVhbHRoUmVjb3JkczogWydSZWNvcmQxJ10sXG4gICAgICAgIGRldmljZXM6IFsnRGV2aWNlMSddLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSB7XG4gICAgICAgIGNhblZpZXdWaXRhbHM6IHRydWUsXG4gICAgICAgIGNhblZpZXdNZWRpY2F0aW9uczogdHJ1ZSxcbiAgICAgICAgY2FuVmlld0FwcG9pbnRtZW50czogdHJ1ZSxcbiAgICAgICAgY2FuVmlld0hlYWx0aFJlY29yZHM6IGZhbHNlLFxuICAgICAgICBjYW5SZWNlaXZlQWxlcnRzOiB0cnVlLFxuICAgICAgICBjYW5TZW5kTWVzc2FnZXM6IHRydWUsXG4gICAgICAgIGNhbk1hbmFnZURldmljZXM6IGZhbHNlLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZGF0YVR5cGVNYXAgPSB7XG4gICAgICAgIHZpdGFsczogJ3ZpdGFscycgYXMgY29uc3QsXG4gICAgICAgIG1lZGljYXRpb25zOiAnbWVkaWNhdGlvbnMnIGFzIGNvbnN0LFxuICAgICAgICBoZWFsdGhSZWNvcmRzOiAnaGVhbHRoUmVjb3JkcycgYXMgY29uc3QsXG4gICAgICAgIGRldmljZXM6ICdkZXZpY2VzJyBhcyBjb25zdCxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGZpbHRlcmVkID0gZmlsdGVyRGF0YUJ5UGVybWlzc2lvbnMoZGF0YSwgcGVybWlzc2lvbnMsIGRhdGFUeXBlTWFwKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KGZpbHRlcmVkKS50b0hhdmVQcm9wZXJ0eSgnaWQnKTtcbiAgICAgIGV4cGVjdChmaWx0ZXJlZCkudG9IYXZlUHJvcGVydHkoJ25hbWUnKTtcbiAgICAgIGV4cGVjdChmaWx0ZXJlZCkudG9IYXZlUHJvcGVydHkoJ3ZpdGFscycpO1xuICAgICAgZXhwZWN0KGZpbHRlcmVkKS50b0hhdmVQcm9wZXJ0eSgnbWVkaWNhdGlvbnMnKTtcbiAgICAgIGV4cGVjdChmaWx0ZXJlZCkubm90LnRvSGF2ZVByb3BlcnR5KCdoZWFsdGhSZWNvcmRzJyk7XG4gICAgICBleHBlY3QoZmlsdGVyZWQpLm5vdC50b0hhdmVQcm9wZXJ0eSgnZGV2aWNlcycpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnY2hlY2tXcml0ZUFjY2VzcycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGFsbG93IHByaW1hcnkgdXNlcnMgdG8gd3JpdGUgdGhlaXIgb3duIGRhdGEnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaGVja1dyaXRlQWNjZXNzKCd1c2VyLTEyMycsICdwcmltYXJ5JywgJ3VzZXItMTIzJywgJ3ZpdGFscycpO1xuICAgICAgXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KG1vY2tMb2dEYXRhQWNjZXNzKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICAgICAgJ3VzZXItMTIzJyxcbiAgICAgICAgJ3ByaW1hcnknLFxuICAgICAgICAndXNlci0xMjMnLFxuICAgICAgICAndml0YWxzJyxcbiAgICAgICAgJ3dyaXRlJyxcbiAgICAgICAgdHJ1ZSxcbiAgICAgICAgWydzZWxmLXdyaXRlJ10sXG4gICAgICAgIHsgcmVhc29uOiAnUHJpbWFyeSB1c2VyIHdyaXRpbmcgb3duIGRhdGEnIH1cbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGRlbnkgc2Vjb25kYXJ5IHVzZXJzIHdyaXRlIGFjY2VzcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNoZWNrV3JpdGVBY2Nlc3MoJ3NlY29uZGFyeS00NTYnLCAnc2Vjb25kYXJ5JywgJ3ByaW1hcnktMTIzJywgJ3ZpdGFscycpO1xuICAgICAgXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdChtb2NrTG9nRGF0YUFjY2VzcykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgICAgICdzZWNvbmRhcnktNDU2JyxcbiAgICAgICAgJ3NlY29uZGFyeScsXG4gICAgICAgICdwcmltYXJ5LTEyMycsXG4gICAgICAgICd2aXRhbHMnLFxuICAgICAgICAnd3JpdGUnLFxuICAgICAgICBmYWxzZSxcbiAgICAgICAgWyd3cml0ZS1hY2Nlc3MnXSxcbiAgICAgICAgeyByZWFzb246ICdXcml0ZSBhY2Nlc3MgZGVuaWVkJyB9XG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUGVybWlzc2lvbiBQcmVzZXRzJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgaGF2ZSBjb3JyZWN0IGRlZmF1bHQgcGVybWlzc2lvbnMnLCAoKSA9PiB7XG4gICAgICBleHBlY3QoREVGQVVMVF9QRVJNSVNTSU9OUykudG9FcXVhbCh7XG4gICAgICAgIGNhblZpZXdWaXRhbHM6IHRydWUsXG4gICAgICAgIGNhblZpZXdNZWRpY2F0aW9uczogdHJ1ZSxcbiAgICAgICAgY2FuVmlld0FwcG9pbnRtZW50czogdHJ1ZSxcbiAgICAgICAgY2FuVmlld0hlYWx0aFJlY29yZHM6IGZhbHNlLFxuICAgICAgICBjYW5SZWNlaXZlQWxlcnRzOiB0cnVlLFxuICAgICAgICBjYW5TZW5kTWVzc2FnZXM6IHRydWUsXG4gICAgICAgIGNhbk1hbmFnZURldmljZXM6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhdmUgY29ycmVjdCBmdWxsIGFjY2VzcyBwZXJtaXNzaW9ucycsICgpID0+IHtcbiAgICAgIGV4cGVjdChGVUxMX0FDQ0VTU19QRVJNSVNTSU9OUykudG9FcXVhbCh7XG4gICAgICAgIGNhblZpZXdWaXRhbHM6IHRydWUsXG4gICAgICAgIGNhblZpZXdNZWRpY2F0aW9uczogdHJ1ZSxcbiAgICAgICAgY2FuVmlld0FwcG9pbnRtZW50czogdHJ1ZSxcbiAgICAgICAgY2FuVmlld0hlYWx0aFJlY29yZHM6IHRydWUsXG4gICAgICAgIGNhblJlY2VpdmVBbGVydHM6IHRydWUsXG4gICAgICAgIGNhblNlbmRNZXNzYWdlczogdHJ1ZSxcbiAgICAgICAgY2FuTWFuYWdlRGV2aWNlczogdHJ1ZSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBoYXZlIGNvcnJlY3QgbGltaXRlZCBhY2Nlc3MgcGVybWlzc2lvbnMnLCAoKSA9PiB7XG4gICAgICBleHBlY3QoTElNSVRFRF9BQ0NFU1NfUEVSTUlTU0lPTlMpLnRvRXF1YWwoe1xuICAgICAgICBjYW5WaWV3Vml0YWxzOiBmYWxzZSxcbiAgICAgICAgY2FuVmlld01lZGljYXRpb25zOiBmYWxzZSxcbiAgICAgICAgY2FuVmlld0FwcG9pbnRtZW50czogdHJ1ZSxcbiAgICAgICAgY2FuVmlld0hlYWx0aFJlY29yZHM6IGZhbHNlLFxuICAgICAgICBjYW5SZWNlaXZlQWxlcnRzOiBmYWxzZSxcbiAgICAgICAgY2FuU2VuZE1lc3NhZ2VzOiB0cnVlLFxuICAgICAgICBjYW5NYW5hZ2VEZXZpY2VzOiBmYWxzZSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUGVybWlzc2lvbiBNYXRyaXgnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBtYXAgZGF0YSB0eXBlcyB0byBwZXJtaXNzaW9uIGtleXMgY29ycmVjdGx5JywgKCkgPT4ge1xuICAgICAgZXhwZWN0KFBFUk1JU1NJT05fTUFUUklYKS50b0VxdWFsKHtcbiAgICAgICAgdml0YWxzOiAnY2FuVmlld1ZpdGFscycsXG4gICAgICAgIG1lZGljYXRpb25zOiAnY2FuVmlld01lZGljYXRpb25zJyxcbiAgICAgICAgYXBwb2ludG1lbnRzOiAnY2FuVmlld0FwcG9pbnRtZW50cycsXG4gICAgICAgIGhlYWx0aFJlY29yZHM6ICdjYW5WaWV3SGVhbHRoUmVjb3JkcycsXG4gICAgICAgIGFsZXJ0czogJ2NhblJlY2VpdmVBbGVydHMnLFxuICAgICAgICBtZXNzYWdlczogJ2NhblNlbmRNZXNzYWdlcycsXG4gICAgICAgIGRldmljZXM6ICdjYW5NYW5hZ2VEZXZpY2VzJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19