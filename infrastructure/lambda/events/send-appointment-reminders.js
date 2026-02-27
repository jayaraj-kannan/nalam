"use strict";
// Send Appointment Reminders Lambda Function
// Requirements: 6.1, 6.2
// Triggered by EventBridge scheduled rules to send appointment reminders
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const appointments_1 = require("../shared/data-access/appointments");
const users_1 = require("../shared/data-access/users");
const care_circle_1 = require("../shared/data-access/care-circle");
const notification_service_1 = require("../shared/notification-service");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const dynamodbClient = new client_dynamodb_1.DynamoDBClient({});
/**
 * Get all users who have appointments scheduled
 */
async function getAllUsersWithAppointments() {
    const userIds = new Set();
    try {
        const result = await dynamodbClient.send(new client_dynamodb_1.ScanCommand({
            TableName: process.env.APPOINTMENTS_TABLE || 'healthcare-appointments-dev',
            ProjectionExpression: 'userId',
        }));
        if (result.Items) {
            result.Items.forEach(item => {
                const unmarshalled = (0, util_dynamodb_1.unmarshall)(item);
                if (unmarshalled.userId) {
                    userIds.add(unmarshalled.userId);
                }
            });
        }
    }
    catch (error) {
        console.error('Error scanning appointments table:', error);
    }
    return Array.from(userIds);
}
/**
 * Check if appointment reminder should be sent
 * Send reminders at 24 hours and 2 hours before appointment
 */
function shouldSendReminder(scheduledTime, checkTime, reminderHours) {
    const timeDiff = scheduledTime.getTime() - checkTime.getTime();
    const targetDiff = reminderHours * 60 * 60 * 1000; // Convert hours to milliseconds
    // Send reminder if we're within 5 minutes of the target reminder time
    const tolerance = 5 * 60 * 1000; // 5 minutes
    return Math.abs(timeDiff - targetDiff) <= tolerance;
}
/**
 * Send appointment reminder to user and care circle
 */
async function sendAppointmentReminder(userId, appointmentId, providerName, appointmentType, scheduledTime, location, preparationInstructions, reminderHours) {
    try {
        const user = await (0, users_1.getUser)(userId);
        if (!user) {
            console.error('User not found:', userId);
            return;
        }
        // Format reminder message
        const timeUntil = reminderHours === 24 ? '24 hours' : '2 hours';
        const dateStr = scheduledTime.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        let message = `Reminder: You have a ${appointmentType} appointment with ${providerName} in ${timeUntil}.\n`;
        message += `Scheduled for: ${dateStr}`;
        if (location) {
            message += `\nLocation: ${location}`;
        }
        if (preparationInstructions && reminderHours === 24) {
            message += `\n\nPreparation: ${preparationInstructions}`;
        }
        // Create alert for appointment reminder
        const alert = {
            id: `appt-reminder-${appointmentId}-${reminderHours}h`,
            userId,
            type: 'appointment',
            severity: reminderHours === 2 ? 'medium' : 'low',
            message,
            timestamp: new Date(),
            acknowledged: false,
            escalated: false,
            relatedData: {
                appointmentId,
                providerName,
                appointmentType,
                scheduledTime: scheduledTime.toISOString(),
                reminderHours,
            },
        };
        // Get user's preferred notification channels
        const channels = ('preferences' in user && user.preferences?.notificationChannels)
            ? user.preferences.notificationChannels
            : ['push', 'sms', 'email'];
        // Send notification to primary user
        await (0, notification_service_1.sendNotification)({
            recipient: userId,
            alert,
            channels,
            priority: reminderHours === 2 ? 'high' : 'normal',
        });
        console.log(`Appointment reminder sent to user ${userId} for appointment ${appointmentId} (${timeUntil} before)`);
        // Share appointment schedule with care circle (Requirement 6.2)
        try {
            const careCircleMembers = await (0, care_circle_1.getCareCircleMembers)(userId);
            if (careCircleMembers.length > 0) {
                const careCircleUserIds = careCircleMembers
                    .filter(member => member.permissions.canViewAppointments)
                    .map(member => member.userId);
                if (careCircleUserIds.length > 0) {
                    // Create a simpler message for care circle
                    const careCircleMessage = `${user.profile.firstName} ${user.profile.lastName} has a ${appointmentType} appointment with ${providerName} in ${timeUntil}.\nScheduled for: ${dateStr}`;
                    const careCircleAlert = {
                        ...alert,
                        id: `appt-reminder-cc-${appointmentId}-${reminderHours}h`,
                        message: careCircleMessage,
                    };
                    await (0, notification_service_1.sendNotificationToCareCircle)(careCircleUserIds, careCircleAlert, ['push', 'email']);
                    console.log(`Appointment reminder shared with ${careCircleUserIds.length} care circle members`);
                }
            }
        }
        catch (error) {
            console.error('Error notifying care circle:', error);
            // Don't fail if care circle notification fails
        }
    }
    catch (error) {
        console.error('Error sending appointment reminder:', error);
    }
}
/**
 * Main handler for appointment reminder event
 */
