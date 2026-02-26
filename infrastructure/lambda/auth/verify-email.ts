import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, ConfirmSignUpCommand, ResendConfirmationCodeCommand } from '@aws-sdk/client-cognito-identity-provider';
import { createSuccessResponse, createErrorResponse } from '../shared/types';

const cognitoClient = new CognitoIdentityProviderClient({});

const PRIMARY_USER_POOL_CLIENT_ID = process.env.PRIMARY_USER_POOL_CLIENT_ID!;
const SECONDARY_USER_POOL_CLIENT_ID = process.env.SECONDARY_USER_POOL_CLIENT_ID!;

interface VerifyEmailRequest {
  email: string;
  code: string;
  userType: 'primary' | 'secondary';
}

interface ResendCodeRequest {
  email: string;
  userType: 'primary' | 'secondary';
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const path = event.path || event.resource;

    // Handle resend confirmation code
    if (path.includes('/resend')) {
      return await handleResendCode(event);
    }

    // Handle email verification
    const request: VerifyEmailRequest = JSON.parse(event.body);
    const { email, code, userType } = request;

    // Validate required fields
    if (!email || !code || !userType) {
      return createErrorResponse(400, 'Missing required fields: email, code, userType');
    }

    if (!['primary', 'secondary'].includes(userType)) {
      return createErrorResponse(400, 'userType must be either "primary" or "secondary"');
    }

    // Select appropriate user pool client based on user type
    const clientId = userType === 'primary' ? PRIMARY_USER_POOL_CLIENT_ID : SECONDARY_USER_POOL_CLIENT_ID;

    // Confirm sign up
    const confirmCommand = new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
    });

    await cognitoClient.send(confirmCommand);

    return createSuccessResponse({
      message: 'Email verified successfully. You can now log in.',
      verified: true,
    });

  } catch (error: any) {
    console.error('Email verification error:', error);

    // Handle specific Cognito errors
    if (error.name === 'CodeMismatchException') {
      return createErrorResponse(400, 'Invalid verification code. Please check and try again.');
    }
    if (error.name === 'ExpiredCodeException') {
      return createErrorResponse(400, 'Verification code has expired. Please request a new code.');
    }
    if (error.name === 'NotAuthorizedException') {
      return createErrorResponse(403, 'User is already confirmed or verification failed.');
    }
    if (error.name === 'UserNotFoundException') {
      return createErrorResponse(404, 'User not found.');
    }
    if (error.name === 'TooManyFailedAttemptsException') {
      return createErrorResponse(429, 'Too many failed attempts. Please try again later.');
    }

    return createErrorResponse(500, 'Email verification failed. Please try again.');
  }
};

async function handleResendCode(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const request: ResendCodeRequest = JSON.parse(event.body!);
    const { email, userType } = request;

    // Validate required fields
    if (!email || !userType) {
      return createErrorResponse(400, 'Missing required fields: email, userType');
    }

    if (!['primary', 'secondary'].includes(userType)) {
      return createErrorResponse(400, 'userType must be either "primary" or "secondary"');
    }

    // Select appropriate user pool client based on user type
    const clientId = userType === 'primary' ? PRIMARY_USER_POOL_CLIENT_ID : SECONDARY_USER_POOL_CLIENT_ID;

    // Resend confirmation code
    const resendCommand = new ResendConfirmationCodeCommand({
      ClientId: clientId,
      Username: email,
    });

    await cognitoClient.send(resendCommand);

    return createSuccessResponse({
      message: 'Verification code sent successfully. Please check your email.',
      codeSent: true,
    });

  } catch (error: any) {
    console.error('Resend code error:', error);

    // Handle specific Cognito errors
    if (error.name === 'UserNotFoundException') {
      return createErrorResponse(404, 'User not found.');
    }
    if (error.name === 'InvalidParameterException') {
      return createErrorResponse(400, 'User is already confirmed.');
    }
    if (error.name === 'LimitExceededException') {
      return createErrorResponse(429, 'Too many requests. Please try again later.');
    }

    return createErrorResponse(500, 'Failed to resend verification code. Please try again.');
  }
}
