import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Analyze health trends for a user
 * GET /api/v1/health/trends/{userId}
 */
export declare function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
