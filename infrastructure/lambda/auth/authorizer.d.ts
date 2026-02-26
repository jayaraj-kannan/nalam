import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
export declare function handler(event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult>;
