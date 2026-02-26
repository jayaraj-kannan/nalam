export interface AuditEvent {
    eventType: string;
    userId: string;
    userType: string;
    resource?: string;
    action?: string;
    targetUserId?: string;
    dataType?: string;
    timestamp: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
    email?: string;
    permissionsChecked?: string[];
    dataAccessed?: string[];
}
/**
 * Log an audit event to both CloudWatch Logs and DynamoDB
 * Requirements: 8.4 - Log all access events with timestamps
 */
export declare function logAuditEvent(event: AuditEvent): Promise<void>;
/**
 * Log data access event
 * Requirements: 8.4, 8.5 - Log all data access with user and permissions
 */
export declare function logDataAccess(userId: string, userType: 'primary' | 'secondary', targetUserId: string, dataType: string, action: 'read' | 'write' | 'delete', success: boolean, permissionsChecked: string[], metadata?: Record<string, unknown>): Promise<void>;
/**
 * Log permission change event
 * Requirements: 8.5 - Log all permission changes
 */
export declare function logPermissionChange(userId: string, userType: string, targetUserId: string, primaryUserId: string, oldPermissions: Record<string, boolean>, newPermissions: Record<string, boolean>, metadata?: Record<string, unknown>): Promise<void>;
/**
 * Log care circle access event
 * Requirements: 8.4, 8.5 - Log care circle member access
 */
export declare function logCareCircleAccess(secondaryUserId: string, primaryUserId: string, action: string, success: boolean, permissionsChecked: string[], metadata?: Record<string, unknown>): Promise<void>;
