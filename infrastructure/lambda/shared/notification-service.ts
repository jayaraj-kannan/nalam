// Multi-Channel Notification Service
// Requirements: 9.1, 9.4

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { NotificationChannel, NotificationResult, NotificationStatus, HealthAlert } from './types';
import { getUser } from './data-access/users';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const snsClient = new SNSClient({});
const sesClient = new SESClient({});
const dynamodbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const MAX_RETRY_COUNT = 3;
const NOTIFICATION_TIMEOUT_MS = 30000; // 30 seconds requirement

interface NotificationRequest {
  recipient: string; // userId
  alert: HealthAlert;
  channels: NotificationChannel[];
  priority?: 'normal' | 'high' | 'urgent';
}

/**
 * Send notification via push notification (SNS)
 */
async function sendPushNotification(
  phoneNumber: string,
  message: string,
  alertId: string
): Promise<NotificationResult> {
  const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const sentAt = new Date();

  try {
    // For push notifications, we would use SNS Platform Application
    // For now, using SMS as a fallback for push
    await snsClient.send(new PublishCommand({
      Message: message,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    }));

    return {
      notificationId,
      alertId,
      recipient: phoneNumber,
      channel: 'push',
      status: 'sent',
      sentAt,
      deliveredAt: new Date(),
      retryCount: 0,
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return {
      notificationId,
      alertId,
      recipient: phoneNumber,
      channel: 'push',
      status: 'failed',
      sentAt,
      failureReason: error instanceof Error ? error.message : 'Unknown error',
      retryCount: 0,
    };
  }
}

/**
 * Send notification via SMS (SNS)
 */
async function sendSMSNotification(
  phoneNumber: string,
  message: string,
  alertId: string
): Promise<NotificationResult> {
  const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const sentAt = new Date();

  try {
    await snsClient.send(new PublishCommand({
      Message: message,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    }));

    return {
      notificationId,
      alertId,
      recipient: phoneNumber,
      channel: 'sms',
      status: 'sent',
      sentAt,
      deliveredAt: new Date(),
      retryCount: 0,
    };
  } catch (error) {
    console.error('Error sending SMS notification:', error);
    return {
      notificationId,
      alertId,
      recipient: phoneNumber,
      channel: 'sms',
      status: 'failed',
      sentAt,
      failureReason: error instanceof Error ? error.message : 'Unknown error',
      retryCount: 0,
    };
  }
}

/**
 * Send notification via Email (SES)
 */
async function sendEmailNotification(
  email: string,
  subject: string,
  message: string,
  alertId: string
): Promise<NotificationResult> {
  const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const sentAt = new Date();

  try {
    await sesClient.send(new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL || 'noreply@healthcare-monitoring.com',
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: subject,
        },
        Body: {
          Text: {
            Data: message,
          },
          Html: {
            Data: `
              <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                  <h2 style="color: #d32f2f;">${subject}</h2>
                  <p style="font-size: 16px;">${message}</p>
                  <hr style="margin: 20px 0;">
                  <p style="font-size: 12px; color: #666;">
                    This is an automated notification from Healthcare Monitoring App.
                  </p>
                </body>
              </html>
            `,
          },
        },
      },
    }));

    return {
      notificationId,
      alertId,
      recipient: email,
      channel: 'email',
      status: 'sent',
      sentAt,
      deliveredAt: new Date(),
      retryCount: 0,
    };
  } catch (error) {
    console.error('Error sending email notification:', error);
    return {
      notificationId,
      alertId,
      recipient: email,
      channel: 'email',
      status: 'failed',
      sentAt,
      failureReason: error instanceof Error ? error.message : 'Unknown error',
      retryCount: 0,
    };
  }
}

/**
 * Store notification result in DynamoDB
 */
async function storeNotificationResult(result: NotificationResult): Promise<void> {
  await dynamodb.send(new PutCommand({
    TableName: process.env.NOTIFICATIONS_TABLE || 'healthcare-notifications-dev',
    Item: {
      ...result,
      sentAt: result.sentAt.toISOString(),
      deliveredAt: result.deliveredAt?.toISOString(),
      readAt: result.readAt?.toISOString(),
    },
  }));
}

