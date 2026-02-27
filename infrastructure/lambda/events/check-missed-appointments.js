"use strict";
// Check Missed Appointments Lambda Function
// Requirements: 6.4
// Triggered by EventBridge scheduled rules to detect missed appointments
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const appointments_1 = require("../shared/data-access/appointments");
const care_circle_1 = require("../shared/data-access/care-circle");
const users_1 = require("../shared/data-access/users");
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
 * Check if appointment should be marked as missed
 * An appointment is considered missed if:
 * - Status is 'scheduled' or 'confirmed'
 * - Scheduled time has passed by more than the appointment duration (or 30 minutes default)
 */
function isMissedAppointment(scheduledTime, duration, checkTime) {
    const appointmentDuration = duration || 30; // Default 30 minutes
    const appointmentEndTime = new Date(scheduledTime.getTime() + appointmentDuration * 60 * 1000);
    // Consider missed if current time is past the appointment end time
    return checkTime > appointmentEndTime;
}
/**
 * Mark appointment as missed and notify care circle
 */
async function handleMissedAppointment(userId, appointmentId, providerName, appointmentType, scheduledTime) {
    try {
        // Update appointment status to 'missed'
        await (0, appointments_1.updateAppointmentStatus)(userId, appointmentId, 'missed', 'Automatically marked as missed');
        console.log(`Appointment ${appointmentId} marked as missed for user ${userId}`);
        // Get user information
        const user = await (0, users_1.getUser)(userId);
        if (!user) {
            console.error('User not found:', userId);
            return;
        }
        // Notify care circle members (Requirement 6.4)
        try {
            const careCircleMembers = await (0, care_circle_1.getCareCircleMembers)(userId);
            if (careCircleMembers.length > 0) {
                const careCircleUserIds = careCircleMembers
                    .filter(member => member.permissions.canViewAppointments && member.permissions.canReceiveAlerts)
                    .map(member => member.userId);
                if (careCircleUserIds.length > 0) {
                    const dateStr = scheduledTime.toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    });
                    const message = `${user.profile.firstName} ${user.profile.lastName} missed a ${appointmentType} appointment with ${providerName}.\nScheduled for: ${dateStr}`;
                    // Create alert for missed appointment
                    const alert = {
                        id: `missed-appt-${appointmentId}`,
                        userId,
                        type: 'appointment',
                        severity: 'medium',
                        message,
                        timestamp: new Date(),
                        acknowledged: false,
                        escalated: false,
                        relatedData: {
                            appointmentId,
                            providerName,
                            appointmentType,
                            scheduledTime: scheduledTime.toISOString(),
                            status: 'missed',
                        },
                    };
                    await (0, notification_service_1.sendNotificationToCareCircle)(careCircleUserIds, alert, ['push', 'sms', 'email']);
                    console.log(`Missed appointment notification sent to ${careCircleUserIds.length} care circle members`);
                }
            }
        }
        catch (error) {
            console.error('Error notifying care circle about missed appointment:', error);
            // Don't fail if care circle notification fails
        }
    }
    catch (error) {
        console.error('Error handling missed appointment:', error);
    }
}
/**
 * Main handler for missed appointment check event
 */
