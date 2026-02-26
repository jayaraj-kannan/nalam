import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Session Management Lambda
 *
 * Handles:
 * - Get current session info
 * - Validate session
 * - Logout (invalidate tokens)
 * - Global sign out (all devices)
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
