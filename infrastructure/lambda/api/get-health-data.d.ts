import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Get health data for a user with permission checks
 * Requirements: 8.4, 8.5 - Secure data access with permissions
 */
export declare function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
