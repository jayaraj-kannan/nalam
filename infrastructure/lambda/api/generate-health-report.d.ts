import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Generate health report
 * POST /api/v1/health/reports/generate
 */
export declare function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
