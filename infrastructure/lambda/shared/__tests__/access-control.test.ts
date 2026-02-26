// Access Control Unit Tests
// Requirements: 8.4, 8.5 - Test authorization and permission system

import {
  checkPermission,
  checkMultiplePermissions,
  verifyCareCircleMembership,
  getEffectivePermissions,
  filterDataByPermissions,
  checkWriteAccess,
  DEFAULT_PERMISSIONS,
  FULL_ACCESS_PERMISSIONS,
  LIMITED_ACCESS_PERMISSIONS,
  PERMISSION_MATRIX,
} from '../access-control';
import * as careCircleAccess from '../data-access/care-circle';
import * as auditLogger from '../audit-logger';

// Mock dependencies
jest.mock('../data-access/care-circle');
jest.mock('../audit-logger');

const mockGetCareCircleMember = careCircleAccess.getCareCircleMember as jest.MockedFunction<
  typeof careCircleAccess.getCareCircleMember
>;
const mockLogDataAccess = auditLogger.logDataAccess as jest.MockedFunction<
  typeof auditLogger.logDataAccess
>;
const mockLogCareCircleAccess = auditLogger.logCareCircleAccess as jest.MockedFunction<
  typeof auditLogger.logCareCircleAccess
>;

describe('Access Control System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkPermission', () => {
    it('should allow primary users to access their own data', async () => {
      const result = await checkPermission('user-123', 'primary', 'user-123', 'vitals', 'read');
      
      expect(result).toBe(true);
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        'user-123',
        'primary',
        'user-123',
        'vitals',
        'read',
        true,
        ['self-access'],
        { reason: 'Primary user accessing own data' }
      );
    });

    it('should deny primary users access to other users\' data', async () => {
      const result = await checkPermission('user-123', 'primary', 'user-456', 'vitals', 'read');
      
      expect(result).toBe(false);
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        'user-123',
        'primary',
        'user-456',
        'vitals',
        'read',
        false,
        ['cross-user-access'],
        { reason: 'Primary user attempting to access another user\'s data' }
      );
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

      const result = await checkPermission(
        'secondary-456',
        'secondary',
        'primary-123',
        'vitals',
        'read'
      );
      
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

      const result = await checkPermission(
        'secondary-456',
        'secondary',
        'primary-123',
        'vitals',
        'read'
      );
      
      expect(result).toBe(false);
    });

    it('should deny secondary users who are not care circle members', async () => {
      mockGetCareCircleMember.mockResolvedValue(null);

      const result = await checkPermission(
        'secondary-456',
        'secondary',
        'primary-123',
        'vitals',
        'read'
      );
      
      expect(result).toBe(false);
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        'secondary-456',
        'secondary',
        'primary-123',
        'vitals',
        'read',
        false,
        ['care-circle-membership'],
        { reason: 'Not a care circle member' }
      );
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

      const result = await checkMultiplePermissions(
        'secondary-456',
        'secondary',
        'primary-123',
        ['vitals', 'medications', 'appointments'],
        'read'
      );
      
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
        permissions: DEFAULT_PERMISSIONS,
        joinedAt: '2024-01-01T00:00:00Z',
        lastActive: '2024-01-15T00:00:00Z',
      });

      const result = await verifyCareCircleMembership('secondary-456', 'primary-123');
      
      expect(result).toBe(true);
      expect(mockLogCareCircleAccess).toHaveBeenCalledWith(
        'secondary-456',
        'primary-123',
        'verify-membership',
        true,
        ['care-circle-membership'],
        { isMember: true }
      );
    });

    it('should reject invalid care circle membership', async () => {
      mockGetCareCircleMember.mockResolvedValue(null);

      const result = await verifyCareCircleMembership('secondary-456', 'primary-123');
      
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

      const result = await getEffectivePermissions('secondary-456', 'primary-123');
      
      expect(result).toEqual(expectedPermissions);
    });

    it('should return null for non-members', async () => {
      mockGetCareCircleMember.mockResolvedValue(null);

      const result = await getEffectivePermissions('secondary-456', 'primary-123');
      
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
        vitals: 'vitals' as const,
        medications: 'medications' as const,
        healthRecords: 'healthRecords' as const,
        devices: 'devices' as const,
      };

      const filtered = filterDataByPermissions(data, permissions, dataTypeMap);
      
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
      const result = await checkWriteAccess('user-123', 'primary', 'user-123', 'vitals');
      
      expect(result).toBe(true);
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        'user-123',
        'primary',
        'user-123',
        'vitals',
        'write',
        true,
        ['self-write'],
        { reason: 'Primary user writing own data' }
      );
    });

    it('should deny secondary users write access', async () => {
      const result = await checkWriteAccess('secondary-456', 'secondary', 'primary-123', 'vitals');
      
      expect(result).toBe(false);
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        'secondary-456',
        'secondary',
        'primary-123',
        'vitals',
        'write',
        false,
        ['write-access'],
        { reason: 'Write access denied' }
      );
    });
  });

  describe('Permission Presets', () => {
    it('should have correct default permissions', () => {
      expect(DEFAULT_PERMISSIONS).toEqual({
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
      expect(FULL_ACCESS_PERMISSIONS).toEqual({
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
      expect(LIMITED_ACCESS_PERMISSIONS).toEqual({
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
      expect(PERMISSION_MATRIX).toEqual({
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