/**
 * Retry failed notification
 */
async function retryNotification(
  result: NotificationResult,
  user: any,
  alert: HealthAlert
): Promise<NotificationResult> {
  if (result.retryCount >= MAX_RETRY_COUNT) {
    return result;
  }

  console.log(`Retrying notification ${result.notificationId}, attempt ${result.retryCount + 1}`);

  let retryResult: NotificationResult;

  switch (result.channel) {
    case 'push':
    case 'sms':
      retryResult = await sendSMSNotification(user.profile.phone, alert.message, alert.id);
      break;
    case 'email':
      retryResult = await sendEmailNotification(
        user.profile.email,
        `Health Alert: ${alert.type}`,
        alert.message,
        alert.id
      );
      break;
    default:
      return result;
  }

  retryResult.retryCount = result.retryCount + 1;
  return retryResult;
}

/**
 * Send notification to a recipient via multiple channels
 */
export async function sendNotification(request: NotificationRequest): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  try {
    // Get recipient user information
    const user = await getUser(request.recipient);
    if (!user) {
      console.error('User not found:', request.recipient);
      return results;
    }

    // Prepare message based on alert severity
    const severityEmoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🆘',
    };

    const message = `${severityEmoji[request.alert.severity]} ${request.alert.message}`;
    const emailSubject = `Health Alert: ${request.alert.type.replace(/_/g, ' ')}`;

    // Send notifications via requested channels
    const notificationPromises: Promise<NotificationResult>[] = [];

    for (const channel of request.channels) {
      switch (channel) {
        case 'push':
          if (user.profile.phone) {
            notificationPromises.push(sendPushNotification(user.profile.phone, message, request.alert.id));
          }
          break;
        case 'sms':
          if (user.profile.phone) {
            notificationPromises.push(sendSMSNotification(user.profile.phone, message, request.alert.id));
          }
          break;
        case 'email':
          if (user.profile.email) {
            notificationPromises.push(sendEmailNotification(user.profile.email, emailSubject, message, request.alert.id));
          }
          break;
      }
    }

    // Wait for all notifications with timeout (30 seconds requirement)
    const timeoutPromise = new Promise<NotificationResult[]>((_, reject) =>
      setTimeout(() => reject(new Error('Notification timeout')), NOTIFICATION_TIMEOUT_MS)
    );

    const notificationResults = await Promise.race([
      Promise.all(notificationPromises),
      timeoutPromise,
    ]);

    results.push(...notificationResults);

    // Store all notification results
    await Promise.all(results.map(result => storeNotificationResult(result)));

    // Retry failed notifications (up to 3 times)
    const failedNotifications = results.filter(r => r.status === 'failed');
    for (const failed of failedNotifications) {
      if (failed.retryCount < MAX_RETRY_COUNT) {
        const retryResult = await retryNotification(failed, user, request.alert);
        await storeNotificationResult(retryResult);
        
        // Update the result in the array
        const index = results.findIndex(r => r.notificationId === failed.notificationId);
        if (index !== -1) {
          results[index] = retryResult;
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error sending notifications:', error);
    return results;
  }
}

/**
 * Send notifications to multiple recipients (care circle)
 */
export async function sendNotificationToCareCircle(
  userIds: string[],
  alert: HealthAlert,
  channels: NotificationChannel[]
): Promise<NotificationResult[]> {
  const allResults: NotificationResult[] = [];

  // Send notifications to all care circle members in parallel
  const notificationPromises = userIds.map(userId =>
    sendNotification({
      recipient: userId,
      alert,
      channels,
      priority: alert.severity === 'critical' ? 'urgent' : 'high',
    })
  );

  const results = await Promise.all(notificationPromises);
  results.forEach(result => allResults.push(...result));

  return allResults;
}
