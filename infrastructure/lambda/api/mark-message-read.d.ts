import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Mark a message as read and notify the sender
 */
export declare function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
