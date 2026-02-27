// Audit Report Generator
// Requirements: 8.4 - Generate comprehensive audit reports

import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodb = new DynamoDBClient({});
const cloudwatchLogs = new CloudWatchLogsClient({});

const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE || '';
const AUDIT_LOG_GROUP = process.env.AUDIT_LOG_GROUP || '';

export interface AuditReportRequest {
  reportType: 'user' | 'eventType' | 'dateRange' | 'compliance';
  userId?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  targetUserId?: string;
}

export interface AuditReportResponse {
  reportId: string;
  generatedAt: string;
  reportType: string;
  summary: AuditSummary;
  events: AuditEvent[];
  compliance: ComplianceMetrics;
}

interface AuditSummary {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  eventsByType: Record<string, number>;
  uniqueUsers: number;
  dateRange: { start: string; end: string };
}

interface AuditEvent {
  eventId: string;
  eventType: string;
  userId: string;
  userType: string;
  timestamp: string;
  success: boolean;
  resource?: string;
  action?: string;
  targetUserId?: string;
  ipAddress?: string;
}

interface ComplianceMetrics {
  dataAccessEvents: number;
  permissionChanges: number;
  securityEvents: number;
  failedAccessAttempts: number;
  hipaaCompliant: boolean;
  issues: string[];
}

export const handler = async (event: AuditReportRequest): Promise<AuditReportResponse> => {
  console.log('Generating audit report:', JSON.stringify(event));

  const { reportType, userId, eventType, startDate, endDate, targetUserId } = event;

  // Query audit logs based on report type
  let events: AuditEvent[] = [];

  switch (reportType) {
    case 'user':
      if (!userId) throw new Error('userId required for user report');
      events = await queryByUser(userId, startDate, endDate);
      break;
    
    case 'eventType':
      if (!eventType) throw new Error('eventType required for eventType report');
      events = await queryByEventType(eventType, startDate, endDate);
      break;
    
    case 'dateRange':
      if (!startDate || !endDate) throw new Error('startDate and endDate required for dateRange report');
      events = await queryByDateRange(startDate, endDate);
      break;
    
    case 'compliance':
      events = await queryForCompliance(startDate, endDate);
      break;
    
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }

  // Generate summary
  const summary = generateSummary(events, startDate, endDate);

  // Calculate compliance metrics
  const compliance = calculateComplianceMetrics(events);

  const reportId = `audit-report-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  return {
    reportId,
    generatedAt: new Date().toISOString(),
    reportType,
    summary,
    events,
    compliance,
  };
};

async function queryByUser(userId: string, startDate?: string, endDate?: string): Promise<AuditEvent[]> {
  const params: any = {
    TableName: AUDIT_LOGS_TABLE,
    IndexName: 'userId-timestamp-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': { S: userId },
    },
  };

  if (startDate && endDate) {
    params.KeyConditionExpression += ' AND #ts BETWEEN :start AND :end';
    params.ExpressionAttributeNames = { '#ts': 'timestamp' };
    params.ExpressionAttributeValues[':start'] = { S: startDate };
    params.ExpressionAttributeValues[':end'] = { S: endDate };
  }

  const command = new QueryCommand(params);
  const response = await dynamodb.send(command);

  return (response.Items || []).map(item => unmarshall(item) as AuditEvent);
}

async function queryByEventType(eventType: string, startDate?: string, endDate?: string): Promise<AuditEvent[]> {
  const params: any = {
    TableName: AUDIT_LOGS_TABLE,
    IndexName: 'eventType-timestamp-index',
    KeyConditionExpression: 'eventType = :eventType',
    ExpressionAttributeValues: {
      ':eventType': { S: eventType },
    },
  };

  if (startDate && endDate) {
    params.KeyConditionExpression += ' AND #ts BETWEEN :start AND :end';
    params.ExpressionAttributeNames = { '#ts': 'timestamp' };
    params.ExpressionAttributeValues[':start'] = { S: startDate };
    params.ExpressionAttributeValues[':end'] = { S: endDate };
  }

  const command = new QueryCommand(params);
  const response = await dynamodb.send(command);

  return (response.Items || []).map(item => unmarshall(item) as AuditEvent);
}

async function queryByDateRange(startDate: string, endDate: string): Promise<AuditEvent[]> {
  // Use CloudWatch Logs for date range queries (more efficient)
  const command = new FilterLogEventsCommand({
    logGroupName: AUDIT_LOG_GROUP,
    startTime: new Date(startDate).getTime(),
    endTime: new Date(endDate).getTime(),
  });

  const response = await cloudwatchLogs.send(command);
  
  return (response.events || [])
    .map(event => {
      try {
        return JSON.parse(event.message || '{}') as AuditEvent;
      } catch {
        return null;
      }
    })
    .filter((event): event is AuditEvent => event !== null);
}

async function queryForCompliance(startDate?: string, endDate?: string): Promise<AuditEvent[]> {
  // Query all event types for compliance report
  const eventTypes = ['DATA_ACCESS', 'PERMISSION_CHANGE', 'SECURITY_*', 'API_REQUEST'];
  const allEvents: AuditEvent[] = [];

  for (const eventType of eventTypes) {
    const events = await queryByEventType(eventType, startDate, endDate);
    allEvents.push(...events);
  }

  return allEvents;
}

function generateSummary(events: AuditEvent[], startDate?: string, endDate?: string): AuditSummary {
  const eventsByType: Record<string, number> = {};
  const uniqueUsers = new Set<string>();
  let successfulEvents = 0;
  let failedEvents = 0;

  for (const event of events) {
    // Count by type
    eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    
    // Track unique users
    uniqueUsers.add(event.userId);
    
    // Count success/failure
    if (event.success) {
      successfulEvents++;
    } else {
      failedEvents++;
    }
  }

  // Determine date range
  const timestamps = events.map(e => e.timestamp).sort();
  const actualStartDate = startDate || (timestamps[0] || new Date().toISOString());
  const actualEndDate = endDate || (timestamps[timestamps.length - 1] || new Date().toISOString());

  return {
    totalEvents: events.length,
    successfulEvents,
    failedEvents,
    eventsByType,
    uniqueUsers: uniqueUsers.size,
    dateRange: {
      start: actualStartDate,
      end: actualEndDate,
    },
  };
}

function calculateComplianceMetrics(events: AuditEvent[]): ComplianceMetrics {
  let dataAccessEvents = 0;
  let permissionChanges = 0;
  let securityEvents = 0;
  let failedAccessAttempts = 0;
  const issues: string[] = [];

  for (const event of events) {
    if (event.eventType === 'DATA_ACCESS') {
      dataAccessEvents++;
      if (!event.success) {
        failedAccessAttempts++;
      }
    } else if (event.eventType === 'PERMISSION_CHANGE') {
      permissionChanges++;
    } else if (event.eventType.startsWith('SECURITY_')) {
      securityEvents++;
    }
  }

  // Check for compliance issues
  if (failedAccessAttempts > 10) {
    issues.push(`High number of failed access attempts: ${failedAccessAttempts}`);
  }

  if (securityEvents > 5) {
    issues.push(`Multiple security events detected: ${securityEvents}`);
  }

  // HIPAA compliance check
  const hipaaCompliant = issues.length === 0 && dataAccessEvents > 0;

  return {
    dataAccessEvents,
    permissionChanges,
    securityEvents,
    failedAccessAttempts,
    hipaaCompliant,
    issues,
  };
}
