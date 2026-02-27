/**
 * Notification Delivery Monitoring
 * Requirements: 9.1, 9.4 - Real-time notification delivery monitoring
 * 
 * Tracks notification delivery metrics and alerts on failures
 */

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { getDocClient } from './connection-pool';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const cloudwatch = new CloudWatchClient({});
const docClient = getDocClient();

const NOTIFICATION_METRICS_TABLE = process.env.NOTIFICATION_METRICS_TABLE || 'healthcare-notification-metrics-dev';

export interface NotificationMetric {
  notificationId: string;
  userId: string;
  type: 'push' | 'sms' | 'email';
  channel: string;
  status: 'sent' | 'delivered' | 'failed' | 'retrying';
  attempt: number;
  sentAt: string;
  deliveredAt?: string;
  failedAt?: string;
  error?: string;
  latencyMs?: number;
}

/**
 * Record notification attempt
 */
export async function recordNotificationAttempt(
  metric: NotificationMetric
): Promise<void> {
  try {
    // Store in DynamoDB for historical tracking
    await docClient.send(new PutCommand({
      TableName: NOTIFICATION_METRICS_TABLE,
      Item: {
        ...metric,
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days retention
      },
    }));

    // Send to CloudWatch for real-time monitoring
    await sendMetricToCloudWatch(metric);
  } catch (error) {
    console.error('Failed to record notification metric:', error);
    // Don't throw - we don't want monitoring to break the notification flow
  }
}

/**
 * Send metric to CloudWatch
 */
async function sendMetricToCloudWatch(metric: NotificationMetric): Promise<void> {
  const namespace = 'Healthcare/Notifications';
  const timestamp = new Date();

  const metricData = [
    {
      MetricName: 'NotificationAttempt',
      Dimensions: [
        { Name: 'Type', Value: metric.type },
        { Name: 'Status', Value: metric.status },
        { Name: 'Channel', Value: metric.channel },
      ],
      Value: 1,
      Unit: 'Count',
      Timestamp: timestamp,
    },
  ];

  // Add latency metric if available
  if (metric.latencyMs !== undefined) {
    metricData.push({
      MetricName: 'NotificationLatency',
      Dimensions: [
        { Name: 'Type', Value: metric.type },
        { Name: 'Channel', Value: metric.channel },
      ],
      Value: metric.latencyMs,
      Unit: 'Milliseconds',
      Timestamp: timestamp,
    });
  }

  // Add failure metric if failed
  if (metric.status === 'failed') {
    metricData.push({
      MetricName: 'NotificationFailure',
      Dimensions: [
        { Name: 'Type', Value: metric.type },
        { Name: 'Channel', Value: metric.channel },
        { Name: 'Attempt', Value: metric.attempt.toString() },
      ],
      Value: 1,
      Unit: 'Count',
      Timestamp: timestamp,
    });
  }

  // Add success metric if delivered
  if (metric.status === 'delivered') {
    metricData.push({
      MetricName: 'NotificationSuccess',
      Dimensions: [
        { Name: 'Type', Value: metric.type },
        { Name: 'Channel', Value: metric.channel },
      ],
      Value: 1,
      Unit: 'Count',
      Timestamp: timestamp,
    });
  }

  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: namespace,
    MetricData: metricData,
  }));
}

/**
 * Get notification delivery statistics for a user
 */
export async function getNotificationStats(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<{
  total: number;
  delivered: number;
  failed: number;
  averageLatencyMs: number;
  byType: Record<string, { total: number; delivered: number; failed: number }>;
}> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: NOTIFICATION_METRICS_TABLE,
      KeyConditionExpression: 'userId = :userId AND sentAt BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':start': startTime.toISOString(),
        ':end': endTime.toISOString(),
      },
    }));

    const metrics = (result.Items || []) as NotificationMetric[];

    const stats = {
      total: metrics.length,
      delivered: metrics.filter(m => m.status === 'delivered').length,
      failed: metrics.filter(m => m.status === 'failed').length,
      averageLatencyMs: 0,
      byType: {} as Record<string, { total: number; delivered: number; failed: number }>,
    };

    // Calculate average latency
    const latencies = metrics
      .filter(m => m.latencyMs !== undefined)
      .map(m => m.latencyMs!);
    
    if (latencies.length > 0) {
      stats.averageLatencyMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    }

    // Group by type
    metrics.forEach(metric => {
      if (!stats.byType[metric.type]) {
        stats.byType[metric.type] = { total: 0, delivered: 0, failed: 0 };
      }
      stats.byType[metric.type].total++;
      if (metric.status === 'delivered') {
        stats.byType[metric.type].delivered++;
      } else if (metric.status === 'failed') {
        stats.byType[metric.type].failed++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Failed to get notification stats:', error);
    throw error;
  }
}

/**
 * Check if notification delivery is within SLA (30 seconds)
 * Requirements: 9.1 - notification delivery within 30 seconds
 */
export function isWithinSLA(metric: NotificationMetric): boolean {
  const SLA_THRESHOLD_MS = 30000; // 30 seconds
  return (metric.latencyMs || 0) <= SLA_THRESHOLD_MS;
}

/**
 * Get notifications that exceeded SLA
 */
export async function getSLAViolations(
  startTime: Date,
  endTime: Date
): Promise<NotificationMetric[]> {
  try {
    // This would require a GSI on sentAt for efficient querying
    // For now, we'll use a scan (not recommended for production at scale)
    const result = await docClient.send(new QueryCommand({
      TableName: NOTIFICATION_METRICS_TABLE,
      IndexName: 'sentAt-index', // Assumes GSI exists
      KeyConditionExpression: 'sentAt BETWEEN :start AND :end',
      FilterExpression: 'latencyMs > :threshold',
      ExpressionAttributeValues: {
        ':start': startTime.toISOString(),
        ':end': endTime.toISOString(),
        ':threshold': 30000,
      },
    }));

    return (result.Items || []) as NotificationMetric[];
  } catch (error) {
    console.error('Failed to get SLA violations:', error);
    return [];
  }
}