async function handler(event) {
    try {
        console.log('Processing appointment reminders:', JSON.stringify(event));
        const detail = event.detail;
        const checkTime = (detail && detail.checkTime)
            ? new Date(detail.checkTime)
            : new Date();
        console.log('Checking for appointments scheduled around:', checkTime.toISOString());
        // Get all users with appointments
        const userIds = await getAllUsersWithAppointments();
        console.log(`Found ${userIds.length} users with appointments`);
        // Check each user's appointments
        for (const userId of userIds) {
            try {
                // Get upcoming appointments for the next 25 hours (to catch 24-hour reminders)
                const endTime = new Date(checkTime.getTime() + 25 * 60 * 60 * 1000);
                const appointments = await (0, appointments_1.getUpcomingAppointments)(userId, checkTime, endTime);
                for (const appointment of appointments) {
                    // Only send reminders for scheduled or confirmed appointments
                    if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
                        // Check if reminders are enabled
                        if (appointment.reminders.enabled) {
                            // Check each reminder time configured
                            for (const reminderHours of appointment.reminders.times) {
                                if (shouldSendReminder(appointment.scheduledTime, checkTime, reminderHours)) {
                                    await sendAppointmentReminder(userId, appointment.id, appointment.provider.name, appointment.type, appointment.scheduledTime, appointment.location, appointment.preparationInstructions, reminderHours);
                                }
                            }
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Error processing appointments for user ${userId}:`, error);
                // Continue with next user
            }
        }
        console.log('Appointment reminders processing complete');
    }
    catch (error) {
        console.error('Error in appointment reminder handler:', error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZC1hcHBvaW50bWVudC1yZW1pbmRlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZW5kLWFwcG9pbnRtZW50LXJlbWluZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNkNBQTZDO0FBQzdDLHlCQUF5QjtBQUN6Qix5RUFBeUU7O0FBZ0x6RSwwQkF1REM7QUFwT0QscUVBQTZFO0FBQzdFLHVEQUFzRDtBQUN0RCxtRUFBeUU7QUFDekUseUVBQWdHO0FBRWhHLDhEQUF1RTtBQUN2RSwwREFBb0Q7QUFFcEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBVTlDOztHQUVHO0FBQ0gsS0FBSyxVQUFVLDJCQUEyQjtJQUN4QyxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBRWxDLElBQUksQ0FBQztRQUNILE1BQU0sTUFBTSxHQUFHLE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLDZCQUFXLENBQUM7WUFDdkQsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksNkJBQTZCO1lBQzFFLG9CQUFvQixFQUFFLFFBQVE7U0FDL0IsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNqQixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDMUIsTUFBTSxZQUFZLEdBQUcsSUFBQSwwQkFBVSxFQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QyxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBZ0IsQ0FBQyxDQUFDO2dCQUM3QyxDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFD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QUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsTUFBTSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzFFLDBCQUEwQjtZQUM1QixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQTJDLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0QsTUFBTSxLQUFLLENBQUM7SUFDZCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFNlbmQgQXBwb2ludG1lbnQgUmVtaW5kZXJzIExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiA2LjEsIDYuMlxuLy8gVHJpZ2dlcmVkIGJ5IEV2ZW50QnJpZGdlIHNjaGVkdWxlZCBydWxlcyB0byBzZW5kIGFwcG9pbnRtZW50IHJlbWluZGVyc1xuXG5pbXBvcnQgeyBFdmVudEJyaWRnZUV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBnZXRVcGNvbWluZ0FwcG9pbnRtZW50cyB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9hcHBvaW50bWVudHMnO1xuaW1wb3J0IHsgZ2V0VXNlciB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy91c2Vycyc7XG5pbXBvcnQgeyBnZXRDYXJlQ2lyY2xlTWVtYmVycyB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9jYXJlLWNpcmNsZSc7XG5pbXBvcnQgeyBzZW5kTm90aWZpY2F0aW9uLCBzZW5kTm90aWZpY2F0aW9uVG9DYXJlQ2lyY2xlIH0gZnJvbSAnLi4vc2hhcmVkL25vdGlmaWNhdGlvbi1zZXJ2aWNlJztcbmltcG9ydCB7IEhlYWx0aEFsZXJ0LCBOb3RpZmljYXRpb25DaGFubmVsIH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50LCBTY2FuQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyB1bm1hcnNoYWxsIH0gZnJvbSAnQGF3cy1zZGsvdXRpbC1keW5hbW9kYic7XG5cbmNvbnN0IGR5bmFtb2RiQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcblxuaW50ZXJmYWNlIEFwcG9pbnRtZW50UmVtaW5kZXJFdmVudCB7XG4gIHNvdXJjZTogc3RyaW5nO1xuICAnZGV0YWlsLXR5cGUnOiBzdHJpbmc7XG4gIGRldGFpbD86IHtcbiAgICBjaGVja1RpbWU/OiBzdHJpbmc7IC8vIElTTyB0aW1lc3RhbXAgdG8gY2hlY2sgZm9yIHVwY29taW5nIGFwcG9pbnRtZW50c1xuICB9O1xufVxuXG4vKipcbiAqIEdldCBhbGwgdXNlcnMgd2hvIGhhdmUgYXBwb2ludG1lbnRzIHNjaGVkdWxlZFxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRBbGxVc2Vyc1dpdGhBcHBvaW50bWVudHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICBjb25zdCB1c2VySWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIFxuICB0cnkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGR5bmFtb2RiQ2xpZW50LnNlbmQobmV3IFNjYW5Db21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuQVBQT0lOVE1FTlRTX1RBQkxFIHx8ICdoZWFsdGhjYXJlLWFwcG9pbnRtZW50cy1kZXYnLFxuICAgICAgUHJvamVjdGlvbkV4cHJlc3Npb246ICd1c2VySWQnLFxuICAgIH0pKTtcblxuICAgIGlmIChyZXN1bHQuSXRlbXMpIHtcbiAgICAgIHJlc3VsdC5JdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICBjb25zdCB1bm1hcnNoYWxsZWQgPSB1bm1hcnNoYWxsKGl0ZW0pO1xuICAgICAgICBpZiAodW5tYXJzaGFsbGVkLnVzZXJJZCkge1xuICAgICAgICAgIHVzZXJJZHMuYWRkKHVubWFyc2hhbGxlZC51c2VySWQgYXMgc3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNjYW5uaW5nIGFwcG9pbnRtZW50cyB0YWJsZTonLCBlcnJvcik7XG4gIH1cblxuICByZXR1cm4gQXJyYXkuZnJvbSh1c2VySWRzKTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhcHBvaW50bWVudCByZW1pbmRlciBzaG91bGQgYmUgc2VudFxuICogU2VuZCByZW1pbmRlcnMgYXQgMjQgaG91cnMgYW5kIDIgaG91cnMgYmVmb3JlIGFwcG9pbnRtZW50XG4gKi9cbmZ1bmN0aW9uIHNob3VsZFNlbmRSZW1pbmRlcihzY2hlZHVsZWRUaW1lOiBEYXRlLCBjaGVja1RpbWU6IERhdGUsIHJlbWluZGVySG91cnM6IG51bWJlcik6IGJvb2xlYW4ge1xuICBjb25zdCB0aW1lRGlmZiA9IHNjaGVkdWxlZFRpbWUuZ2V0VGltZSgpIC0gY2hlY2tUaW1lLmdldFRpbWUoKTtcbiAgY29uc3QgdGFyZ2V0RGlmZiA9IHJlbWluZGVySG91cnMgKiA2MCAqIDYwICogMTAwMDsgLy8gQ29udmVydCBob3VycyB0byBtaWxsaXNlY29uZHNcbiAgXG4gIC8vIFNlbmQgcmVtaW5kZXIgaWYgd2UncmUgd2l0aGluIDUgbWludXRlcyBvZiB0aGUgdGFyZ2V0IHJlbWluZGVyIHRpbWVcbiAgY29uc3QgdG9sZXJhbmNlID0gNSAqIDYwICogMTAwMDsgLy8gNSBtaW51dGVzXG4gIHJldHVybiBNYXRoLmFicyh0aW1lRGlmZiAtIHRhcmdldERpZmYpIDw9IHRvbGVyYW5jZTtcbn1cblxuLyoqXG4gKiBTZW5kIGFwcG9pbnRtZW50IHJlbWluZGVyIHRvIHVzZXIgYW5kIGNhcmUgY2lyY2xlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHNlbmRBcHBvaW50bWVudFJlbWluZGVyKFxuICB1c2VySWQ6IHN0cmluZyxcbiAgYXBwb2ludG1lbnRJZDogc3RyaW5nLFxuICBwcm92aWRlck5hbWU6IHN0cmluZyxcbiAgYXBwb2ludG1lbnRUeXBlOiBzdHJpbmcsXG4gIHNjaGVkdWxlZFRpbWU6IERhdGUsXG4gIGxvY2F0aW9uOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIHByZXBhcmF0aW9uSW5zdHJ1Y3Rpb25zOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIHJlbWluZGVySG91cnM6IG51bWJlclxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXIodXNlcklkKTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VzZXIgbm90IGZvdW5kOicsIHVzZXJJZCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRm9ybWF0IHJlbWluZGVyIG1lc3NhZ2VcbiAgICBjb25zdCB0aW1lVW50aWwgPSByZW1pbmRlckhvdXJzID09PSAyNCA/ICcyNCBob3VycycgOiAnMiBob3Vycyc7XG4gICAgY29uc3QgZGF0ZVN0ciA9IHNjaGVkdWxlZFRpbWUudG9Mb2NhbGVTdHJpbmcoJ2VuLVVTJywge1xuICAgICAgd2Vla2RheTogJ2xvbmcnLFxuICAgICAgeWVhcjogJ251bWVyaWMnLFxuICAgICAgbW9udGg6ICdsb25nJyxcbiAgICAgIGRheTogJ251bWVyaWMnLFxuICAgICAgaG91cjogJzItZGlnaXQnLFxuICAgICAgbWludXRlOiAnMi1kaWdpdCcsXG4gICAgfSk7XG5cbiAgICBsZXQgbWVzc2FnZSA9IGBSZW1pbmRlcjogWW91IGhhdmUgYSAke2FwcG9pbnRtZW50VHlwZX0gYXBwb2ludG1lbnQgd2l0aCAke3Byb3ZpZGVyTmFtZX0gaW4gJHt0aW1lVW50aWx9LlxcbmA7XG4gICAgbWVzc2FnZSArPSBgU2NoZWR1bGVkIGZvcjogJHtkYXRlU3RyfWA7XG4gICAgXG4gICAgaWYgKGxvY2F0aW9uKSB7XG4gICAgICBtZXNzYWdlICs9IGBcXG5Mb2NhdGlvbjogJHtsb2NhdGlvbn1gO1xuICAgIH1cbiAgICBcbiAgICBpZiAocHJlcGFyYXRpb25JbnN0cnVjdGlvbnMgJiYgcmVtaW5kZXJIb3VycyA9PT0gMjQpIHtcbiAgICAgIG1lc3NhZ2UgKz0gYFxcblxcblByZXBhcmF0aW9uOiAke3ByZXBhcmF0aW9uSW5zdHJ1Y3Rpb25zfWA7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGFsZXJ0IGZvciBhcHBvaW50bWVudCByZW1pbmRlclxuICAgIGNvbnN0IGFsZXJ0OiBIZWFsdGhBbGVydCA9IHtcbiAgICAgIGlkOiBgYXBwdC1yZW1pbmRlci0ke2FwcG9pbnRtZW50SWR9LSR7cmVtaW5kZXJIb3Vyc31oYCxcbiAgICAgIHVzZXJJZCxcbiAgICAgIHR5cGU6ICdhcHBvaW50bWVudCcsXG4gICAgICBzZXZlcml0eTogcmVtaW5kZXJIb3VycyA9PT0gMiA/ICdtZWRpdW0nIDogJ2xvdycsXG4gICAgICBtZXNzYWdlLFxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxuICAgICAgYWNrbm93bGVkZ2VkOiBmYWxzZSxcbiAgICAgIGVzY2FsYXRlZDogZmFsc2UsXG4gICAgICByZWxhdGVkRGF0YToge1xuICAgICAgICBhcHBvaW50bWVudElkLFxuICAgICAgICBwcm92aWRlck5hbWUsXG4gICAgICAgIGFwcG9pbnRtZW50VHlwZSxcbiAgICAgICAgc2NoZWR1bGVkVGltZTogc2NoZWR1bGVkVGltZS50b0lTT1N0cmluZygpLFxuICAgICAgICByZW1pbmRlckhvdXJzLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gR2V0IHVzZXIncyBwcmVmZXJyZWQgbm90aWZpY2F0aW9uIGNoYW5uZWxzXG4gICAgY29uc3QgY2hhbm5lbHM6IE5vdGlmaWNhdGlvbkNoYW5uZWxbXSA9ICgncHJlZmVyZW5jZXMnIGluIHVzZXIgJiYgdXNlci5wcmVmZXJlbmNlcz8ubm90aWZpY2F0aW9uQ2hhbm5lbHMpIFxuICAgICAgPyB1c2VyLnByZWZlcmVuY2VzLm5vdGlmaWNhdGlvbkNoYW5uZWxzIFxuICAgICAgOiBbJ3B1c2gnLCAnc21zJywgJ2VtYWlsJ107XG5cbiAgICAvLyBTZW5kIG5vdGlmaWNhdGlvbiB0byBwcmltYXJ5IHVzZXJcbiAgICBhd2FpdCBzZW5kTm90aWZpY2F0aW9uKHtcbiAgICAgIHJlY2lwaWVudDogdXNlcklkLFxuICAgICAgYWxlcnQsXG4gICAgICBjaGFubmVscyxcbiAgICAgIHByaW9yaXR5OiByZW1pbmRlckhvdXJzID09PSAyID8gJ2hpZ2gnIDogJ25vcm1hbCcsXG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZyhgQXBwb2ludG1lbnQgcmVtaW5kZXIgc2VudCB0byB1c2VyICR7dXNlcklkfSBmb3IgYXBwb2ludG1lbnQgJHthcHBvaW50bWVudElkfSAoJHt0aW1lVW50aWx9IGJlZm9yZSlgKTtcblxuICAgIC8vIFNoYXJlIGFwcG9pbnRtZW50IHNjaGVkdWxlIHdpdGggY2FyZSBjaXJjbGUgKFJlcXVpcmVtZW50IDYuMilcbiAgICB0cnkge1xuICAgICAgY29uc3QgY2FyZUNpcmNsZU1lbWJlcnMgPSBhd2FpdCBnZXRDYXJlQ2lyY2xlTWVtYmVycyh1c2VySWQpO1xuICAgICAgaWYgKGNhcmVDaXJjbGVNZW1iZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgY2FyZUNpcmNsZVVzZXJJZHMgPSBjYXJlQ2lyY2xlTWVtYmVyc1xuICAgICAgICAgIC5maWx0ZXIobWVtYmVyID0+IG1lbWJlci5wZXJtaXNzaW9ucy5jYW5WaWV3QXBwb2ludG1lbnRzKVxuICAgICAgICAgIC5tYXAobWVtYmVyID0+IG1lbWJlci51c2VySWQpO1xuXG4gICAgICAgIGlmIChjYXJlQ2lyY2xlVXNlcklkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgLy8gQ3JlYXRlIGEgc2ltcGxlciBtZXNzYWdlIGZvciBjYXJlIGNpcmNsZVxuICAgICAgICAgIGNvbnN0IGNhcmVDaXJjbGVNZXNzYWdlID0gYCR7dXNlci5wcm9maWxlLmZpcnN0TmFtZX0gJHt1c2VyLnByb2ZpbGUubGFzdE5hbWV9IGhhcyBhICR7YXBwb2ludG1lbnRUeXBlfSBhcHBvaW50bWVudCB3aXRoICR7cHJvdmlkZXJOYW1lfSBpbiAke3RpbWVVbnRpbH0uXFxuU2NoZWR1bGVkIGZvcjogJHtkYXRlU3RyfWA7XG4gICAgICAgICAgXG4gICAgICAgICAgY29uc3QgY2FyZUNpcmNsZUFsZXJ0OiBIZWFsdGhBbGVydCA9IHtcbiAgICAgICAgICAgIC4uLmFsZXJ0LFxuICAgICAgICAgICAgaWQ6IGBhcHB0LXJlbWluZGVyLWNjLSR7YXBwb2ludG1lbnRJZH0tJHtyZW1pbmRlckhvdXJzfWhgLFxuICAgICAgICAgICAgbWVzc2FnZTogY2FyZUNpcmNsZU1lc3NhZ2UsXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGF3YWl0IHNlbmROb3RpZmljYXRpb25Ub0NhcmVDaXJjbGUoXG4gICAgICAgICAgICBjYXJlQ2lyY2xlVXNlcklkcyxcbiAgICAgICAgICAgIGNhcmVDaXJjbGVBbGVydCxcbiAgICAgICAgICAgIFsncHVzaCcsICdlbWFpbCddXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKGBBcHBvaW50bWVudCByZW1pbmRlciBzaGFyZWQgd2l0aCAke2NhcmVDaXJjbGVVc2VySWRzLmxlbmd0aH0gY2FyZSBjaXJjbGUgbWVtYmVyc2ApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIG5vdGlmeWluZyBjYXJlIGNpcmNsZTonLCBlcnJvcik7XG4gICAgICAvLyBEb24ndCBmYWlsIGlmIGNhcmUgY2lyY2xlIG5vdGlmaWNhdGlvbiBmYWlsc1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzZW5kaW5nIGFwcG9pbnRtZW50IHJlbWluZGVyOicsIGVycm9yKTtcbiAgfVxufVxuXG4vKipcbiAqIE1haW4gaGFuZGxlciBmb3IgYXBwb2ludG1lbnQgcmVtaW5kZXIgZXZlbnRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEV2ZW50QnJpZGdlRXZlbnQ8c3RyaW5nLCBBcHBvaW50bWVudFJlbWluZGVyRXZlbnQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coJ1Byb2Nlc3NpbmcgYXBwb2ludG1lbnQgcmVtaW5kZXJzOicsIEpTT04uc3RyaW5naWZ5KGV2ZW50KSk7XG5cbiAgICBjb25zdCBkZXRhaWwgPSBldmVudC5kZXRhaWwgYXMgeyBjaGVja1RpbWU/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBjaGVja1RpbWUgPSAoZGV0YWlsICYmIGRldGFpbC5jaGVja1RpbWUpIFxuICAgICAgPyBuZXcgRGF0ZShkZXRhaWwuY2hlY2tUaW1lKSBcbiAgICAgIDogbmV3IERhdGUoKTtcbiAgICBjb25zb2xlLmxvZygnQ2hlY2tpbmcgZm9yIGFwcG9pbnRtZW50cyBzY2hlZHVsZWQgYXJvdW5kOicsIGNoZWNrVGltZS50b0lTT1N0cmluZygpKTtcblxuICAgIC8vIEdldCBhbGwgdXNlcnMgd2l0aCBhcHBvaW50bWVudHNcbiAgICBjb25zdCB1c2VySWRzID0gYXdhaXQgZ2V0QWxsVXNlcnNXaXRoQXBwb2ludG1lbnRzKCk7XG4gICAgY29uc29sZS5sb2coYEZvdW5kICR7dXNlcklkcy5sZW5ndGh9IHVzZXJzIHdpdGggYXBwb2ludG1lbnRzYCk7XG5cbiAgICAvLyBDaGVjayBlYWNoIHVzZXIncyBhcHBvaW50bWVudHNcbiAgICBmb3IgKGNvbnN0IHVzZXJJZCBvZiB1c2VySWRzKSB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBHZXQgdXBjb21pbmcgYXBwb2ludG1lbnRzIGZvciB0aGUgbmV4dCAyNSBob3VycyAodG8gY2F0Y2ggMjQtaG91ciByZW1pbmRlcnMpXG4gICAgICAgIGNvbnN0IGVuZFRpbWUgPSBuZXcgRGF0ZShjaGVja1RpbWUuZ2V0VGltZSgpICsgMjUgKiA2MCAqIDYwICogMTAwMCk7XG4gICAgICAgIGNvbnN0IGFwcG9pbnRtZW50cyA9IGF3YWl0IGdldFVwY29taW5nQXBwb2ludG1lbnRzKHVzZXJJZCwgY2hlY2tUaW1lLCBlbmRUaW1lKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3QgYXBwb2ludG1lbnQgb2YgYXBwb2ludG1lbnRzKSB7XG4gICAgICAgICAgLy8gT25seSBzZW5kIHJlbWluZGVycyBmb3Igc2NoZWR1bGVkIG9yIGNvbmZpcm1lZCBhcHBvaW50bWVudHNcbiAgICAgICAgICBpZiAoYXBwb2ludG1lbnQuc3RhdHVzID09PSAnc2NoZWR1bGVkJyB8fCBhcHBvaW50bWVudC5zdGF0dXMgPT09ICdjb25maXJtZWQnKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiByZW1pbmRlcnMgYXJlIGVuYWJsZWRcbiAgICAgICAgICAgIGlmIChhcHBvaW50bWVudC5yZW1pbmRlcnMuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAvLyBDaGVjayBlYWNoIHJlbWluZGVyIHRpbWUgY29uZmlndXJlZFxuICAgICAgICAgICAgICBmb3IgKGNvbnN0IHJlbWluZGVySG91cnMgb2YgYXBwb2ludG1lbnQucmVtaW5kZXJzLnRpbWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNob3VsZFNlbmRSZW1pbmRlcihhcHBvaW50bWVudC5zY2hlZHVsZWRUaW1lLCBjaGVja1RpbWUsIHJlbWluZGVySG91cnMpKSB7XG4gICAgICAgICAgICAgICAgICBhd2FpdCBzZW5kQXBwb2ludG1lbnRSZW1pbmRlcihcbiAgICAgICAgICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAgICAgICAgICBhcHBvaW50bWVudC5pZCxcbiAgICAgICAgICAgICAgICAgICAgYXBwb2ludG1lbnQucHJvdmlkZXIubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgYXBwb2ludG1lbnQudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgYXBwb2ludG1lbnQuc2NoZWR1bGVkVGltZSxcbiAgICAgICAgICAgICAgICAgICAgYXBwb2ludG1lbnQubG9jYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGFwcG9pbnRtZW50LnByZXBhcmF0aW9uSW5zdHJ1Y3Rpb25zLFxuICAgICAgICAgICAgICAgICAgICByZW1pbmRlckhvdXJzXG4gICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcHJvY2Vzc2luZyBhcHBvaW50bWVudHMgZm9yIHVzZXIgJHt1c2VySWR9OmAsIGVycm9yKTtcbiAgICAgICAgLy8gQ29udGludWUgd2l0aCBuZXh0IHVzZXJcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZygnQXBwb2ludG1lbnQgcmVtaW5kZXJzIHByb2Nlc3NpbmcgY29tcGxldGUnKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBhcHBvaW50bWVudCByZW1pbmRlciBoYW5kbGVyOicsIGVycm9yKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuIl19