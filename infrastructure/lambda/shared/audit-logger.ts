// Audit Logging System
// Requirements: 8.4, 8.5 - Audit logging for all access events

import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const cloudwatchLogs = new CloudWatchLogsClient({});
const dynamodb = new DynamoDBClient({});

const LOG_GROUP_NAME = process.env.AUDIT_LOG_GROUP || '/healthcare-monitoring/audit';
const LOG_STREAM_NAME = process.env.AUDIT_LOG_STREAM || 'access-events';
const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE || '';

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
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event to both CloudWatch Logs and DynamoDB
 * Requirements: 8.4 - Log all access events with timestamps
 * Task 16.3: Enhanced request logging for audit trail
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    // Enrich event with additional metadata
    const enrichedEvent = {
      ...event,
      eventId: `${event.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ttl: Math.floor(Date.now() / 1000) + (7 * 365 * 24 * 60 * 60), // 7 years for HIPAA
      environment: process.env.ENVIRONMENT || 'unknown',
      region: process.env.AWS_REGION || 'unknown',
    };

    // Store in DynamoDB for queryable audit trail
    if (AUDIT_LOGS_TABLE) {
      const putCommand = new PutItemCommand({
        TableName: AUDIT_LOGS_TABLE,
        Item: marshall(enrichedEvent),
      });
      await dynamodb.send(putCommand);
    }

    // Also log to CloudWatch for real-time monitoring
    const logMessage = JSON.stringify(enrichedEvent);
    
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
    metadata,
  });
}

/**
 * Log API request for comprehensive audit trail
 * Requirements: 8.4 - Add request logging for audit trail
 * Task 16.3: Comprehensive request logging
 */
export async function logApiRequest(
  userId: string,
  userType: string,
  method: string,
  path: string,
  statusCode: number,
  requestId: string,
  duration: number,
  ipAddress?: string,
  userAgent?: string,
  requestBody?: unknown,
  responseSize?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    eventType: 'API_REQUEST',
    userId,
    userType,
    action: method,
    resource: path,
    timestamp: new Date().toISOString(),
    success: statusCode >= 200 && statusCode < 400,
    ipAddress,
    userAgent,
    metadata: {
      statusCode,
      requestId,
      duration,
      responseSize,
      requestBodySize: requestBody ? JSON.stringify(requestBody).length : 0,
      ...metadata,
    },
  });
}

/**
 * Log security event (suspicious activity, rate limiting, etc.)
 * Requirements: 8.4 - Security event logging
 * Task 16.3: Enhanced security monitoring
 */
export async function logSecurityEvent(
  eventType: string,
  userId: string,
  userType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  description: string,
  ipAddress?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    eventType: `SECURITY_${eventType.toUpperCase()}`,
    userId,
    userType,
    timestamp: new Date().toISOString(),
    success: false,
    ipAddress,
    errorMessage: description,
    metadata: {
      severity,
      ...metadata,
    },
  });
}
