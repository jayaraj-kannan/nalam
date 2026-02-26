import { PostAuthenticationTriggerEvent, PostAuthenticationTriggerHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const snsClient = new SNSClient({});

const USERS_TABLE = process.env.USERS_TABLE!;
const ALERT_TOPIC_ARN = process.env.ALERT_TOPIC_ARN;

/**
 * Post-Authentication Trigger
 * 
 * This Lambda function is triggered after a user successfully authenticates.
 * It can be used to:
 * - Update last login timestamp
 * - Log successful authentication
 * - Send notifications to care circle (for primary users)
 * - Track login patterns
 * - Initialize session data
 */
export const handler: PostAuthenticationTriggerHandler = async (event) => {
  console.log('Post-authentication trigger invoked:', JSON.stringify(event, null, 2));

  try {
    const { userName, request } = event;
    const userId = event.request.userAttributes.sub;
    const email = event.request.userAttributes.email;
    const timestamp = new Date().toISOString();

    console.log(`User ${userName} (${userId}) authenticated successfully at ${timestamp}`);

    // Update last active timestamp and login count
    await dynamoClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET lastActive = :timestamp, lastLogin = :timestamp, loginCount = if_not_exists(loginCount, :zero) + :one',
      ExpressionAttributeValues: {
        ':timestamp': timestamp,
        ':zero': 0,
        ':one': 1,
      },
    }));

    // Get user details to check user type
    const userResult = await dynamoClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    }));

    if (userResult.Item) {
      const userType = userResult.Item.userType;
      const loginCount = (userResult.Item.loginCount || 0) + 1;

      console.log(`User type: ${userType}, Total logins: ${loginCount}`);

      // For primary users, notify care circle of login (optional, based on preferences)
      if (userType === 'primary' && userResult.Item.careCircle && userResult.Item.careCircle.length > 0) {
        const notifyOnLogin = userResult.Item.preferences?.notifyOnLogin || false;
        
        if (notifyOnLogin && ALERT_TOPIC_ARN) {
          try {
            await snsClient.send(new PublishCommand({
              TopicArn: ALERT_TOPIC_ARN,
              Subject: 'Primary User Login Notification',
              Message: JSON.stringify({
                type: 'user_login',
                userId,
                email,
                timestamp,
                message: `${userResult.Item.profile?.firstName || 'User'} has logged in to the Healthcare Monitoring App`,
              }),
              MessageAttributes: {
                eventType: {
                  DataType: 'String',
                  StringValue: 'user_login',
                },
                userId: {
                  DataType: 'String',
                  StringValue: userId,
                },
              },
            }));
            console.log('Care circle notified of primary user login');
          } catch (snsError) {
            console.error('Failed to notify care circle:', snsError);
            // Don't fail authentication if notification fails
          }
        }
      }

      // Track authentication patterns for security monitoring
      const clientMetadata = request.clientMetadata || {};
      const ipAddress = clientMetadata.ipAddress;
      const userAgent = clientMetadata.userAgent;

      if (ipAddress || userAgent) {
        console.log(`Login from IP: ${ipAddress}, User Agent: ${userAgent}`);
        
        // You could store this in a separate table for security analytics
        // or send to CloudWatch for monitoring
      }

      // First-time login detection
      if (loginCount === 1) {
        console.log(`First login for user ${userId} - consider triggering onboarding flow`);
        // You could send a welcome notification or trigger onboarding
      }
    }

    // Return the event to complete authentication
    return event;

  } catch (error: any) {
    console.error('Post-authentication error:', error);
    
    // Log the error but don't fail authentication
    // The user has already been authenticated successfully
    return event;
  }
};
