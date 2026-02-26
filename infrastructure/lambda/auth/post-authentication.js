"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_sns_1 = require("@aws-sdk/client-sns");
const dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
const snsClient = new client_sns_1.SNSClient({});
const USERS_TABLE = process.env.USERS_TABLE;
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
const handler = async (event) => {
    console.log('Post-authentication trigger invoked:', JSON.stringify(event, null, 2));
    try {
        const { userName, request } = event;
        const userId = event.request.userAttributes.sub;
        const email = event.request.userAttributes.email;
        const timestamp = new Date().toISOString();
        console.log(`User ${userName} (${userId}) authenticated successfully at ${timestamp}`);
        // Update last active timestamp and login count
        await dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
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
        const userResult = await dynamoClient.send(new lib_dynamodb_1.GetCommand({
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
                        await snsClient.send(new client_sns_1.PublishCommand({
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
                    }
                    catch (snsError) {
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
    }
    catch (error) {
        console.error('Post-authentication error:', error);
        // Log the error but don't fail authentication
        // The user has already been authenticated successfully
        return event;
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zdC1hdXRoZW50aWNhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBvc3QtYXV0aGVudGljYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsOERBQTBEO0FBQzFELHdEQUEwRjtBQUMxRixvREFBZ0U7QUFFaEUsTUFBTSxZQUFZLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLE1BQU0sU0FBUyxHQUFHLElBQUksc0JBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVwQyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVksQ0FBQztBQUM3QyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQztBQUVwRDs7Ozs7Ozs7OztHQVVHO0FBQ0ksTUFBTSxPQUFPLEdBQXFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtJQUN2RSxPQUFPLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXBGLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQztRQUNoRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUM7UUFDakQsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUUzQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsUUFBUSxLQUFLLE1BQU0sbUNBQW1DLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFFdkYsK0NBQStDO1FBQy9DLE1BQU0s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SyxDQUFDLEVBQUUsQ0FBQztnQkFDckIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsTUFBTSx3Q0FBd0MsQ0FBQyxDQUFDO2dCQUNwRiw4REFBOEQ7WUFDaEUsQ0FBQztRQUNILENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsT0FBTyxLQUFLLENBQUM7SUFFZixDQUFDO0lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztRQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRW5ELDhDQUE4QztRQUM5Qyx1REFBdUQ7UUFDdkQsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBbkdXLFFBQUEsT0FBTyxXQW1HbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQb3N0QXV0aGVudGljYXRpb25UcmlnZ2VyRXZlbnQsIFBvc3RBdXRoZW50aWNhdGlvblRyaWdnZXJIYW5kbGVyIH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBVcGRhdGVDb21tYW5kLCBHZXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IFNOU0NsaWVudCwgUHVibGlzaENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc25zJztcblxuY29uc3QgZHluYW1vQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKG5ldyBEeW5hbW9EQkNsaWVudCh7fSkpO1xuY29uc3Qgc25zQ2xpZW50ID0gbmV3IFNOU0NsaWVudCh7fSk7XG5cbmNvbnN0IFVTRVJTX1RBQkxFID0gcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEUhO1xuY29uc3QgQUxFUlRfVE9QSUNfQVJOID0gcHJvY2Vzcy5lbnYuQUxFUlRfVE9QSUNfQVJOO1xuXG4vKipcbiAqIFBvc3QtQXV0aGVudGljYXRpb24gVHJpZ2dlclxuICogXG4gKiBUaGlzIExhbWJkYSBmdW5jdGlvbiBpcyB0cmlnZ2VyZWQgYWZ0ZXIgYSB1c2VyIHN1Y2Nlc3NmdWxseSBhdXRoZW50aWNhdGVzLlxuICogSXQgY2FuIGJlIHVzZWQgdG86XG4gKiAtIFVwZGF0ZSBsYXN0IGxvZ2luIHRpbWVzdGFtcFxuICogLSBMb2cgc3VjY2Vzc2Z1bCBhdXRoZW50aWNhdGlvblxuICogLSBTZW5kIG5vdGlmaWNhdGlvbnMgdG8gY2FyZSBjaXJjbGUgKGZvciBwcmltYXJ5IHVzZXJzKVxuICogLSBUcmFjayBsb2dpbiBwYXR0ZXJuc1xuICogLSBJbml0aWFsaXplIHNlc3Npb24gZGF0YVxuICovXG5leHBvcnQgY29uc3QgaGFuZGxlcjogUG9zdEF1dGhlbnRpY2F0aW9uVHJpZ2dlckhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcbiAgY29uc29sZS5sb2coJ1Bvc3QtYXV0aGVudGljYXRpb24gdHJpZ2dlciBpbnZva2VkOicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IHVzZXJOYW1lLCByZXF1ZXN0IH0gPSBldmVudDtcbiAgICBjb25zdCB1c2VySWQgPSBldmVudC5yZXF1ZXN0LnVzZXJBdHRyaWJ1dGVzLnN1YjtcbiAgICBjb25zdCBlbWFpbCA9IGV2ZW50LnJlcXVlc3QudXNlckF0dHJpYnV0ZXMuZW1haWw7XG4gICAgY29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuXG4gICAgY29uc29sZS5sb2coYFVzZXIgJHt1c2VyTmFtZX0gKCR7dXNlcklkfSkgYXV0aGVudGljYXRlZCBzdWNjZXNzZnVsbHkgYXQgJHt0aW1lc3RhbXB9YCk7XG5cbiAgICAvLyBVcGRhdGUgbGFzdCBhY3RpdmUgdGltZXN0YW1wIGFuZCBsb2dpbiBjb3VudFxuICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBVcGRhdGVDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogVVNFUlNfVEFCTEUsXG4gICAgICBLZXk6IHsgdXNlcklkIH0sXG4gICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIGxhc3RBY3RpdmUgPSA6dGltZXN0YW1wLCBsYXN0TG9naW4gPSA6dGltZXN0YW1wLCBsb2dpbkNvdW50ID0gaWZfbm90X2V4aXN0cyhsb2dpbkNvdW50LCA6emVybykgKyA6b25lJyxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgJzp0aW1lc3RhbXAnOiB0aW1lc3RhbXAsXG4gICAgICAgICc6emVybyc6IDAsXG4gICAgICAgICc6b25lJzogMSxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgLy8gR2V0IHVzZXIgZGV0YWlscyB0byBjaGVjayB1c2VyIHR5cGVcbiAgICBjb25zdCB1c2VyUmVzdWx0ID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IEdldENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBVU0VSU19UQUJMRSxcbiAgICAgIEtleTogeyB1c2VySWQgfSxcbiAgICB9KSk7XG5cbiAgICBpZiAodXNlclJlc3VsdC5JdGVtKSB7XG4gICAgICBjb25zdCB1c2VyVHlwZSA9IHVzZXJSZXN1bHQuSXRlbS51c2VyVHlwZTtcbiAgICAgIGNvbnN0IGxvZ2luQ291bnQgPSAodXNlclJlc3VsdC5JdGVtLmxvZ2luQ291bnQgfHwgMCkgKyAxO1xuXG4gICAgICBjb25zb2xlLmxvZyhgVXNlciB0eXBlOiAke3VzZXJUeXBlfSwgVG90YWwgbG9naW5zOiAke2xvZ2luQ291bnR9YCk7XG5cbiAgICAgIC8vIEZvciBwcmltYXJ5IHVzZXJzLCBub3RpZnkgY2FyZSBjaXJjbGUgb2YgbG9naW4gKG9wdGlvbmFsLCBiYXNlZCBvbiBwcmVmZXJlbmNlcylcbiAgICAgIGlmICh1c2VyVHlwZSA9PT0gJ3ByaW1hcnknICYmIHVzZXJSZXN1bHQuSXRlbS5jYXJlQ2lyY2xlICYmIHVzZXJSZXN1bHQuSXRlbS5jYXJlQ2lyY2xlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3Qgbm90aWZ5T25Mb2dpbiA9IHVzZXJSZXN1bHQuSXRlbS5wcmVmZXJlbmNlcz8ubm90aWZ5T25Mb2dpbiB8fCBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChub3RpZnlPbkxvZ2luICYmIEFMRVJUX1RPUElDX0FSTikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCBzbnNDbGllbnQuc2VuZChuZXcgUHVibGlzaENvbW1hbmQoe1xuICAgICAgICAgICAgICBUb3BpY0FybjogQUxFUlRfVE9QSUNfQVJOLFxuICAgICAgICAgICAgICBTdWJqZWN0OiAnUHJpbWFyeSBVc2VyIExvZ2luIE5vdGlmaWNhdGlvbicsXG4gICAgICAgICAgICAgIE1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICB0eXBlOiAndXNlcl9sb2dpbicsXG4gICAgICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAgICAgIGVtYWlsLFxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcCxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgJHt1c2VyUmVzdWx0Lkl0ZW0ucHJvZmlsZT8uZmlyc3ROYW1lIHx8ICdVc2VyJ30gaGFzIGxvZ2dlZCBpbiB0byB0aGUgSGVhbHRoY2FyZSBNb25pdG9yaW5nIEFwcGAsXG4gICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICBNZXNzYWdlQXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGV2ZW50VHlwZToge1xuICAgICAgICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgU3RyaW5nVmFsdWU6ICd1c2VyX2xvZ2luJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHVzZXJJZDoge1xuICAgICAgICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgU3RyaW5nVmFsdWU6IHVzZXJJZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0NhcmUgY2lyY2xlIG5vdGlmaWVkIG9mIHByaW1hcnkgdXNlciBsb2dpbicpO1xuICAgICAgICAgIH0gY2F0Y2ggKHNuc0Vycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gbm90aWZ5IGNhcmUgY2lyY2xlOicsIHNuc0Vycm9yKTtcbiAgICAgICAgICAgIC8vIERvbid0IGZhaWwgYXV0aGVudGljYXRpb24gaWYgbm90aWZpY2F0aW9uIGZhaWxzXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFRyYWNrIGF1dGhlbnRpY2F0aW9uIHBhdHRlcm5zIGZvciBzZWN1cml0eSBtb25pdG9yaW5nXG4gICAgICBjb25zdCBjbGllbnRNZXRhZGF0YSA9IHJlcXVlc3QuY2xpZW50TWV0YWRhdGEgfHwge307XG4gICAgICBjb25zdCBpcEFkZHJlc3MgPSBjbGllbnRNZXRhZGF0YS5pcEFkZHJlc3M7XG4gICAgICBjb25zdCB1c2VyQWdlbnQgPSBjbGllbnRNZXRhZGF0YS51c2VyQWdlbnQ7XG5cbiAgICAgIGlmIChpcEFkZHJlc3MgfHwgdXNlckFnZW50KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBMb2dpbiBmcm9tIElQOiAke2lwQWRkcmVzc30sIFVzZXIgQWdlbnQ6ICR7dXNlckFnZW50fWApO1xuICAgICAgICBcbiAgICAgICAgLy8gWW91IGNvdWxkIHN0b3JlIHRoaXMgaW4gYSBzZXBhcmF0ZSB0YWJsZSBmb3Igc2VjdXJpdHkgYW5hbHl0aWNzXG4gICAgICAgIC8vIG9yIHNlbmQgdG8gQ2xvdWRXYXRjaCBmb3IgbW9uaXRvcmluZ1xuICAgICAgfVxuXG4gICAgICAvLyBGaXJzdC10aW1lIGxvZ2luIGRldGVjdGlvblxuICAgICAgaWYgKGxvZ2luQ291bnQgPT09IDEpIHtcbiAgICAgICAgY29uc29sZS5sb2coYEZpcnN0IGxvZ2luIGZvciB1c2VyICR7dXNlcklkfSAtIGNvbnNpZGVyIHRyaWdnZXJpbmcgb25ib2FyZGluZyBmbG93YCk7XG4gICAgICAgIC8vIFlvdSBjb3VsZCBzZW5kIGEgd2VsY29tZSBub3RpZmljYXRpb24gb3IgdHJpZ2dlciBvbmJvYXJkaW5nXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRoZSBldmVudCB0byBjb21wbGV0ZSBhdXRoZW50aWNhdGlvblxuICAgIHJldHVybiBldmVudDtcblxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgY29uc29sZS5lcnJvcignUG9zdC1hdXRoZW50aWNhdGlvbiBlcnJvcjonLCBlcnJvcik7XG4gICAgXG4gICAgLy8gTG9nIHRoZSBlcnJvciBidXQgZG9uJ3QgZmFpbCBhdXRoZW50aWNhdGlvblxuICAgIC8vIFRoZSB1c2VyIGhhcyBhbHJlYWR5IGJlZW4gYXV0aGVudGljYXRlZCBzdWNjZXNzZnVsbHlcbiAgICByZXR1cm4gZXZlbnQ7XG4gIH1cbn07XG4iXX0=