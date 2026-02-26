// Alerts Table Data Access Layer
// Requirements: 3.1, 8.1, 8.4

import { HealthAlert, AlertSeverity } from '../types';
import { TABLES, putItem, getItem, queryItems, updateItem, deleteItem } from '../dynamodb-client';

// ============================================================================
// Alert Operations
// ============================================================================

export async function createAlert(alert: Omit<HealthAlert, 'id'>): Promise<string> {
  const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const healthAlert: HealthAlert = {
    ...alert,
    id: alertId,
    timestamp: alert.timestamp || new Date(),
  };

  await putItem(TABLES.ALERTS, {
    alertId,
    userId: healthAlert.userId,
    type: healthAlert.type,
    severity: healthAlert.severity,
    message: healthAlert.message,
    timestamp: healthAlert.timestamp.toISOString(),
    acknowledged: healthAlert.acknowledged,
    acknowledgedBy: healthAlert.acknowledgedBy,
    acknowledgedAt: healthAlert.acknowledgedAt?.toISOString(),
    escalated: healthAlert.escalated,
    escalationLevel: healthAlert.escalationLevel,
    relatedData: healthAlert.relatedData,
    status: healthAlert.acknowledged ? 'acknowledged' : 'pending',
  });

  return alertId;
}

export async function getAlert(alertId: string, timestamp: string): Promise<HealthAlert | null> {
  const result = await getItem<HealthAlert>(TABLES.ALERTS, { alertId, timestamp });

  if (!result) return null;

  return {
    ...result,
    timestamp: new Date(result.timestamp),
    acknowledgedAt: result.acknowledgedAt ? new Date(result.acknowledgedAt) : undefined,
  };
}

export async function getAlertsByUser(
  userId: string,
  startTime?: Date,
  endTime?: Date,
  limit?: number
): Promise<HealthAlert[]> {
  let keyConditionExpression = 'userId = :userId';
  const expressionAttributeValues: Record<string, unknown> = { ':userId': userId };

  if (startTime && endTime) {
    keyConditionExpression += ' AND #timestamp BETWEEN :startTime AND :endTime';
    expressionAttributeValues[':startTime'] = startTime.toISOString();
    expressionAttributeValues[':endTime'] = endTime.toISOString();
  } else if (startTime) {
    keyConditionExpression += ' AND #timestamp >= :startTime';
    expressionAttributeValues[':startTime'] = startTime.toISOString();
  }

  const results = await queryItems<HealthAlert>(
    TABLES.ALERTS,
    keyConditionExpression,
    expressionAttributeValues,
    'userId-timestamp-index',
    undefined,
    limit
  );

  return results.map((alert) => ({
    ...alert,
    timestamp: new Date(alert.timestamp),
    acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
  }));
}

export async function getAlertsByStatus(
  status: string,
  startTime?: Date,
  endTime?: Date,
  limit?: number
): Promise<HealthAlert[]> {
  let keyConditionExpression = '#status = :status';
  const expressionAttributeValues: Record<string, unknown> = { ':status': status };

  if (startTime && endTime) {
    keyConditionExpression += ' AND #timestamp BETWEEN :startTime AND :endTime';
    expressionAttributeValues[':startTime'] = startTime.toISOString();
    expressionAttributeValues[':endTime'] = endTime.toISOString();
  } else if (startTime) {
    keyConditionExpression += ' AND #timestamp >= :startTime';
    expressionAttributeValues[':startTime'] = startTime.toISOString();
  }

  const results = await queryItems<HealthAlert>(
    TABLES.ALERTS,
    keyConditionExpression,
    expressionAttributeValues,
    'status-index',
    undefined,
    limit
  );

  return results.map((alert) => ({
    ...alert,
    timestamp: new Date(alert.timestamp),
    acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
  }));
}

export async function acknowledgeAlert(
  alertId: string,
  timestamp: string,
  acknowledgedBy: string
): Promise<void> {
  await updateItem(
    TABLES.ALERTS,
    { alertId, timestamp },
    'SET acknowledged = :acknowledged, acknowledgedBy = :acknowledgedBy, acknowledgedAt = :acknowledgedAt, #status = :status',
    {
      ':acknowledged': true,
      ':acknowledgedBy': acknowledgedBy,
      ':acknowledgedAt': new Date().toISOString(),
      ':status': 'acknowledged',
    },
    { '#status': 'status' }
  );
}

export async function escalateAlert(
  alertId: string,
  timestamp: string,
  escalationLevel: string
): Promise<void> {
  await updateItem(
    TABLES.ALERTS,
    { alertId, timestamp },
    'SET escalated = :escalated, escalationLevel = :escalationLevel',
    {
      ':escalated': true,
      ':escalationLevel': escalationLevel,
    }
  );
}

export async function deleteAlert(alertId: string, timestamp: string): Promise<void> {
  await deleteItem(TABLES.ALERTS, { alertId, timestamp });
}
