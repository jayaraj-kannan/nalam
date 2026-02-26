import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createSuccessResponse, createErrorResponse } from '../shared/types';

const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const PRIMARY_USER_POOL_CLIENT_ID = process.env.PRIMARY_USER_POOL_CLIENT_ID!;
const SECONDARY_USER_POOL_CLIENT_ID = process.env.SECONDARY_USER_POOL_CLIENT_ID!;
const USERS_TABLE = process.env.USERS_TABLE!;

interface LoginRequest {
  email: string;
  password: string;
  userType: 'primary' | 'secondary';
  mfaCode?: string;
  session?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: LoginRequest = JSON.parse(event.body);
    const { email, password, userType, mfaCode, session } = request;

    // Validate required fields
    if (!email || !password || !userType) {
      return createErrorResponse(400, 'Missing required fields: email, password, userType');
    }

    if (!['primary', 'secondary'].includes(userType)) {
      return createErrorResponse(400, 'userType must be either "primary" or "secondary"');
    }

    // Select appropriate user pool client based on user type
    const clientId = userType === 'primary' ? PRIMARY_USER_POOL_CLIENT_ID : SECONDARY_USER_POOL_CLIENT_ID;

    // If MFA code is provided, respond to MFA challenge
    if (mfaCode && session) {
      return await handleMfaChallenge(clientId, email, mfaCode, session);
    }

    // Initiate authentication
    const authCommand = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const authResult = await cognitoClient.send(authCommand);

    // Check if MFA is required
    if (authResult.ChallengeName === 'SMS_MFA' || authResult.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
      return createSuccessResponse({
        challengeName: authResult.ChallengeName,
        session: authResult.Session,
        message: 'MFA code required. Please provide the code from your authenticator app or SMS.',
        mfaRequired: true,
      });
    }

    // Successful authentication without MFA challenge
    if (authResult.AuthenticationResult) {
      const { AccessToken, IdToken, RefreshToken, ExpiresIn } = authResult.AuthenticationResult;

      // Get user details
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
        refreshToken: RefreshToken,
        expiresIn: ExpiresIn,
        userId,
        userType,
        message: 'Login successful',
      });
    }

    return createErrorResponse(500, 'Authentication failed unexpectedly');

  } catch (error: any) {
    console.error('Login error:', error);

    // Handle specific Cognito errors
    if (error.name === 'NotAuthorizedException') {
      return createErrorResponse(401, 'Incorrect email or password');
    }
    if (error.name === 'UserNotConfirmedException') {
      return createErrorResponse(403, 'Please verify your email address before logging in');
    }
    if (error.name === 'UserNotFoundException') {
      return createErrorResponse(401, 'Incorrect email or password');
    }
    if (error.name === 'TooManyRequestsException') {
      return createErrorResponse(429, 'Too many login attempts. Please try again later.');
    }
    if (error.name === 'PasswordResetRequiredException') {
      return createErrorResponse(403, 'Password reset required. Please reset your password.');
    }

    return createErrorResponse(500, 'Login failed. Please try again.');
  }
};

async function handleMfaChallenge(
  clientId: string,
  email: string,
  mfaCode: string,
  session: string
): Promise<APIGatewayProxyResult> {
  try {
    const challengeCommand = new RespondToAuthChallengeCommand({
      ClientId: clientId,
      ChallengeName: 'SOFTWARE_TOKEN_MFA', // or SMS_MFA
      Session: session,
      ChallengeResponses: {
        USERNAME: email,
        SOFTWARE_TOKEN_MFA_CODE: mfaCode,
      },
    });

    const challengeResult = await cognitoClient.send(challengeCommand);

    if (challengeResult.AuthenticationResult) {
      const { AccessToken, IdToken, RefreshToken, ExpiresIn } = challengeResult.AuthenticationResult;

      // Get user details
      const getUserCommand = new GetUserCommand({
        AccessToken: AccessToken!,
      });
      const userDetails = await cognitoClient.send(getUserCommand);
      const userId = userDetails.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;

      // Update last active timestamp
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
        refreshToken: RefreshToken,
        expiresIn: ExpiresIn,
        userId,
        message: 'MFA verification successful',
      });
    }

    return createErrorResponse(500, 'MFA verification failed unexpectedly');

  } catch (error: any) {
    console.error('MFA challenge error:', error);

    if (error.name === 'CodeMismatchException') {
      return createErrorResponse(401, 'Invalid MFA code. Please try again.');
    }
    if (error.name === 'ExpiredCodeException') {
      return createErrorResponse(401, 'MFA code has expired. Please request a new code.');
    }
    if (error.name === 'NotAuthorizedException') {
      return createErrorResponse(401, 'MFA verification failed. Please try again.');
    }

    return createErrorResponse(500, 'MFA verification failed. Please try again.');
  }
}
