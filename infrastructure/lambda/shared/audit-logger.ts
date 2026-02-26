// Audit Logging System
// Requirements: 8.4, 8.5 - Audit logging for all access events

import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { TABLES, putItem } from './dynamodb-client';

const cloudwatchLogs = new CloudWatchLogsClient({});

const LOG_GROUP_NAME = process.env.AUDIT_LOG_GROUP || '/healthcare-monitoring/audit';
const LOG_STREAM_NAME = process.env.AUDIT_LOG_STREAM || 'access-events';

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
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    // Store in DynamoDB for queryable audit trail
    await putItem('audit-logs', {
      eventId: `${event.userId}-${Date.now()}`,
      ...event,
      ttl: Math.floor(Date.now() / 1000) + (7 * 365 * 24 * 60 * 60), // 7 years for HIPAA
    });

    // Also log to CloudWatch for real-time monitoring
    const logMessage = JSON.stringify(event);
    
    try {
      await cloudwatchLogs.send(
        new PutLogEventsCommand({
          logGroupName: LOG_GROUP_NAME,
          logStreamName: LOG_STREAM_NAME,
          logEvents: [
            {
              message: logMessage,
              timestamp: Date.now(),
            },
          ],
        })
      );
    } catch (cwError) {
      // Don't fail the operation if CloudWatch logging fails
      console.error('CloudWatch logging failed:', cwError);
    }
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't throw - audit logging failure shouldn't break the application
  }
}

/**
 * Log data access event
 * Requirements: 8.4, 8.5 - Log all data access with user and permissions
 */
export async function logDataAccess(
  userId: string,
  userType: 'primary' | 'secondary',
  targetUserId: string,
  dataType: string,
  action: 'read' | 'write' | 'delete',
  success: boolean,
  permissionsChecked: string[],
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    eventType: 'DATA_ACCESS',
    userId,
    userType,
    targetUserId,
    dataType,
    action,
    timestamp: new Date().toISOString(),
    success,
    permissionsChecked,
    ...metadata,
  });
}

/**
 * Log permission change event
 * Requirements: 8.5 - Log all permission changes
 */
export async function logPermissionChange(
  userId: string,
  userType: string,
  targetUserId: string,
  primaryUserId: string,
  oldPermissions: Record<string, boolean>,
  newPermissions: Record<string, boolean>,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    eventType: 'PERMISSION_CHANGE',
    userId,
    userType,
    targetUserId,
    timestamp: new Date().toISOString(),
    success: true,
    dataAccessed: [
      `Old: ${JSON.stringify(oldPermissions)}`,
      `New: ${JSON.stringify(newPermissions)}`,
      `Primary: ${primaryUserId}`,
    ],
    ...metadata,
  });
}

/**
 * Log care circle access event
 * Requirements: 8.4, 8.5 - Log care circle member access
 */
export async function logCareCircleAccess(
  secondaryUserId: string,
  primaryUserId: string,
  action: string,
  success: boolean,
  permissionsChecked: string[],
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    eventType: 'CARE_CIRCLE_ACCESS',
    userId: secondaryUserId,
    userType: 'secondary',
    targetUserId: primaryUserId,
    action,
    timestamp: new Date().toISOString(),
    success,
    permissionsChecked,
    ...metadata,
  });
}
