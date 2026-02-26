import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, GetUserCommand, GlobalSignOutCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createSuccessResponse, createErrorResponse } from '../shared/types';

const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const USERS_TABLE = process.env.USERS_TABLE!;

/**
 * Session Management Lambda
 * 
 * Handles:
 * - Get current session info
 * - Validate session
 * - Logout (invalidate tokens)
 * - Global sign out (all devices)
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path || event.resource;
    const httpMethod = event.httpMethod;

    // Extract access token from Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse(401, 'Missing or invalid authorization header');
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Route to appropriate handler
    if (path.includes('/session/info') && httpMethod === 'GET') {
      return await getSessionInfo(accessToken);
    } else if (path.includes('/session/validate') && httpMethod === 'GET') {
      return await validateSession(accessToken);
    } else if (path.includes('/session/logout') && httpMethod === 'POST') {
      return await logout(accessToken);
    } else if (path.includes('/session/logout-all') && httpMethod === 'POST') {
      return await globalSignOut(accessToken);
    }

    return createErrorResponse(404, 'Endpoint not found');

  } catch (error: any) {
    console.error('Session management error:', error);
    return createErrorResponse(500, 'Session management failed');
  }
};

/**
 * Get current session information
 */
async function getSessionInfo(accessToken: string): Promise<APIGatewayProxyResult> {
  try {
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken,
    });

    const userDetails = await cognitoClient.send(getUserCommand);
    const userId = userDetails.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;
    const email = userDetails.UserAttributes?.find(attr => attr.Name === 'email')?.Value;
    const emailVerified = userDetails.UserAttributes?.find(attr => attr.Name === 'email_verified')?.Value;

    // Get additional user info from DynamoDB
    let userInfo = null;
    if (userId) {
      const userResult = await dynamoClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId },
      }));
      userInfo = userResult.Item;
    }

    return createSuccessResponse({
      userId,
      email,
      emailVerified: emailVerified === 'true',
      username: userDetails.Username,
      userType: userInfo?.userType,
      profile: userInfo?.profile,
      lastActive: userInfo?.lastActive,
      mfaEnabled: userDetails.UserMFASettingList && userDetails.UserMFASettingList.length > 0,
      preferredMfaSetting: userDetails.PreferredMfaSetting,
    });

  } catch (error: any) {
    console.error('Get session info error:', error);

    if (error.name === 'NotAuthorizedException') {
      return createErrorResponse(401, 'Invalid or expired access token');
    }

    return createErrorResponse(500, 'Failed to retrieve session information');
  }
}

/**
 * Validate current session
 */
async function validateSession(accessToken: string): Promise<APIGatewayProxyResult> {
  try {
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken,
    });

    await cognitoClient.send(getUserCommand);

    return createSuccessResponse({
      valid: true,
      message: 'Session is valid',
    });

  } catch (error: any) {
    console.error('Validate session error:', error);

    if (error.name === 'NotAuthorizedException') {
      return createSuccessResponse({
        valid: false,
        message: 'Session is invalid or expired',
      });
    }

    return createErrorResponse(500, 'Failed to validate session');
  }
}

/**
 * Logout (invalidate current session)
 */
async function logout(accessToken: string): Promise<APIGatewayProxyResult> {
  try {
    // Get user info before logout
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken,
    });
    const userDetails = await cognitoClient.send(getUserCommand);
    const userId = userDetails.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;

    // Note: Cognito doesn't have a direct "logout" API for access tokens
    // Access tokens remain valid until expiration
    // The client should discard the tokens
    // For server-side tracking, we can update the user's session status

    if (userId) {
      await dynamoClient.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET lastLogout = :timestamp',
        ExpressionAttributeValues: {
          ':timestamp': new Date().toISOString(),
        },
      }));
    }

    return createSuccessResponse({
      message: 'Logout successful. Please discard your tokens.',
      loggedOut: true,
    });

  } catch (error: any) {
    console.error('Logout error:', error);

    if (error.name === 'NotAuthorizedException') {
      return createErrorResponse(401, 'Invalid or expired access token');
    }

    return createErrorResponse(500, 'Logout failed');
  }
}

/**
 * Global sign out (invalidate all sessions on all devices)
 */
async function globalSignOut(accessToken: string): Promise<APIGatewayProxyResult> {
  try {
    // Get user info before sign out
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken,
    });
    const userDetails = await cognitoClient.send(getUserCommand);
    const userId = userDetails.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;

    // Global sign out - invalidates all tokens for the user
    const signOutCommand = new GlobalSignOutCommand({
      AccessToken: accessToken,
    });

    await cognitoClient.send(signOutCommand);

    // Update user record
    if (userId) {
      await dynamoClient.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET lastLogout = :timestamp, globalSignOutAt = :timestamp',
        ExpressionAttributeValues: {
          ':timestamp': new Date().toISOString(),
        },
      }));
    }

    return createSuccessResponse({
      message: 'Global sign out successful. All sessions have been invalidated.',
      signedOut: true,
    });

  } catch (error: any) {
    console.error('Global sign out error:', error);

    if (error.name === 'NotAuthorizedException') {
      return createErrorResponse(401, 'Invalid or expired access token');
    }

    return createErrorResponse(500, 'Global sign out failed');
  }
}
