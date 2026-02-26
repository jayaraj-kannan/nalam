// Access Control Logic for Health Data Sharing
// Requirements: 8.4, 8.5 - Permission-based access control with audit logging

import { PermissionSet } from './types';
import { getCareCircleMember } from './data-access/care-circle';
import { logDataAccess, logCareCircleAccess } from './audit-logger';

/**
 * Permission Matrix - Maps data types to required permissions
 * Requirements: 8.4, 8.5 - Granular permission control
 */
export const PERMISSION_MATRIX = {
  vitals: 'canViewVitals',
  medications: 'canViewMedications',
  appointments: 'canViewAppointments',
  healthRecords: 'canViewHealthRecords',
  alerts: 'canReceiveAlerts',
  messages: 'canSendMessages',
  devices: 'canManageDevices',
} as const;

export type DataType = keyof typeof PERMISSION_MATRIX;
export type PermissionKey = typeof PERMISSION_MATRIX[DataType];

/**
 * Check if a user has permission to access specific data
 * Requirements: 8.4, 8.5 - Verify permissions before data access
 */
export async function checkPermission(
  requestingUserId: string,
  requestingUserType: 'primary' | 'secondary',
  targetUserId: string,
  dataType: DataType,
  action: 'read' | 'write' | 'delete' = 'read'
): Promise<boolean> {
  try {
    // Primary users always have full access to their own data
    if (requestingUserType === 'primary' && requestingUserId === targetUserId) {
      await logDataAccess(
        requestingUserId,
        requestingUserType,
        targetUserId,
        dataType,
        action,
        true,
        ['self-access'],
        { reason: 'Primary user accessing own data' }
      );
      return true;
    }

    // Secondary users need explicit permissions
    if (requestingUserType === 'secondary') {
      const careCircleMember = await getCareCircleMember(targetUserId, requestingUserId);
      
      if (!careCircleMember) {
        await logDataAccess(
          requestingUserId,
          requestingUserType,
          targetUserId,
          dataType,
          action,
          false,
          ['care-circle-membership'],
          { reason: 'Not a care circle member' }
        );
        return false;
      }

      const requiredPermission = PERMISSION_MATRIX[dataType];
      const hasPermission = careCircleMember.permissions[requiredPermission as keyof PermissionSet];

      await logDataAccess(
        requestingUserId,
        requestingUserType,
        targetUserId,
        dataType,
        action,
        hasPermission,
        [requiredPermission],
        {
          relationship: careCircleMember.relationship,
          allPermissions: careCircleMember.permissions,
        }
      );

      return hasPermission;
    }

    // Primary users cannot access other primary users' data
    await logDataAccess(
      requestingUserId,
      requestingUserType,
      targetUserId,
      dataType,
      action,
      false,
      ['cross-user-access'],
      { reason: 'Primary user attempting to access another user\'s data' }
    );
    return false;
  } catch (error) {
    console.error('Permission check error:', error);
    await logDataAccess(
      requestingUserId,
      requestingUserType,
      targetUserId,
      dataType,
      action,
      false,
      ['error'],
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    return false;
  }
}

/**
 * Check multiple permissions at once
 * Requirements: 8.4, 8.5 - Efficient permission checking
 */
export async function checkMultiplePermissions(
  requestingUserId: string,
  requestingUserType: 'primary' | 'secondary',
  targetUserId: string,
  dataTypes: DataType[],
  action: 'read' | 'write' | 'delete' = 'read'
): Promise<Record<DataType, boolean>> {
  const results: Partial<Record<DataType, boolean>> = {};
  
  for (const dataType of dataTypes) {
    results[dataType] = await checkPermission(
      requestingUserId,
      requestingUserType,
      targetUserId,
      dataType,
      action
    );
  }
  
  return results as Record<DataType, boolean>;
}

/**
 * Verify care circle membership
 * Requirements: 8.4, 8.5 - Validate care circle relationships
 */
export async function verifyCareCircleMembership(
  secondaryUserId: string,
  primaryUserId: string
): Promise<boolean> {
  try {
    const member = await getCareCircleMember(primaryUserId, secondaryUserId);
    const isMember = member !== null;

    await logCareCircleAccess(
      secondaryUserId,
      primaryUserId,
      'verify-membership',
      isMember,
      ['care-circle-membership'],
      { isMember }
    );

    return isMember;
  } catch (error) {
    console.error('Care circle membership verification error:', error);
    await logCareCircleAccess(
      secondaryUserId,
      primaryUserId,
      'verify-membership',
      false,
      ['error'],
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    return false;
  }
}

/**
 * Get effective permissions for a care circle member
 * Requirements: 8.4, 8.5 - Retrieve permission set
 */
export async function getEffectivePermissions(
  secondaryUserId: string,
  primaryUserId: string
): Promise<PermissionSet | null> {
  try {
    const member = await getCareCircleMember(primaryUserId, secondaryUserId);
    
    if (!member) {
      await logCareCircleAccess(
        secondaryUserId,
        primaryUserId,
        'get-permissions',
        false,
        ['care-circle-membership'],
        { reason: 'Not a care circle member' }
      );
      return null;
    }

    await logCareCircleAccess(
      secondaryUserId,
      primaryUserId,
      'get-permissions',
      true,
      Object.keys(member.permissions),
      { permissions: member.permissions }
    );

    return member.permissions;
  } catch (error) {
    console.error('Get effective permissions error:', error);
    await logCareCircleAccess(
      secondaryUserId,
      primaryUserId,
      'get-permissions',
      false,
      ['error'],
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    return null;
  }
}

/**
 * Filter data based on permissions
 * Requirements: 8.5 - Selective data sharing
 */
export function filterDataByPermissions<T extends Record<string, unknown>>(
  data: T,
  permissions: PermissionSet,
  dataTypeMap: Partial<Record<keyof T, DataType>>
): Partial<T> {
  const filtered: Partial<T> = {};

  for (const [key, value] of Object.entries(data)) {
    const dataType = dataTypeMap[key as keyof T];
    
    if (!dataType) {
      // If no data type mapping, include by default
      filtered[key as keyof T] = value as T[keyof T];
      continue;
    }

    const requiredPermission = PERMISSION_MATRIX[dataType];
    if (permissions[requiredPermission as keyof PermissionSet]) {
      filtered[key as keyof T] = value as T[keyof T];
    }
  }

  return filtered;
}

/**
 * Validate write access
 * Requirements: 8.4, 8.5 - Restrict write operations
 */
export async function checkWriteAccess(
  requestingUserId: string,
  requestingUserType: 'primary' | 'secondary',
  targetUserId: string,
  dataType: DataType
): Promise<boolean> {
  // Only primary users can write their own data
  // Secondary users have read-only access
  if (requestingUserType === 'primary' && requestingUserId === targetUserId) {
    await logDataAccess(
      requestingUserId,
      requestingUserType,
      targetUserId,
      dataType,
      'write',
      true,
      ['self-write'],
      { reason: 'Primary user writing own data' }
    );
    return true;
  }

  await logDataAccess(
    requestingUserId,
    requestingUserType,
    targetUserId,
    dataType,
    'write',
    false,
    ['write-access'],
    { reason: 'Write access denied' }
  );
  return false;
}

/**
 * Default permission set for new care circle members
 * Requirements: 8.5 - Default permissions
 */
export const DEFAULT_PERMISSIONS: PermissionSet = {
  canViewVitals: true,
  canViewMedications: true,
  canViewAppointments: true,
  canViewHealthRecords: false, // Sensitive, opt-in
  canReceiveAlerts: true,
  canSendMessages: true,
  canManageDevices: false, // Restricted
};

/**
 * Full access permission set (for close family members)
 * Requirements: 8.5 - Permission presets
 */
export const FULL_ACCESS_PERMISSIONS: PermissionSet = {
  canViewVitals: true,
  canViewMedications: true,
  canViewAppointments: true,
  canViewHealthRecords: true,
  canReceiveAlerts: true,
  canSendMessages: true,
  canManageDevices: true,
};

/**
 * Limited access permission set (for distant relatives or friends)
 * Requirements: 8.5 - Permission presets
 */
export const LIMITED_ACCESS_PERMISSIONS: PermissionSet = {
  canViewVitals: false,
  canViewMedications: false,
  canViewAppointments: true,
  canViewHealthRecords: false,
  canReceiveAlerts: false,
  canSendMessages: true,
  canManageDevices: false,
};
