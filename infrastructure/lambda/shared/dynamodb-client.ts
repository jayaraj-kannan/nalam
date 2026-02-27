// DynamoDB Data Access Layer with encryption at rest
// Requirements: 8.1, 8.4

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client with encryption
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Create document client for easier data manipulation
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Table names from environment variables
export const TABLES = {
  USERS: process.env.USERS_TABLE || '',
  HEALTH_RECORDS: process.env.HEALTH_RECORDS_TABLE || '',
  MEDICATIONS: process.env.MEDICATIONS_TABLE || '',
  APPOINTMENTS: process.env.APPOINTMENTS_TABLE || '',
  ALERTS: process.env.ALERTS_TABLE || '',
  CARE_CIRCLE: process.env.CARE_CIRCLE_TABLE || '',
  CARE_CIRCLE_INVITATIONS: process.env.CARE_CIRCLE_INVITATIONS_TABLE || '',
  CARE_CIRCLE_MESSAGES: process.env.CARE_CIRCLE_MESSAGES_TABLE || '',
  DEVICES: process.env.DEVICES_TABLE || '',
};

// ============================================================================
// Generic DynamoDB Operations
// ============================================================================

export async function putItem<T>(tableName: string, item: T): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item as Record<string, unknown>,
    })
  );
}

export async function getItem<T>(
  tableName: string,
  key: Record<string, unknown>
): Promise<T | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: key,
    })
  );
  return (result.Item as T) || null;
}

export async function queryItems<T>(
  tableName: string,
  keyConditionExpression: string,
  expressionAttributeValues: Record<string, unknown>,
  indexName?: string,
  filterExpression?: string,
  limit?: number
): Promise<T[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      IndexName: indexName,
      FilterExpression: filterExpression,
      Limit: limit,
    })
  );
  return (result.Items as T[]) || [];
}

export async function updateItem(
  tableName: string,
  key: Record<string, unknown>,
  updateExpression: string,
  expressionAttributeValues: Record<string, unknown>,
  expressionAttributeNames?: Record<string, string>
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
    })
  );
}

export async function deleteItem(
  tableName: string,
  key: Record<string, unknown>
): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: key,
    })
  );
}

export async function batchWriteItems(
  tableName: string,
  items: Record<string, unknown>[]
): Promise<void> {
  const batches = [];
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }

  for (const batch of batches) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map((item) => ({
            PutRequest: { Item: item },
          })),
        },
      })
    );
  }
}

export async function batchGetItems<T>(
  tableName: string,
  keys: Record<string, unknown>[]
): Promise<T[]> {
  const batches = [];
  for (let i = 0; i < keys.length; i += 100) {
    batches.push(keys.slice(i, i + 100));
  }

  const results: T[] = [];
  for (const batch of batches) {
    const result = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: batch,
          },
        },
      })
    );
    if (result.Responses?.[tableName]) {
      results.push(...(result.Responses[tableName] as T[]));
    }
  }
  return results;
}
