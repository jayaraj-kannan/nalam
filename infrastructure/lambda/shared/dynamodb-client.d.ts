import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export declare const docClient: DynamoDBDocumentClient;
export declare const TABLES: {
    USERS: string;
    HEALTH_RECORDS: string;
    MEDICATIONS: string;
    APPOINTMENTS: string;
    ALERTS: string;
    CARE_CIRCLE: string;
    DEVICES: string;
};
export declare function putItem<T>(tableName: string, item: T): Promise<void>;
export declare function getItem<T>(tableName: string, key: Record<string, unknown>): Promise<T | null>;
export declare function queryItems<T>(tableName: string, keyConditionExpression: string, expressionAttributeValues: Record<string, unknown>, indexName?: string, filterExpression?: string, limit?: number): Promise<T[]>;
export declare function updateItem(tableName: string, key: Record<string, unknown>, updateExpression: string, expressionAttributeValues: Record<string, unknown>, expressionAttributeNames?: Record<string, string>): Promise<void>;
export declare function deleteItem(tableName: string, key: Record<string, unknown>): Promise<void>;
export declare function batchWriteItems(tableName: string, items: Record<string, unknown>[]): Promise<void>;
export declare function batchGetItems<T>(tableName: string, keys: Record<string, unknown>[]): Promise<T[]>;
