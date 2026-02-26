"use strict";
// Multi-Channel Notification Service
// Requirements: 9.1, 9.4
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = sendNotification;
exports.sendNotificationToCareCircle = sendNotificationToCareCircle;
const client_sns_1 = require("@aws-sdk/client-sns");
const client_ses_1 = require("@aws-sdk/client-ses");
const users_1 = require("./data-access/users");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const snsClient = new client_sns_1.SNSClient({});
const sesClient = new client_ses_1.SESClient({});
const dynamodbClient = new client_dynamodb_1.DynamoDBClient({});
const dynamodb = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamodbClient);
const MAX_RETRY_COUNT = 3;
const NOTIFICATION_TIMEOUT_MS = 30000; // 30 seconds requirement
/**
 * Send notification via push notification (SNS)
 */
async function sendPushNotification(phoneNumber, message, alertId) {
    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sentAt = new Date();
    try {
        // For push notifications, we would use SNS Platform Application
        // For now, using SMS as a fallback for push
        await snsClient.send(new client_sns_1.PublishCommand({
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
    }
    catch (error) {
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
async function sendSMSNotification(phoneNumber, message, alertId) {
    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sentAt = new Date();
    try {
        await snsClient.send(new client_sns_1.PublishCommand({
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
    }
    catch (error) {
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
async function sendEmailNotification(email, subject, message, alertId) {
    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sentAt = new Date();
    try {
        await sesClient.send(new client_ses_1.SendEmailCommand({
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
    }
    catch (error) {
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
async function storeNotificationResult(result) {
    await dynamodb.send(new lib_dynamodb_1.PutCommand({
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
async function retryNotification(result, user, alert) {
    if (result.retryCount >= MAX_RETRY_COUNT) {
        return result;
    }
    console.log(`Retrying notification ${result.notificationId}, attempt ${result.retryCount + 1}`);
    let retryResult;
    switch (result.channel) {
        case 'push':
        case 'sms':
            retryResult = await sendSMSNotification(user.profile.phone, alert.message, alert.id);
            break;
        case 'email':
            retryResult = await sendEmailNotification(user.profile.email, `Health Alert: ${alert.type}`, alert.message, alert.id);
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
async function sendNotification(request) {
    const results = [];
    try {
        // Get recipient user information
        const user = await (0, users_1.getUser)(request.recipient);
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
        const notificationPromises = [];
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
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Notification timeout')), NOTIFICATION_TIMEOUT_MS));
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
    }
    catch (error) {
        console.error('Error sending notifications:', error);
        return results;
    }
}
/**
 * Send notifications to multiple recipients (care circle)
 */
async function sendNotificationToCareCircle(userIds, alert, channels) {
    const allResults = [];
    // Send notifications to all care circle members in parallel
    const notificationPromises = userIds.map(userId => sendNotification({
        recipient: userId,
        alert,
        channels,
        priority: alert.severity === 'critical' ? 'urgent' : 'high',
    }));
    const results = await Promise.all(notificationPromises);
    results.forEach(result => allResults.push(...result));
    return allResults;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJub3RpZmljYXRpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUNBQXFDO0FBQ3JDLHlCQUF5Qjs7QUFzUHpCLDRDQWdGQztBQUtELG9FQXFCQztBQTlWRCxvREFBZ0U7QUFDaEUsb0RBQWtFO0FBRWxFLCtDQUE4QztBQUM5Qyw4REFBMEQ7QUFDMUQsd0RBQTJFO0FBRTNFLE1BQU0sU0FBUyxHQUFHLElBQUksc0JBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNwQyxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDcEMsTUFBTSxjQUFjLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sUUFBUSxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUU3RCxNQUFNLGVBQWUsR0FBRyxDQUFDLENBQUM7QUFDMUIsTUFBTSx1QkFBdUIsR0FBRyxLQUFLLENBQUMsQ0FBQyx5QkFBeUI7QUFTaEU7O0dBRUc7QUFDSCxLQUFLLFVBQVUsb0JBQW9CLENBQ2pDLFdBQW1CLEVBQ25CLE9BQWUsRUFDZixPQUFlO0lBRWYsTUFBTSxjQUFjLEdBQUcsU0FBUyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDeEYsTUFBTSxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUUxQixJQUFJLENBQUM7UUFDSCxnRUFBZ0U7UUFDaEUsNENBQTRDO1FBQzVDLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLDJCQUFjLENBQUM7WUFDdEMsT0FBTyxFQUFFLE9BQU87WUFDaEIsV0FBVyxF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LE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSSxLQUFLLFVBQVUsNEJBQTRCLENBQ2hELE9BQWlCLEVBQ2pCLEtBQWtCLEVBQ2xCLFFBQStCO0lBRS9CLE1BQU0sVUFBVSxHQUF5QixFQUFFLENBQUM7SUFFNUMsNERBQTREO0lBQzVELE1BQU0sb0JBQW9CLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUNoRCxnQkFBZ0IsQ0FBQztRQUNmLFNBQVMsRUFBRSxNQUFNO1FBQ2pCLEtBQUs7UUFDTCxRQUFRO1FBQ1IsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU07S0FDNUQsQ0FBQyxDQUNILENBQUM7SUFFRixNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUN4RCxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFdEQsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIE11bHRpLUNoYW5uZWwgTm90aWZpY2F0aW9uIFNlcnZpY2Vcbi8vIFJlcXVpcmVtZW50czogOS4xLCA5LjRcblxuaW1wb3J0IHsgU05TQ2xpZW50LCBQdWJsaXNoQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnO1xuaW1wb3J0IHsgU0VTQ2xpZW50LCBTZW5kRW1haWxDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNlcyc7XG5pbXBvcnQgeyBOb3RpZmljYXRpb25DaGFubmVsLCBOb3RpZmljYXRpb25SZXN1bHQsIE5vdGlmaWNhdGlvblN0YXR1cywgSGVhbHRoQWxlcnQgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGdldFVzZXIgfSBmcm9tICcuL2RhdGEtYWNjZXNzL3VzZXJzJztcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuXG5jb25zdCBzbnNDbGllbnQgPSBuZXcgU05TQ2xpZW50KHt9KTtcbmNvbnN0IHNlc0NsaWVudCA9IG5ldyBTRVNDbGllbnQoe30pO1xuY29uc3QgZHluYW1vZGJDbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xuY29uc3QgZHluYW1vZGIgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oZHluYW1vZGJDbGllbnQpO1xuXG5jb25zdCBNQVhfUkVUUllfQ09VTlQgPSAzO1xuY29uc3QgTk9USUZJQ0FUSU9OX1RJTUVPVVRfTVMgPSAzMDAwMDsgLy8gMzAgc2Vjb25kcyByZXF1aXJlbWVudFxuXG5pbnRlcmZhY2UgTm90aWZpY2F0aW9uUmVxdWVzdCB7XG4gIHJlY2lwaWVudDogc3RyaW5nOyAvLyB1c2VySWRcbiAgYWxlcnQ6IEhlYWx0aEFsZXJ0O1xuICBjaGFubmVsczogTm90aWZpY2F0aW9uQ2hhbm5lbFtdO1xuICBwcmlvcml0eT86ICdub3JtYWwnIHwgJ2hpZ2gnIHwgJ3VyZ2VudCc7XG59XG5cbi8qKlxuICogU2VuZCBub3RpZmljYXRpb24gdmlhIHB1c2ggbm90aWZpY2F0aW9uIChTTlMpXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHNlbmRQdXNoTm90aWZpY2F0aW9uKFxuICBwaG9uZU51bWJlcjogc3RyaW5nLFxuICBtZXNzYWdlOiBzdHJpbmcsXG4gIGFsZXJ0SWQ6IHN0cmluZ1xuKTogUHJvbWlzZTxOb3RpZmljYXRpb25SZXN1bHQ+IHtcbiAgY29uc3Qgbm90aWZpY2F0aW9uSWQgPSBgbm90aWYtJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xuICBjb25zdCBzZW50QXQgPSBuZXcgRGF0ZSgpO1xuXG4gIHRyeSB7XG4gICAgLy8gRm9yIHB1c2ggbm90aWZpY2F0aW9ucywgd2Ugd291bGQgdXNlIFNOUyBQbGF0Zm9ybSBBcHBsaWNhdGlvblxuICAgIC8vIEZvciBub3csIHVzaW5nIFNNUyBhcyBhIGZhbGxiYWNrIGZvciBwdXNoXG4gICAgYXdhaXQgc25zQ2xpZW50LnNlbmQobmV3IFB1Ymxpc2hDb21tYW5kKHtcbiAgICAgIE1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICBQaG9uZU51bWJlcjogcGhvbmVOdW1iZXIsXG4gICAgICBNZXNzYWdlQXR0cmlidXRlczoge1xuICAgICAgICAnQVdTLlNOUy5TTVMuU01TVHlwZSc6IHtcbiAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXG4gICAgICAgICAgU3RyaW5nVmFsdWU6ICdUcmFuc2FjdGlvbmFsJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5vdGlmaWNhdGlvbklkLFxuICAgICAgYWxlcnRJZCxcbiAgICAgIHJlY2lwaWVudDogcGhvbmVOdW1iZXIsXG4gICAgICBjaGFubmVsOiAncHVzaCcsXG4gICAgICBzdGF0dXM6ICdzZW50JyxcbiAgICAgIHNlbnRBdCxcbiAgICAgIGRlbGl2ZXJlZEF0OiBuZXcgRGF0ZSgpLFxuICAgICAgcmV0cnlDb3VudDogMCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNlbmRpbmcgcHVzaCBub3RpZmljYXRpb246JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBub3RpZmljYXRpb25JZCxcbiAgICAgIGFsZXJ0SWQsXG4gICAgICByZWNpcGllbnQ6IHBob25lTnVtYmVyLFxuICAgICAgY2hhbm5lbDogJ3B1c2gnLFxuICAgICAgc3RhdHVzOiAnZmFpbGVkJyxcbiAgICAgIHNlbnRBdCxcbiAgICAgIGZhaWx1cmVSZWFzb246IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxuICAgICAgcmV0cnlDb3VudDogMCxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogU2VuZCBub3RpZmljYXRpb24gdmlhIFNNUyAoU05TKVxuICovXG5hc3luYyBmdW5jdGlvbiBzZW5kU01TTm90aWZpY2F0aW9uKFxuICBwaG9uZU51bWJlcjogc3RyaW5nLFxuICBtZXNzYWdlOiBzdHJpbmcsXG4gIGFsZXJ0SWQ6IHN0cmluZ1xuKTogUHJvbWlzZTxOb3RpZmljYXRpb25SZXN1bHQ+IHtcbiAgY29uc3Qgbm90aWZpY2F0aW9uSWQgPSBgbm90aWYtJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xuICBjb25zdCBzZW50QXQgPSBuZXcgRGF0ZSgpO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgc25zQ2xpZW50LnNlbmQobmV3IFB1Ymxpc2hDb21tYW5kKHtcbiAgICAgIE1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICBQaG9uZU51bWJlcjogcGhvbmVOdW1iZXIsXG4gICAgICBNZXNzYWdlQXR0cmlidXRlczoge1xuICAgICAgICAnQVdTLlNOUy5TTVMuU01TVHlwZSc6IHtcbiAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXG4gICAgICAgICAgU3RyaW5nVmFsdWU6ICdUcmFuc2FjdGlvbmFsJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5vdGlmaWNhdGlvbklkLFxuICAgICAgYWxlcnRJZCxcbiAgICAgIHJlY2lwaWVudDogcGhvbmVOdW1iZXIsXG4gICAgICBjaGFubmVsOiAnc21zJyxcbiAgICAgIHN0YXR1czogJ3NlbnQnLFxuICAgICAgc2VudEF0LFxuICAgICAgZGVsaXZlcmVkQXQ6IG5ldyBEYXRlKCksXG4gICAgICByZXRyeUNvdW50OiAwLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3Igc2VuZGluZyBTTVMgbm90aWZpY2F0aW9uOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgbm90aWZpY2F0aW9uSWQsXG4gICAgICBhbGVydElkLFxuICAgICAgcmVjaXBpZW50OiBwaG9uZU51bWJlcixcbiAgICAgIGNoYW5uZWw6ICdzbXMnLFxuICAgICAgc3RhdHVzOiAnZmFpbGVkJyxcbiAgICAgIHNlbnRBdCxcbiAgICAgIGZhaWx1cmVSZWFzb246IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxuICAgICAgcmV0cnlDb3VudDogMCxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogU2VuZCBub3RpZmljYXRpb24gdmlhIEVtYWlsIChTRVMpXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHNlbmRFbWFpbE5vdGlmaWNhdGlvbihcbiAgZW1haWw6IHN0cmluZyxcbiAgc3ViamVjdDogc3RyaW5nLFxuICBtZXNzYWdlOiBzdHJpbmcsXG4gIGFsZXJ0SWQ6IHN0cmluZ1xuKTogUHJvbWlzZTxOb3RpZmljYXRpb25SZXN1bHQ+IHtcbiAgY29uc3Qgbm90aWZpY2F0aW9uSWQgPSBgbm90aWYtJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xuICBjb25zdCBzZW50QXQgPSBuZXcgRGF0ZSgpO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgc2VzQ2xpZW50LnNlbmQobmV3IFNlbmRFbWFpbENvbW1hbmQoe1xuICAgICAgU291cmNlOiBwcm9jZXNzLmVudi5TRVNfRlJPTV9FTUFJTCB8fCAnbm9yZXBseUBoZWFsdGhjYXJlLW1vbml0b3JpbmcuY29tJyxcbiAgICAgIERlc3RpbmF0aW9uOiB7XG4gICAgICAgIFRvQWRkcmVzc2VzOiBbZW1haWxdLFxuICAgICAgfSxcbiAgICAgIE1lc3NhZ2U6IHtcbiAgICAgICAgU3ViamVjdDoge1xuICAgICAgICAgIERhdGE6IHN1YmplY3QsXG4gICAgICAgIH0sXG4gICAgICAgIEJvZHk6IHtcbiAgICAgICAgICBUZXh0OiB7XG4gICAgICAgICAgICBEYXRhOiBtZXNzYWdlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgSHRtbDoge1xuICAgICAgICAgICAgRGF0YTogYFxuICAgICAgICAgICAgICA8aHRtbD5cbiAgICAgICAgICAgICAgICA8Ym9keSBzdHlsZT1cImZvbnQtZmFtaWx5OiBBcmlhbCwgc2Fucy1zZXJpZjsgcGFkZGluZzogMjBweDtcIj5cbiAgICAgICAgICAgICAgICAgIDxoMiBzdHlsZT1cImNvbG9yOiAjZDMyZjJmO1wiPiR7c3ViamVjdH08L2gyPlxuICAgICAgICAgICAgICAgICAgPHAgc3R5bGU9XCJmb250LXNpemU6IDE2cHg7XCI+JHttZXNzYWdlfTwvcD5cbiAgICAgICAgICAgICAgICAgIDxociBzdHlsZT1cIm1hcmdpbjogMjBweCAwO1wiPlxuICAgICAgICAgICAgICAgICAgPHAgc3R5bGU9XCJmb250LXNpemU6IDEycHg7IGNvbG9yOiAjNjY2O1wiPlxuICAgICAgICAgICAgICAgICAgICBUaGlzIGlzIGFuIGF1dG9tYXRlZCBub3RpZmljYXRpb24gZnJvbSBIZWFsdGhjYXJlIE1vbml0b3JpbmcgQXBwLlxuICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgIDwvYm9keT5cbiAgICAgICAgICAgICAgPC9odG1sPlxuICAgICAgICAgICAgYCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbm90aWZpY2F0aW9uSWQsXG4gICAgICBhbGVydElkLFxuICAgICAgcmVjaXBpZW50OiBlbWFpbCxcbiAgICAgIGNoYW5uZWw6ICdlbWFpbCcsXG4gICAgICBzdGF0dXM6ICdzZW50JyxcbiAgICAgIHNlbnRBdCxcbiAgICAgIGRlbGl2ZXJlZEF0OiBuZXcgRGF0ZSgpLFxuICAgICAgcmV0cnlDb3VudDogMCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNlbmRpbmcgZW1haWwgbm90aWZpY2F0aW9uOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgbm90aWZpY2F0aW9uSWQsXG4gICAgICBhbGVydElkLFxuICAgICAgcmVjaXBpZW50OiBlbWFpbCxcbiAgICAgIGNoYW5uZWw6ICdlbWFpbCcsXG4gICAgICBzdGF0dXM6ICdmYWlsZWQnLFxuICAgICAgc2VudEF0LFxuICAgICAgZmFpbHVyZVJlYXNvbjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXG4gICAgICByZXRyeUNvdW50OiAwLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBTdG9yZSBub3RpZmljYXRpb24gcmVzdWx0IGluIER5bmFtb0RCXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHN0b3JlTm90aWZpY2F0aW9uUmVzdWx0KHJlc3VsdDogTm90aWZpY2F0aW9uUmVzdWx0KTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGR5bmFtb2RiLnNlbmQobmV3IFB1dENvbW1hbmQoe1xuICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuTk9USUZJQ0FUSU9OU19UQUJMRSB8fCAnaGVhbHRoY2FyZS1ub3RpZmljYXRpb25zLWRldicsXG4gICAgSXRlbToge1xuICAgICAgLi4ucmVzdWx0LFxuICAgICAgc2VudEF0OiByZXN1bHQuc2VudEF0LnRvSVNPU3RyaW5nKCksXG4gICAgICBkZWxpdmVyZWRBdDogcmVzdWx0LmRlbGl2ZXJlZEF0Py50b0lTT1N0cmluZygpLFxuICAgICAgcmVhZEF0OiByZXN1bHQucmVhZEF0Py50b0lTT1N0cmluZygpLFxuICAgIH0sXG4gIH0pKTtcbn1cblxuLyoqXG4gKiBSZXRyeSBmYWlsZWQgbm90aWZpY2F0aW9uXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJldHJ5Tm90aWZpY2F0aW9uKFxuICByZXN1bHQ6IE5vdGlmaWNhdGlvblJlc3VsdCxcbiAgdXNlcjogYW55LFxuICBhbGVydDogSGVhbHRoQWxlcnRcbik6IFByb21pc2U8Tm90aWZpY2F0aW9uUmVzdWx0PiB7XG4gIGlmIChyZXN1bHQucmV0cnlDb3VudCA+PSBNQVhfUkVUUllfQ09VTlQpIHtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgY29uc29sZS5sb2coYFJldHJ5aW5nIG5vdGlmaWNhdGlvbiAke3Jlc3VsdC5ub3RpZmljYXRpb25JZH0sIGF0dGVtcHQgJHtyZXN1bHQucmV0cnlDb3VudCArIDF9YCk7XG5cbiAgbGV0IHJldHJ5UmVzdWx0OiBOb3RpZmljYXRpb25SZXN1bHQ7XG5cbiAgc3dpdGNoIChyZXN1bHQuY2hhbm5lbCkge1xuICAgIGNhc2UgJ3B1c2gnOlxuICAgIGNhc2UgJ3Ntcyc6XG4gICAgICByZXRyeVJlc3VsdCA9IGF3YWl0IHNlbmRTTVNOb3RpZmljYXRpb24odXNlci5wcm9maWxlLnBob25lLCBhbGVydC5tZXNzYWdlLCBhbGVydC5pZCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdlbWFpbCc6XG4gICAgICByZXRyeVJlc3VsdCA9IGF3YWl0IHNlbmRFbWFpbE5vdGlmaWNhdGlvbihcbiAgICAgICAgdXNlci5wcm9maWxlLmVtYWlsLFxuICAgICAgICBgSGVhbHRoIEFsZXJ0OiAke2FsZXJ0LnR5cGV9YCxcbiAgICAgICAgYWxlcnQubWVzc2FnZSxcbiAgICAgICAgYWxlcnQuaWRcbiAgICAgICk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHJldHJ5UmVzdWx0LnJldHJ5Q291bnQgPSByZXN1bHQucmV0cnlDb3VudCArIDE7XG4gIHJldHVybiByZXRyeVJlc3VsdDtcbn1cblxuLyoqXG4gKiBTZW5kIG5vdGlmaWNhdGlvbiB0byBhIHJlY2lwaWVudCB2aWEgbXVsdGlwbGUgY2hhbm5lbHNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmROb3RpZmljYXRpb24ocmVxdWVzdDogTm90aWZpY2F0aW9uUmVxdWVzdCk6IFByb21pc2U8Tm90aWZpY2F0aW9uUmVzdWx0W10+IHtcbiAgY29uc3QgcmVzdWx0czogTm90aWZpY2F0aW9uUmVzdWx0W10gPSBbXTtcblxuICB0cnkge1xuICAgIC8vIEdldCByZWNpcGllbnQgdXNlciBpbmZvcm1hdGlvblxuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyKHJlcXVlc3QucmVjaXBpZW50KTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VzZXIgbm90IGZvdW5kOicsIHJlcXVlc3QucmVjaXBpZW50KTtcbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH1cblxuICAgIC8vIFByZXBhcmUgbWVzc2FnZSBiYXNlZCBvbiBhbGVydCBzZXZlcml0eVxuICAgIGNvbnN0IHNldmVyaXR5RW1vamkgPSB7XG4gICAgICBsb3c6ICfihLnvuI8nLFxuICAgICAgbWVkaXVtOiAn4pqg77iPJyxcbiAgICAgIGhpZ2g6ICfwn5qoJyxcbiAgICAgIGNyaXRpY2FsOiAn8J+GmCcsXG4gICAgfTtcblxuICAgIGNvbnN0IG1lc3NhZ2UgPSBgJHtzZXZlcml0eUVtb2ppW3JlcXVlc3QuYWxlcnQuc2V2ZXJpdHldfSAke3JlcXVlc3QuYWxlcnQubWVzc2FnZX1gO1xuICAgIGNvbnN0IGVtYWlsU3ViamVjdCA9IGBIZWFsdGggQWxlcnQ6ICR7cmVxdWVzdC5hbGVydC50eXBlLnJlcGxhY2UoL18vZywgJyAnKX1gO1xuXG4gICAgLy8gU2VuZCBub3RpZmljYXRpb25zIHZpYSByZXF1ZXN0ZWQgY2hhbm5lbHNcbiAgICBjb25zdCBub3RpZmljYXRpb25Qcm9taXNlczogUHJvbWlzZTxOb3RpZmljYXRpb25SZXN1bHQ+W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgY2hhbm5lbCBvZiByZXF1ZXN0LmNoYW5uZWxzKSB7XG4gICAgICBzd2l0Y2ggKGNoYW5uZWwpIHtcbiAgICAgICAgY2FzZSAncHVzaCc6XG4gICAgICAgICAgaWYgKHVzZXIucHJvZmlsZS5waG9uZSkge1xuICAgICAgICAgICAgbm90aWZpY2F0aW9uUHJvbWlzZXMucHVzaChzZW5kUHVzaE5vdGlmaWNhdGlvbih1c2VyLnByb2ZpbGUucGhvbmUsIG1lc3NhZ2UsIHJlcXVlc3QuYWxlcnQuaWQpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3Ntcyc6XG4gICAgICAgICAgaWYgKHVzZXIucHJvZmlsZS5waG9uZSkge1xuICAgICAgICAgICAgbm90aWZpY2F0aW9uUHJvbWlzZXMucHVzaChzZW5kU01TTm90aWZpY2F0aW9uKHVzZXIucHJvZmlsZS5waG9uZSwgbWVzc2FnZSwgcmVxdWVzdC5hbGVydC5pZCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZW1haWwnOlxuICAgICAgICAgIGlmICh1c2VyLnByb2ZpbGUuZW1haWwpIHtcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvblByb21pc2VzLnB1c2goc2VuZEVtYWlsTm90aWZpY2F0aW9uKHVzZXIucHJvZmlsZS5lbWFpbCwgZW1haWxTdWJqZWN0LCBtZXNzYWdlLCByZXF1ZXN0LmFsZXJ0LmlkKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdhaXQgZm9yIGFsbCBub3RpZmljYXRpb25zIHdpdGggdGltZW91dCAoMzAgc2Vjb25kcyByZXF1aXJlbWVudClcbiAgICBjb25zdCB0aW1lb3V0UHJvbWlzZSA9IG5ldyBQcm9taXNlPE5vdGlmaWNhdGlvblJlc3VsdFtdPigoXywgcmVqZWN0KSA9PlxuICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKCdOb3RpZmljYXRpb24gdGltZW91dCcpKSwgTk9USUZJQ0FUSU9OX1RJTUVPVVRfTVMpXG4gICAgKTtcblxuICAgIGNvbnN0IG5vdGlmaWNhdGlvblJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xuICAgICAgUHJvbWlzZS5hbGwobm90aWZpY2F0aW9uUHJvbWlzZXMpLFxuICAgICAgdGltZW91dFByb21pc2UsXG4gICAgXSk7XG5cbiAgICByZXN1bHRzLnB1c2goLi4ubm90aWZpY2F0aW9uUmVzdWx0cyk7XG5cbiAgICAvLyBTdG9yZSBhbGwgbm90aWZpY2F0aW9uIHJlc3VsdHNcbiAgICBhd2FpdCBQcm9taXNlLmFsbChyZXN1bHRzLm1hcChyZXN1bHQgPT4gc3RvcmVOb3RpZmljYXRpb25SZXN1bHQocmVzdWx0KSkpO1xuXG4gICAgLy8gUmV0cnkgZmFpbGVkIG5vdGlmaWNhdGlvbnMgKHVwIHRvIDMgdGltZXMpXG4gICAgY29uc3QgZmFpbGVkTm90aWZpY2F0aW9ucyA9IHJlc3VsdHMuZmlsdGVyKHIgPT4gci5zdGF0dXMgPT09ICdmYWlsZWQnKTtcbiAgICBmb3IgKGNvbnN0IGZhaWxlZCBvZiBmYWlsZWROb3RpZmljYXRpb25zKSB7XG4gICAgICBpZiAoZmFpbGVkLnJldHJ5Q291bnQgPCBNQVhfUkVUUllfQ09VTlQpIHtcbiAgICAgICAgY29uc3QgcmV0cnlSZXN1bHQgPSBhd2FpdCByZXRyeU5vdGlmaWNhdGlvbihmYWlsZWQsIHVzZXIsIHJlcXVlc3QuYWxlcnQpO1xuICAgICAgICBhd2FpdCBzdG9yZU5vdGlmaWNhdGlvblJlc3VsdChyZXRyeVJlc3VsdCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGhlIHJlc3VsdCBpbiB0aGUgYXJyYXlcbiAgICAgICAgY29uc3QgaW5kZXggPSByZXN1bHRzLmZpbmRJbmRleChyID0+IHIubm90aWZpY2F0aW9uSWQgPT09IGZhaWxlZC5ub3RpZmljYXRpb25JZCk7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICByZXN1bHRzW2luZGV4XSA9IHJldHJ5UmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3Igc2VuZGluZyBub3RpZmljYXRpb25zOicsIGVycm9yKTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxufVxuXG4vKipcbiAqIFNlbmQgbm90aWZpY2F0aW9ucyB0byBtdWx0aXBsZSByZWNpcGllbnRzIChjYXJlIGNpcmNsZSlcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmROb3RpZmljYXRpb25Ub0NhcmVDaXJjbGUoXG4gIHVzZXJJZHM6IHN0cmluZ1tdLFxuICBhbGVydDogSGVhbHRoQWxlcnQsXG4gIGNoYW5uZWxzOiBOb3RpZmljYXRpb25DaGFubmVsW11cbik6IFByb21pc2U8Tm90aWZpY2F0aW9uUmVzdWx0W10+IHtcbiAgY29uc3QgYWxsUmVzdWx0czogTm90aWZpY2F0aW9uUmVzdWx0W10gPSBbXTtcblxuICAvLyBTZW5kIG5vdGlmaWNhdGlvbnMgdG8gYWxsIGNhcmUgY2lyY2xlIG1lbWJlcnMgaW4gcGFyYWxsZWxcbiAgY29uc3Qgbm90aWZpY2F0aW9uUHJvbWlzZXMgPSB1c2VySWRzLm1hcCh1c2VySWQgPT5cbiAgICBzZW5kTm90aWZpY2F0aW9uKHtcbiAgICAgIHJlY2lwaWVudDogdXNlcklkLFxuICAgICAgYWxlcnQsXG4gICAgICBjaGFubmVscyxcbiAgICAgIHByaW9yaXR5OiBhbGVydC5zZXZlcml0eSA9PT0gJ2NyaXRpY2FsJyA/ICd1cmdlbnQnIDogJ2hpZ2gnLFxuICAgIH0pXG4gICk7XG5cbiAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKG5vdGlmaWNhdGlvblByb21pc2VzKTtcbiAgcmVzdWx0cy5mb3JFYWNoKHJlc3VsdCA9PiBhbGxSZXN1bHRzLnB1c2goLi4ucmVzdWx0KSk7XG5cbiAgcmV0dXJuIGFsbFJlc3VsdHM7XG59XG4iXX0=