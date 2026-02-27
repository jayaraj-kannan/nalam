/**
 * Connection Pooling and Client Reuse for Lambda Functions
 * Optimizes performance by reusing AWS SDK clients across invocations
 * Requirements: 9.1 - Performance optimization for notification delivery
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TimestreamWriteClient } from '@aws-sdk/client-timestream-write';
import { TimestreamQueryClient } from '@aws-sdk/client-timestream-query';
import { SNSClient } from '@aws-sdk/client-sns';
import { SESClient } from '@aws-sdk/client-ses';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { S3Client } from '@aws-sdk/client-s3';

/**
 * Singleton pattern for AWS SDK clients
 * Clients are created once and reused across Lambda invocations
 */

// DynamoDB clients
let dynamoDBClient: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;

// Timestream clients
let timestreamWriteClient: TimestreamWriteClient | null = null;
let timestreamQueryClient: TimestreamQueryClient | null = null;

// Notification clients
let snsClient: SNSClient | null = null;
let sesClient: SESClient | null = null;

// Event and storage clients
let eventBridgeClient: EventBridgeClient | null = null;
let s3Client: S3Client | null = null;

const region = process.env.AWS_REGION || 'us-east-1';

/**
 * Get or create DynamoDB client with connection pooling
 */
export function getDynamoDBClient(): DynamoDBClient {
  if (!dynamoDBClient) {
    dynamoDBClient = new DynamoDBClient({
      region,
      maxAttempts: 3,
      requestHandler: {
        connectionTimeout: 3000,
        requestTimeout: 5000,
      },
    });
  }
  return dynamoDBClient;
}

/**
 * Get or create DynamoDB Document client
 */
export function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const client = getDynamoDBClient();
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });
  }
  return docClient;
}

/**
 * Get or create Timestream Write client
 */
export function getTimestreamWriteClient(): TimestreamWriteClient {
  if (!timestreamWriteClient) {
    timestreamWriteClient = new TimestreamWriteClient({
      region,
      maxAttempts: 3,
    });
  }
  return timestreamWriteClient;
}

/**
 * Get or create Timestream Query client
 */
export function getTimestreamQueryClient(): TimestreamQueryClient {
  if (!timestreamQueryClient) {
    timestreamQueryClient = new TimestreamQueryClient({
      region,
      maxAttempts: 3,
    });
  }
  return timestreamQueryClient;
}

/**
 * Get or create SNS client for push notifications and SMS
 */
export function getSNSClient(): SNSClient {
  if (!snsClient) {
    snsClient = new SNSClient({
      region,
      maxAttempts: 3,
      requestHandler: {
        connectionTimeout: 2000,
        requestTimeout: 5000,
      },
    });
  }
  return snsClient;
}

/**
 * Get or create SES client for email notifications
 */
export function getSESClient(): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({
      region,
      maxAttempts: 3,
      requestHandler: {
        connectionTimeout: 2000,
        requestTimeout: 5000,
      },
    });
  }
  return sesClient;
}

/**
 * Get or create EventBridge client
 */
export function getEventBridgeClient(): EventBridgeClient {
  if (!eventBridgeClient) {
    eventBridgeClient = new EventBridgeClient({
      region,
      maxAttempts: 3,
    });
  }
  return eventBridgeClient;
}

/**
 * Get or create S3 client
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region,
      maxAttempts: 3,
      requestHandler: {
        connectionTimeout: 3000,
        requestTimeout: 10000,
      },
    });
  }
  return s3Client;
}

/**
 * Cleanup function for testing or explicit resource cleanup
 * Note: In Lambda, clients are automatically cleaned up when the execution environment is recycled
 */
export function cleanupConnections(): void {
  dynamoDBClient = null;
  docClient = null;
  timestreamWriteClient = null;
  timestreamQueryClient = null;
  snsClient = null;
  sesClient = null;
  eventBridgeClient = null;
  s3Client = null;
}
