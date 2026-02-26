import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Update permissions for a care circle member
 * Requirements: 8.5 - Allow primary users to control data sharing
 */
export declare function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
