import { PermissionSet } from './types';
/**
 * Permission Matrix - Maps data types to required permissions
 * Requirements: 8.4, 8.5 - Granular permission control
 */
export declare const PERMISSION_MATRIX: {
    readonly vitals: "canViewVitals";
    readonly medications: "canViewMedications";
    readonly appointments: "canViewAppointments";
    readonly healthRecords: "canViewHealthRecords";
    readonly alerts: "canReceiveAlerts";
    readonly messages: "canSendMessages";
    readonly devices: "canManageDevices";
};
export type DataType = keyof typeof PERMISSION_MATRIX;
export type PermissionKey = typeof PERMISSION_MATRIX[DataType];
/**
 * Check if a user has permission to access specific data
 * Requirements: 8.4, 8.5 - Verify permissions before data access
 */
export declare function checkPermission(requestingUserId: string, requestingUserType: 'primary' | 'secondary', targetUserId: string, dataType: DataType, action?: 'read' | 'write' | 'delete'): Promise<boolean>;
/**
 * Check multiple permissions at once
 * Requirements: 8.4, 8.5 - Efficient permission checking
 */
export declare function checkMultiplePermissions(requestingUserId: string, requestingUserType: 'primary' | 'secondary', targetUserId: string, dataTypes: DataType[], action?: 'read' | 'write' | 'delete'): Promise<Record<DataType, boolean>>;
/**
 * Verify care circle membership
 * Requirements: 8.4, 8.5 - Validate care circle relationships
 */
export declare function verifyCareCircleMembership(secondaryUserId: string, primaryUserId: string): Promise<boolean>;
/**
 * Get effective permissions for a care circle member
 * Requirements: 8.4, 8.5 - Retrieve permission set
 */
export declare function getEffectivePermissions(secondaryUserId: string, primaryUserId: string): Promise<PermissionSet | null>;
/**
 * Filter data based on permissions
 * Requirements: 8.5 - Selective data sharing
 */
export declare function filterDataByPermissions<T extends Record<string, unknown>>(data: T, permissions: PermissionSet, dataTypeMap: Partial<Record<keyof T, DataType>>): Partial<T>;
/**
 * Validate write access
 * Requirements: 8.4, 8.5 - Restrict write operations
 */
export declare function checkWriteAccess(requestingUserId: string, requestingUserType: 'primary' | 'secondary', targetUserId: string, dataType: DataType): Promise<boolean>;
/**
 * Default permission set for new care circle members
 * Requirements: 8.5 - Default permissions
 */
export declare const DEFAULT_PERMISSIONS: PermissionSet;
/**
 * Full access permission set (for close family members)
 * Requirements: 8.5 - Permission presets
 */
export declare const FULL_ACCESS_PERMISSIONS: PermissionSet;
/**
 * Limited access permission set (for distant relatives or friends)
 * Requirements: 8.5 - Permission presets
 */
export declare const LIMITED_ACCESS_PERMISSIONS: PermissionSet;
