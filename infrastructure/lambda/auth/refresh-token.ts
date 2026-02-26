import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, InitiateAuthCommand, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createSuccessResponse, createErrorResponse } from '../shared/types';

const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const PRIMARY_USER_POOL_CLIENT_ID = process.env.PRIMARY_USER_POOL_CLIENT_ID!;
const SECONDARY_USER_POOL_CLIENT_ID = process.env.SECONDARY_USER_POOL_CLIENT_ID!;
const USERS_TABLE = process.env.USERS_TABLE!;

interface RefreshTokenRequest {
  refreshToken: string;
  userType: 'primary' | 'secondary';
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: RefreshTokenRequest = JSON.parse(event.body);
    const { refreshToken, userType } = request;

    // Validate required fields
    if (!refreshToken || !userType) {
      return createErrorResponse(400, 'Missing required fields: refreshToken, userType');
    }

    if (!['primary', 'secondary'].includes(userType)) {
      return createErrorResponse(400, 'userType must be either "primary" or "secondary"');
    }

    // Select appropriate user pool client based on user type
    const clientId = userType === 'primary' ? PRIMARY_USER_POOL_CLIENT_ID : SECONDARY_USER_POOL_CLIENT_ID;

    // Refresh the token
    const refreshCommand = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const refreshResult = await cognitoClient.send(refreshCommand);

    if (!refreshResult.AuthenticationResult) {
      return createErrorResponse(401, 'Token refresh failed');
    }

    const { AccessToken, IdToken, ExpiresIn } = refreshResult.AuthenticationResult;

    // Get user details to update last active
    const getUserCommand = new GetUserCommand({
      AccessToken: AccessToken!,
    });
    const userDetails = await cognitoClient.send(getUserCommand);
    const userId = userDetails.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;

    // Update last active timestamp in DynamoDB
    if (userId) {
      await dynamoClient.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET lastActive = :timestamp',
        ExpressionAttributeValues: {
          ':timestamp': new Date().toISOString(),
        },
      }));
    }

    return createSuccessResponse({
      accessToken: AccessToken,
      idToken: IdToken,
      expiresIn: ExpiresIn,
      userId,
      message: 'Token refreshed successfully',
    });

  } catch (error: any) {
    console.error('Token refresh error:', error);

    // Handle specific Cognito errors
    if (error.name === 'NotAuthorizedException') {
      return createErrorResponse(401, 'Invalid or expired refresh token. Please log in again.');
    }
    if (error.name === 'TooManyRequestsException') {
      return createErrorResponse(429, 'Too many requests. Please try again later.');
    }

    return createErrorResponse(500, 'Token refresh failed. Please try again.');
  }
};