async function handler(event) {
    try {
        console.log('Checking for missed appointments:', JSON.stringify(event));
        const detail = event.detail;
        const checkTime = (detail && detail.checkTime)
            ? new Date(detail.checkTime)
            : new Date();
        console.log('Checking for appointments missed as of:', checkTime.toISOString());
        // Get all users with appointments
        const userIds = await getAllUsersWithAppointments();
        console.log(`Found ${userIds.length} users with appointments`);
        let missedCount = 0;
        // Check each user's appointments
        for (const userId of userIds) {
            try {
                // Get appointments from 7 days ago to now (to catch recently missed appointments)
                const startTime = new Date(checkTime.getTime() - 7 * 24 * 60 * 60 * 1000);
                const appointments = await (0, appointments_1.getUpcomingAppointments)(userId, startTime, checkTime);
                for (const appointment of appointments) {
                    // Only check scheduled or confirmed appointments
                    if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
                        if (isMissedAppointment(appointment.scheduledTime, appointment.duration, checkTime)) {
                            await handleMissedAppointment(userId, appointment.id, appointment.provider.name, appointment.type, appointment.scheduledTime);
                            missedCount++;
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Error checking appointments for user ${userId}:`, error);
                // Continue with next user
            }
        }
        console.log(`Missed appointment check complete. Found ${missedCount} missed appointments.`);
    }
    catch (error) {
        console.error('Error in missed appointment check handler:', error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2stbWlzc2VkLWFwcG9pbnRtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNoZWNrLW1pc3NlZC1hcHBvaW50bWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDRDQUE0QztBQUM1QyxvQkFBb0I7QUFDcEIseUVBQXlFOztBQWlKekUsMEJBaURDO0FBL0xELHFFQUFzRztBQUN0RyxtRUFBeUU7QUFDekUsdURBQXNEO0FBQ3RELHlFQUE4RTtBQUU5RSw4REFBdUU7QUFDdkUsMERBQW9EO0FBRXBELE1BQU0sY0FBYyxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQVU5Qzs7R0FFRztBQUNILEtBQUssVUFBVSwyQkFBMkI7SUFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUVsQyxJQUFJLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSw2QkFBVyxDQUFDO1lBQ3ZELFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixJQUFJLDZCQUE2QjtZQUMxRSxvQkFBb0IsRUFBRSxRQUFRO1NBQy9CLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakIsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzFCLE1BQU0sWUFBWSxHQUFHLElBQUEsMEJBQVUsRUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQWdCLENBQUMsQ0FBQztnQkFDN0MsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxv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QUFPLENBQUMsR0FBRyxDQUFDLDRDQUE0QyxXQUFXLHVCQUF1QixDQUFDLENBQUM7SUFDOUYsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25FLE1BQU0sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDaGVjayBNaXNzZWQgQXBwb2ludG1lbnRzIExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiA2LjRcbi8vIFRyaWdnZXJlZCBieSBFdmVudEJyaWRnZSBzY2hlZHVsZWQgcnVsZXMgdG8gZGV0ZWN0IG1pc3NlZCBhcHBvaW50bWVudHNcblxuaW1wb3J0IHsgRXZlbnRCcmlkZ2VFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgZ2V0VXBjb21pbmdBcHBvaW50bWVudHMsIHVwZGF0ZUFwcG9pbnRtZW50U3RhdHVzIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2FwcG9pbnRtZW50cyc7XG5pbXBvcnQgeyBnZXRDYXJlQ2lyY2xlTWVtYmVycyB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9jYXJlLWNpcmNsZSc7XG5pbXBvcnQgeyBnZXRVc2VyIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL3VzZXJzJztcbmltcG9ydCB7IHNlbmROb3RpZmljYXRpb25Ub0NhcmVDaXJjbGUgfSBmcm9tICcuLi9zaGFyZWQvbm90aWZpY2F0aW9uLXNlcnZpY2UnO1xuaW1wb3J0IHsgSGVhbHRoQWxlcnQgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIFNjYW5Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IHVubWFyc2hhbGwgfSBmcm9tICdAYXdzLXNkay91dGlsLWR5bmFtb2RiJztcblxuY29uc3QgZHluYW1vZGJDbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xuXG5pbnRlcmZhY2UgTWlzc2VkQXBwb2ludG1lbnRDaGVja0V2ZW50IHtcbiAgc291cmNlOiBzdHJpbmc7XG4gICdkZXRhaWwtdHlwZSc6IHN0cmluZztcbiAgZGV0YWlsPzoge1xuICAgIGNoZWNrVGltZT86IHN0cmluZzsgLy8gSVNPIHRpbWVzdGFtcCB0byBjaGVjayBmb3IgbWlzc2VkIGFwcG9pbnRtZW50c1xuICB9O1xufVxuXG4vKipcbiAqIEdldCBhbGwgdXNlcnMgd2hvIGhhdmUgYXBwb2ludG1lbnRzIHNjaGVkdWxlZFxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRBbGxVc2Vyc1dpdGhBcHBvaW50bWVudHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICBjb25zdCB1c2VySWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIFxuICB0cnkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGR5bmFtb2RiQ2xpZW50LnNlbmQobmV3IFNjYW5Db21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuQVBQT0lOVE1FTlRTX1RBQkxFIHx8ICdoZWFsdGhjYXJlLWFwcG9pbnRtZW50cy1kZXYnLFxuICAgICAgUHJvamVjdGlvbkV4cHJlc3Npb246ICd1c2VySWQnLFxuICAgIH0pKTtcblxuICAgIGlmIChyZXN1bHQuSXRlbXMpIHtcbiAgICAgIHJlc3VsdC5JdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICBjb25zdCB1bm1hcnNoYWxsZWQgPSB1bm1hcnNoYWxsKGl0ZW0pO1xuICAgICAgICBpZiAodW5tYXJzaGFsbGVkLnVzZXJJZCkge1xuICAgICAgICAgIHVzZXJJZHMuYWRkKHVubWFyc2hhbGxlZC51c2VySWQgYXMgc3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNjYW5uaW5nIGFwcG9pbnRtZW50cyB0YWJsZTonLCBlcnJvcik7XG4gIH1cblxuICByZXR1cm4gQXJyYXkuZnJvbSh1c2VySWRzKTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhcHBvaW50bWVudCBzaG91bGQgYmUgbWFya2VkIGFzIG1pc3NlZFxuICogQW4gYXBwb2ludG1lbnQgaXMgY29uc2lkZXJlZCBtaXNzZWQgaWY6XG4gKiAtIFN0YXR1cyBpcyAnc2NoZWR1bGVkJyBvciAnY29uZmlybWVkJ1xuICogLSBTY2hlZHVsZWQgdGltZSBoYXMgcGFzc2VkIGJ5IG1vcmUgdGhhbiB0aGUgYXBwb2ludG1lbnQgZHVyYXRpb24gKG9yIDMwIG1pbnV0ZXMgZGVmYXVsdClcbiAqL1xuZnVuY3Rpb24gaXNNaXNzZWRBcHBvaW50bWVudChzY2hlZHVsZWRUaW1lOiBEYXRlLCBkdXJhdGlvbjogbnVtYmVyIHwgdW5kZWZpbmVkLCBjaGVja1RpbWU6IERhdGUpOiBib29sZWFuIHtcbiAgY29uc3QgYXBwb2ludG1lbnREdXJhdGlvbiA9IGR1cmF0aW9uIHx8IDMwOyAvLyBEZWZhdWx0IDMwIG1pbnV0ZXNcbiAgY29uc3QgYXBwb2ludG1lbnRFbmRUaW1lID0gbmV3IERhdGUoc2NoZWR1bGVkVGltZS5nZXRUaW1lKCkgKyBhcHBvaW50bWVudER1cmF0aW9uICogNjAgKiAxMDAwKTtcbiAgXG4gIC8vIENvbnNpZGVyIG1pc3NlZCBpZiBjdXJyZW50IHRpbWUgaXMgcGFzdCB0aGUgYXBwb2ludG1lbnQgZW5kIHRpbWVcbiAgcmV0dXJuIGNoZWNrVGltZSA+IGFwcG9pbnRtZW50RW5kVGltZTtcbn1cblxuLyoqXG4gKiBNYXJrIGFwcG9pbnRtZW50IGFzIG1pc3NlZCBhbmQgbm90aWZ5IGNhcmUgY2lyY2xlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZU1pc3NlZEFwcG9pbnRtZW50KFxuICB1c2VySWQ6IHN0cmluZyxcbiAgYXBwb2ludG1lbnRJZDogc3RyaW5nLFxuICBwcm92aWRlck5hbWU6IHN0cmluZyxcbiAgYXBwb2ludG1lbnRUeXBlOiBzdHJpbmcsXG4gIHNjaGVkdWxlZFRpbWU6IERhdGVcbik6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIC8vIFVwZGF0ZSBhcHBvaW50bWVudCBzdGF0dXMgdG8gJ21pc3NlZCdcbiAgICBhd2FpdCB1cGRhdGVBcHBvaW50bWVudFN0YXR1cyh1c2VySWQsIGFwcG9pbnRtZW50SWQsICdtaXNzZWQnLCAnQXV0b21hdGljYWxseSBtYXJrZWQgYXMgbWlzc2VkJyk7XG4gICAgXG4gICAgY29uc29sZS5sb2coYEFwcG9pbnRtZW50ICR7YXBwb2ludG1lbnRJZH0gbWFya2VkIGFzIG1pc3NlZCBmb3IgdXNlciAke3VzZXJJZH1gKTtcblxuICAgIC8vIEdldCB1c2VyIGluZm9ybWF0aW9uXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXIodXNlcklkKTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VzZXIgbm90IGZvdW5kOicsIHVzZXJJZCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gTm90aWZ5IGNhcmUgY2lyY2xlIG1lbWJlcnMgKFJlcXVpcmVtZW50IDYuNClcbiAgICB0cnkge1xuICAgICAgY29uc3QgY2FyZUNpcmNsZU1lbWJlcnMgPSBhd2FpdCBnZXRDYXJlQ2lyY2xlTWVtYmVycyh1c2VySWQpO1xuICAgICAgaWYgKGNhcmVDaXJjbGVNZW1iZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgY2FyZUNpcmNsZVVzZXJJZHMgPSBjYXJlQ2lyY2xlTWVtYmVyc1xuICAgICAgICAgIC5maWx0ZXIobWVtYmVyID0+IG1lbWJlci5wZXJtaXNzaW9ucy5jYW5WaWV3QXBwb2ludG1lbnRzICYmIG1lbWJlci5wZXJtaXNzaW9ucy5jYW5SZWNlaXZlQWxlcnRzKVxuICAgICAgICAgIC5tYXAobWVtYmVyID0+IG1lbWJlci51c2VySWQpO1xuXG4gICAgICAgIGlmIChjYXJlQ2lyY2xlVXNlcklkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc3QgZGF0ZVN0ciA9IHNjaGVkdWxlZFRpbWUudG9Mb2NhbGVTdHJpbmcoJ2VuLVVTJywge1xuICAgICAgICAgICAgd2Vla2RheTogJ2xvbmcnLFxuICAgICAgICAgICAgeWVhcjogJ251bWVyaWMnLFxuICAgICAgICAgICAgbW9udGg6ICdsb25nJyxcbiAgICAgICAgICAgIGRheTogJ251bWVyaWMnLFxuICAgICAgICAgICAgaG91cjogJzItZGlnaXQnLFxuICAgICAgICAgICAgbWludXRlOiAnMi1kaWdpdCcsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjb25zdCBtZXNzYWdlID0gYCR7dXNlci5wcm9maWxlLmZpcnN0TmFtZX0gJHt1c2VyLnByb2ZpbGUubGFzdE5hbWV9IG1pc3NlZCBhICR7YXBwb2ludG1lbnRUeXBlfSBhcHBvaW50bWVudCB3aXRoICR7cHJvdmlkZXJOYW1lfS5cXG5TY2hlZHVsZWQgZm9yOiAke2RhdGVTdHJ9YDtcblxuICAgICAgICAgIC8vIENyZWF0ZSBhbGVydCBmb3IgbWlzc2VkIGFwcG9pbnRtZW50XG4gICAgICAgICAgY29uc3QgYWxlcnQ6IEhlYWx0aEFsZXJ0ID0ge1xuICAgICAgICAgICAgaWQ6IGBtaXNzZWQtYXBwdC0ke2FwcG9pbnRtZW50SWR9YCxcbiAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgIHR5cGU6ICdhcHBvaW50bWVudCcsXG4gICAgICAgICAgICBzZXZlcml0eTogJ21lZGl1bScsXG4gICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgYWNrbm93bGVkZ2VkOiBmYWxzZSxcbiAgICAgICAgICAgIGVzY2FsYXRlZDogZmFsc2UsXG4gICAgICAgICAgICByZWxhdGVkRGF0YToge1xuICAgICAgICAgICAgICBhcHBvaW50bWVudElkLFxuICAgICAgICAgICAgICBwcm92aWRlck5hbWUsXG4gICAgICAgICAgICAgIGFwcG9pbnRtZW50VHlwZSxcbiAgICAgICAgICAgICAgc2NoZWR1bGVkVGltZTogc2NoZWR1bGVkVGltZS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICBzdGF0dXM6ICdtaXNzZWQnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgYXdhaXQgc2VuZE5vdGlmaWNhdGlvblRvQ2FyZUNpcmNsZShcbiAgICAgICAgICAgIGNhcmVDaXJjbGVVc2VySWRzLFxuICAgICAgICAgICAgYWxlcnQsXG4gICAgICAgICAgICBbJ3B1c2gnLCAnc21zJywgJ2VtYWlsJ11cbiAgICAgICAgICApO1xuXG4gICAgICAgICAgY29uc29sZS5sb2coYE1pc3NlZCBhcHBvaW50bWVudCBub3RpZmljYXRpb24gc2VudCB0byAke2NhcmVDaXJjbGVVc2VySWRzLmxlbmd0aH0gY2FyZSBjaXJjbGUgbWVtYmVyc2ApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIG5vdGlmeWluZyBjYXJlIGNpcmNsZSBhYm91dCBtaXNzZWQgYXBwb2ludG1lbnQ6JywgZXJyb3IpO1xuICAgICAgLy8gRG9uJ3QgZmFpbCBpZiBjYXJlIGNpcmNsZSBub3RpZmljYXRpb24gZmFpbHNcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaGFuZGxpbmcgbWlzc2VkIGFwcG9pbnRtZW50OicsIGVycm9yKTtcbiAgfVxufVxuXG4vKipcbiAqIE1haW4gaGFuZGxlciBmb3IgbWlzc2VkIGFwcG9pbnRtZW50IGNoZWNrIGV2ZW50XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50OiBFdmVudEJyaWRnZUV2ZW50PHN0cmluZywgTWlzc2VkQXBwb2ludG1lbnRDaGVja0V2ZW50Pik6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKCdDaGVja2luZyBmb3IgbWlzc2VkIGFwcG9pbnRtZW50czonLCBKU09OLnN0cmluZ2lmeShldmVudCkpO1xuXG4gICAgY29uc3QgZGV0YWlsID0gZXZlbnQuZGV0YWlsIGFzIHsgY2hlY2tUaW1lPzogc3RyaW5nIH0gfCB1bmRlZmluZWQ7XG4gICAgY29uc3QgY2hlY2tUaW1lID0gKGRldGFpbCAmJiBkZXRhaWwuY2hlY2tUaW1lKSBcbiAgICAgID8gbmV3IERhdGUoZGV0YWlsLmNoZWNrVGltZSkgXG4gICAgICA6IG5ldyBEYXRlKCk7XG4gICAgY29uc29sZS5sb2coJ0NoZWNraW5nIGZvciBhcHBvaW50bWVudHMgbWlzc2VkIGFzIG9mOicsIGNoZWNrVGltZS50b0lTT1N0cmluZygpKTtcblxuICAgIC8vIEdldCBhbGwgdXNlcnMgd2l0aCBhcHBvaW50bWVudHNcbiAgICBjb25zdCB1c2VySWRzID0gYXdhaXQgZ2V0QWxsVXNlcnNXaXRoQXBwb2ludG1lbnRzKCk7XG4gICAgY29uc29sZS5sb2coYEZvdW5kICR7dXNlcklkcy5sZW5ndGh9IHVzZXJzIHdpdGggYXBwb2ludG1lbnRzYCk7XG5cbiAgICBsZXQgbWlzc2VkQ291bnQgPSAwO1xuXG4gICAgLy8gQ2hlY2sgZWFjaCB1c2VyJ3MgYXBwb2ludG1lbnRzXG4gICAgZm9yIChjb25zdCB1c2VySWQgb2YgdXNlcklkcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gR2V0IGFwcG9pbnRtZW50cyBmcm9tIDcgZGF5cyBhZ28gdG8gbm93ICh0byBjYXRjaCByZWNlbnRseSBtaXNzZWQgYXBwb2ludG1lbnRzKVxuICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZShjaGVja1RpbWUuZ2V0VGltZSgpIC0gNyAqIDI0ICogNjAgKiA2MCAqIDEwMDApO1xuICAgICAgICBjb25zdCBhcHBvaW50bWVudHMgPSBhd2FpdCBnZXRVcGNvbWluZ0FwcG9pbnRtZW50cyh1c2VySWQsIHN0YXJ0VGltZSwgY2hlY2tUaW1lKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3QgYXBwb2ludG1lbnQgb2YgYXBwb2ludG1lbnRzKSB7XG4gICAgICAgICAgLy8gT25seSBjaGVjayBzY2hlZHVsZWQgb3IgY29uZmlybWVkIGFwcG9pbnRtZW50c1xuICAgICAgICAgIGlmIChhcHBvaW50bWVudC5zdGF0dXMgPT09ICdzY2hlZHVsZWQnIHx8IGFwcG9pbnRtZW50LnN0YXR1cyA9PT0gJ2NvbmZpcm1lZCcpIHtcbiAgICAgICAgICAgIGlmIChpc01pc3NlZEFwcG9pbnRtZW50KGFwcG9pbnRtZW50LnNjaGVkdWxlZFRpbWUsIGFwcG9pbnRtZW50LmR1cmF0aW9uLCBjaGVja1RpbWUpKSB7XG4gICAgICAgICAgICAgIGF3YWl0IGhhbmRsZU1pc3NlZEFwcG9pbnRtZW50KFxuICAgICAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgICAgICBhcHBvaW50bWVudC5pZCxcbiAgICAgICAgICAgICAgICBhcHBvaW50bWVudC5wcm92aWRlci5uYW1lLFxuICAgICAgICAgICAgICAgIGFwcG9pbnRtZW50LnR5cGUsXG4gICAgICAgICAgICAgICAgYXBwb2ludG1lbnQuc2NoZWR1bGVkVGltZVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICBtaXNzZWRDb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2hlY2tpbmcgYXBwb2ludG1lbnRzIGZvciB1c2VyICR7dXNlcklkfTpgLCBlcnJvcik7XG4gICAgICAgIC8vIENvbnRpbnVlIHdpdGggbmV4dCB1c2VyXG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coYE1pc3NlZCBhcHBvaW50bWVudCBjaGVjayBjb21wbGV0ZS4gRm91bmQgJHttaXNzZWRDb3VudH0gbWlzc2VkIGFwcG9pbnRtZW50cy5gKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBtaXNzZWQgYXBwb2ludG1lbnQgY2hlY2sgaGFuZGxlcjonLCBlcnJvcik7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiJdfQ==