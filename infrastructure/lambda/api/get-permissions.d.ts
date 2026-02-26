import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Get permissions for care circle members
 * Requirements: 8.4, 8.5 - View permission matrix
 */
export declare function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
