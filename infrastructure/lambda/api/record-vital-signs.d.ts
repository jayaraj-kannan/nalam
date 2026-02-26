import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Record vital signs for a user
 * POST /api/v1/health/vitals
 */
export declare function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
