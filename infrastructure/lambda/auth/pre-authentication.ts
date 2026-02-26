import { PreAuthenticationTriggerEvent, PreAuthenticationTriggerHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const USERS_TABLE = process.env.USERS_TABLE!;

/**
 * Pre-Authentication Trigger
 * 
 * This Lambda function is triggered before a user is authenticated.
 * It can be used to:
 * - Perform custom validation
 * - Check if user account is active
 * - Implement custom authentication logic
 * - Log authentication attempts
 * - Block suspicious login attempts
 */
export const handler: PreAuthenticationTriggerHandler = async (event) => {
  console.log('Pre-authentication trigger invoked:', JSON.stringify(event, null, 2));

  try {
    const { userPoolId, userName, request } = event;
    const userId = event.request.userAttributes.sub;

    // Log authentication attempt
    console.log(`Authentication attempt for user: ${userName} (${userId}) in pool: ${userPoolId}`);

    // Check if user exists in DynamoDB
    const userResult = await dynamoClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    }));

    if (!userResult.Item) {
      console.warn(`User ${userId} not found in DynamoDB`);
      // Allow authentication to proceed - user record will be created if needed
    } else {
      console.log(`User ${userId} found in DynamoDB`);
      
      // Check if user account is active (custom logic)
      // You can add custom checks here, for example:
      // - Check if account is suspended
      // - Check if user has completed onboarding
      // - Verify user's subscription status
      
      const userStatus = userResult.Item.status;
      if (userStatus === 'suspended') {
        throw new Error('Account has been suspended. Please contact support.');
      }
    }

    // Check for suspicious activity (example: too many failed attempts)
    const clientMetadata = request.clientMetadata || {};
    const ipAddress = clientMetadata.ipAddress;
    
    if (ipAddress) {
      console.log(`Authentication attempt from IP: ${ipAddress}`);
      // You could implement rate limiting or IP blocking here
    }

    // Validate user attributes
    const email = event.request.userAttributes.email;
    const emailVerified = event.request.userAttributes.email_verified;

    if (!emailVerified || emailVerified === 'false') {
      console.warn(`User ${userName} attempting to login with unverified email: ${email}`);
      // Cognito will handle this, but we log it for monitoring
    }

    // Return the event to allow authentication to proceed
    return event;

  } catch (error: any) {
    console.error('Pre-authentication error:', error);
    
    // Throw error to prevent authentication
    throw new Error(error.message || 'Authentication failed due to security check');
  }
};
