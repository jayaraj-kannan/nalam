// Health Records Table Data Access Layer
// Requirements: 1.1, 8.1, 8.4

import { HealthRecord, HealthRecordType } from '../types';
import { TABLES, putItem, getItem, queryItems, deleteItem } from '../dynamodb-client';

// ============================================================================
// Health Records Operations
// ============================================================================

export async function createHealthRecord(record: Omit<HealthRecord, 'id'>): Promise<string> {
  const id = `${record.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const healthRecord: HealthRecord = {
    ...record,
    id,
    timestamp: record.timestamp || new Date(),
  };

  await putItem(TABLES.HEALTH_RECORDS, {
    userId: healthRecord.userId,
    timestamp: healthRecord.timestamp.toISOString(),
    id: healthRecord.id,
    type: healthRecord.type,
    data: healthRecord.data,
    source: healthRecord.source,
    verified: healthRecord.verified,
  });

  return id;
}

export async function getHealthRecord(
  userId: string,
  timestamp: string
): Promise<HealthRecord | null> {
  return await getItem<HealthRecord>(TABLES.HEALTH_RECORDS, { userId, timestamp });
}

export async function getHealthRecordsByUser(
  userId: string,
  startTime?: Date,
  endTime?: Date,
  limit?: number
): Promise<HealthRecord[]> {
  let keyConditionExpression = 'userId = :userId';
  const expressionAttributeValues: Record<string, unknown> = { ':userId': userId };

  if (startTime && endTime) {
    keyConditionExpression += ' AND #timestamp BETWEEN :startTime AND :endTime';
    expressionAttributeValues[':startTime'] = startTime.toISOString();
    expressionAttributeValues[':endTime'] = endTime.toISOString();
  } else if (startTime) {
    keyConditionExpression += ' AND #timestamp >= :startTime';
    expressionAttributeValues[':startTime'] = startTime.toISOString();
  } else if (endTime) {
    keyConditionExpression += ' AND #timestamp <= :endTime';
    expressionAttributeValues[':endTime'] = endTime.toISOString();
  }

  const results = await queryItems<HealthRecord>(
    TABLES.HEALTH_RECORDS,
    keyConditionExpression,
    expressionAttributeValues,
    undefined,
    undefined,
    limit
  );

  return results.map((record) => ({
    ...record,
    timestamp: new Date(record.timestamp),
  }));
}

export async function getHealthRecordsByType(
  type: HealthRecordType,
  startTime?: Date,
  endTime?: Date,
  limit?: number
): Promise<HealthRecord[]> {
  let keyConditionExpression = '#type = :type';
  const expressionAttributeValues: Record<string, unknown> = { ':type': type };

  if (startTime && endTime) {
    keyConditionExpression += ' AND #timestamp BETWEEN :startTime AND :endTime';
    expressionAttributeValues[':startTime'] = startTime.toISOString();
    expressionAttributeValues[':endTime'] = endTime.toISOString();
  } else if (startTime) {
    keyConditionExpression += ' AND #timestamp >= :startTime';
    expressionAttributeValues[':startTime'] = startTime.toISOString();
  }

  return await queryItems<HealthRecord>(
    TABLES.HEALTH_RECORDS,
    keyConditionExpression,
    expressionAttributeValues,
    'type-timestamp-index',
    undefined,
    limit
  );
}

export async function deleteHealthRecord(userId: string, timestamp: string): Promise<void> {
  await deleteItem(TABLES.HEALTH_RECORDS, { userId, timestamp });
}
