"use strict";
// Send Medication Reminders Lambda Function
// Requirements: 2.1
// Triggered by EventBridge scheduled rules to send medication reminders
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const medications_1 = require("../shared/data-access/medications");
const users_1 = require("../shared/data-access/users");
const notification_service_1 = require("../shared/notification-service");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const dynamodbClient = new client_dynamodb_1.DynamoDBClient({});
/**
 * Get all users who have medications scheduled
 */
async function getAllUsersWithMedications() {
    const userIds = new Set();
    try {
        const result = await dynamodbClient.send(new client_dynamodb_1.ScanCommand({
            TableName: process.env.MEDICATIONS_TABLE || 'healthcare-medications-dev',
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
        console.error('Error scanning medications table:', error);
    }
    return Array.from(userIds);
}
/**
 * Check if medication reminder should be sent
 * Send reminder at scheduled time (within 5 minute window)
 */
function shouldSendReminder(scheduledTime, checkTime) {
    const timeDiff = scheduledTime.getTime() - checkTime.getTime();
    // Send reminder if scheduled time is within next 5 minutes
    return timeDiff >= 0 && timeDiff <= 5 * 60 * 1000;
}
/**
 * Send medication reminder to user
 */
async function sendMedicationReminder(userId, medicationName, dosage, scheduledTime) {
    try {
        const user = await (0, users_1.getUser)(userId);
        if (!user) {
            console.error('User not found:', userId);
            return;
        }
        // Create alert for medication reminder
        const alert = {
            id: `med-reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
            type: 'medication',
            severity: 'medium',
            message: `Time to take your medication: ${medicationName} (${dosage})`,
            timestamp: new Date(),
            acknowledged: false,
            escalated: false,
            relatedData: {
                medicationName,
                dosage,
                scheduledTime: scheduledTime.toISOString(),
            },
        };
        // Get user's preferred notification channels
        const channels = ('preferences' in user && user.preferences?.notificationChannels)
            ? user.preferences.notificationChannels
            : ['push', 'sms'];
        // Send notification via multiple channels
        await (0, notification_service_1.sendNotification)({
            recipient: userId,
            alert,
            channels,
            priority: 'normal',
        });
        console.log(`Medication reminder sent to user ${userId} for ${medicationName}`);
    }
    catch (error) {
        console.error('Error sending medication reminder:', error);
    }
}
/**
 * Main handler for medication reminder event
 */
async function handler(event) {
    try {
        console.log('Processing medication reminders:', JSON.stringify(event));
        const detail = event.detail;
        const checkTime = (detail && detail.checkTime)
            ? new Date(detail.checkTime)
            : new Date();
        console.log('Checking for medications scheduled around:', checkTime.toISOString());
        // Get all users with medications
        const userIds = await getAllUsersWithMedications();
        console.log(`Found ${userIds.length} users with medications`);
        // Check each user's medications
        for (const userId of userIds) {
            try {
                const medications = await (0, medications_1.getMedicationsByUser)(userId);
                for (const medRecord of medications) {
                    // Only send reminders for scheduled medications
                    if (medRecord.status === 'scheduled') {
                        if (shouldSendReminder(medRecord.scheduledTime, checkTime)) {
                            await sendMedicationReminder(userId, medRecord.medication.name, medRecord.medication.dosage, medRecord.scheduledTime);
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Error processing medications for user ${userId}:`, error);
                // Continue with next user
            }
        }
        console.log('Medication reminders processing complete');
    }
    catch (error) {
        console.error('Error in medication reminder handler:', error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZC1tZWRpY2F0aW9uLXJlbWluZGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNlbmQtbWVkaWNhdGlvbi1yZW1pbmRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDRDQUE0QztBQUM1QyxvQkFBb0I7QUFDcEIsd0VBQXdFOztBQWdIeEUsMEJBMkNDO0FBeEpELG1FQUF5RTtBQUN6RSx1REFBc0Q7QUFDdEQseUVBQWtFO0FBRWxFLDhEQUF1RTtBQUN2RSwwREFBb0Q7QUFFcEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBVTlDOztHQUVHO0FBQ0gsS0FBSyxVQUFVLDBCQUEwQjtJQUN2QyxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBRWxDLElBQUksQ0FBQztRQUNILE1BQU0sTUFBTSxHQUFHLE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLDZCQUFXLENBQUM7WUFDdkQsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLElBQUksNEJBQTRCO1lBQ3hFLG9CQUFvQixFQUFFLFFBQVE7U0FDL0IsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNqQixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDMUIsTUFBTSxZQUFZLEdBQUcsSUFBQSwwQkFBVSxFQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QyxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBZ0IsQ0FBQyxDQUFDO2dCQUM3QyxDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEtB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QUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gU2VuZCBNZWRpY2F0aW9uIFJlbWluZGVycyBMYW1iZGEgRnVuY3Rpb25cbi8vIFJlcXVpcmVtZW50czogMi4xXG4vLyBUcmlnZ2VyZWQgYnkgRXZlbnRCcmlkZ2Ugc2NoZWR1bGVkIHJ1bGVzIHRvIHNlbmQgbWVkaWNhdGlvbiByZW1pbmRlcnNcblxuaW1wb3J0IHsgRXZlbnRCcmlkZ2VFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgZ2V0TWVkaWNhdGlvbnNCeVVzZXIgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvbWVkaWNhdGlvbnMnO1xuaW1wb3J0IHsgZ2V0VXNlciB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy91c2Vycyc7XG5pbXBvcnQgeyBzZW5kTm90aWZpY2F0aW9uIH0gZnJvbSAnLi4vc2hhcmVkL25vdGlmaWNhdGlvbi1zZXJ2aWNlJztcbmltcG9ydCB7IEhlYWx0aEFsZXJ0LCBOb3RpZmljYXRpb25DaGFubmVsIH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50LCBTY2FuQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyB1bm1hcnNoYWxsIH0gZnJvbSAnQGF3cy1zZGsvdXRpbC1keW5hbW9kYic7XG5cbmNvbnN0IGR5bmFtb2RiQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcblxuaW50ZXJmYWNlIE1lZGljYXRpb25SZW1pbmRlckV2ZW50IHtcbiAgc291cmNlOiBzdHJpbmc7XG4gICdkZXRhaWwtdHlwZSc6IHN0cmluZztcbiAgZGV0YWlsPzoge1xuICAgIGNoZWNrVGltZT86IHN0cmluZzsgLy8gSVNPIHRpbWVzdGFtcCB0byBjaGVjayBmb3IgdXBjb21pbmcgbWVkaWNhdGlvbnNcbiAgfTtcbn1cblxuLyoqXG4gKiBHZXQgYWxsIHVzZXJzIHdobyBoYXZlIG1lZGljYXRpb25zIHNjaGVkdWxlZFxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRBbGxVc2Vyc1dpdGhNZWRpY2F0aW9ucygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gIGNvbnN0IHVzZXJJZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vZGJDbGllbnQuc2VuZChuZXcgU2NhbkNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5NRURJQ0FUSU9OU19UQUJMRSB8fCAnaGVhbHRoY2FyZS1tZWRpY2F0aW9ucy1kZXYnLFxuICAgICAgUHJvamVjdGlvbkV4cHJlc3Npb246ICd1c2VySWQnLFxuICAgIH0pKTtcblxuICAgIGlmIChyZXN1bHQuSXRlbXMpIHtcbiAgICAgIHJlc3VsdC5JdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICBjb25zdCB1bm1hcnNoYWxsZWQgPSB1bm1hcnNoYWxsKGl0ZW0pO1xuICAgICAgICBpZiAodW5tYXJzaGFsbGVkLnVzZXJJZCkge1xuICAgICAgICAgIHVzZXJJZHMuYWRkKHVubWFyc2hhbGxlZC51c2VySWQgYXMgc3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNjYW5uaW5nIG1lZGljYXRpb25zIHRhYmxlOicsIGVycm9yKTtcbiAgfVxuXG4gIHJldHVybiBBcnJheS5mcm9tKHVzZXJJZHMpO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIG1lZGljYXRpb24gcmVtaW5kZXIgc2hvdWxkIGJlIHNlbnRcbiAqIFNlbmQgcmVtaW5kZXIgYXQgc2NoZWR1bGVkIHRpbWUgKHdpdGhpbiA1IG1pbnV0ZSB3aW5kb3cpXG4gKi9cbmZ1bmN0aW9uIHNob3VsZFNlbmRSZW1pbmRlcihzY2hlZHVsZWRUaW1lOiBEYXRlLCBjaGVja1RpbWU6IERhdGUpOiBib29sZWFuIHtcbiAgY29uc3QgdGltZURpZmYgPSBzY2hlZHVsZWRUaW1lLmdldFRpbWUoKSAtIGNoZWNrVGltZS5nZXRUaW1lKCk7XG4gIC8vIFNlbmQgcmVtaW5kZXIgaWYgc2NoZWR1bGVkIHRpbWUgaXMgd2l0aGluIG5leHQgNSBtaW51dGVzXG4gIHJldHVybiB0aW1lRGlmZiA+PSAwICYmIHRpbWVEaWZmIDw9IDUgKiA2MCAqIDEwMDA7XG59XG5cbi8qKlxuICogU2VuZCBtZWRpY2F0aW9uIHJlbWluZGVyIHRvIHVzZXJcbiAqL1xuYXN5bmMgZnVuY3Rpb24gc2VuZE1lZGljYXRpb25SZW1pbmRlcihcbiAgdXNlcklkOiBzdHJpbmcsXG4gIG1lZGljYXRpb25OYW1lOiBzdHJpbmcsXG4gIGRvc2FnZTogc3RyaW5nLFxuICBzY2hlZHVsZWRUaW1lOiBEYXRlXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZ2V0VXNlcih1c2VySWQpO1xuICAgIGlmICghdXNlcikge1xuICAgICAgY29uc29sZS5lcnJvcignVXNlciBub3QgZm91bmQ6JywgdXNlcklkKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYWxlcnQgZm9yIG1lZGljYXRpb24gcmVtaW5kZXJcbiAgICBjb25zdCBhbGVydDogSGVhbHRoQWxlcnQgPSB7XG4gICAgICBpZDogYG1lZC1yZW1pbmRlci0ke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpfWAsXG4gICAgICB1c2VySWQsXG4gICAgICB0eXBlOiAnbWVkaWNhdGlvbicsXG4gICAgICBzZXZlcml0eTogJ21lZGl1bScsXG4gICAgICBtZXNzYWdlOiBgVGltZSB0byB0YWtlIHlvdXIgbWVkaWNhdGlvbjogJHttZWRpY2F0aW9uTmFtZX0gKCR7ZG9zYWdlfSlgLFxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxuICAgICAgYWNrbm93bGVkZ2VkOiBmYWxzZSxcbiAgICAgIGVzY2FsYXRlZDogZmFsc2UsXG4gICAgICByZWxhdGVkRGF0YToge1xuICAgICAgICBtZWRpY2F0aW9uTmFtZSxcbiAgICAgICAgZG9zYWdlLFxuICAgICAgICBzY2hlZHVsZWRUaW1lOiBzY2hlZHVsZWRUaW1lLnRvSVNPU3RyaW5nKCksXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyBHZXQgdXNlcidzIHByZWZlcnJlZCBub3RpZmljYXRpb24gY2hhbm5lbHNcbiAgICBjb25zdCBjaGFubmVsczogTm90aWZpY2F0aW9uQ2hhbm5lbFtdID0gKCdwcmVmZXJlbmNlcycgaW4gdXNlciAmJiB1c2VyLnByZWZlcmVuY2VzPy5ub3RpZmljYXRpb25DaGFubmVscykgXG4gICAgICA/IHVzZXIucHJlZmVyZW5jZXMubm90aWZpY2F0aW9uQ2hhbm5lbHMgXG4gICAgICA6IFsncHVzaCcsICdzbXMnXTtcblxuICAgIC8vIFNlbmQgbm90aWZpY2F0aW9uIHZpYSBtdWx0aXBsZSBjaGFubmVsc1xuICAgIGF3YWl0IHNlbmROb3RpZmljYXRpb24oe1xuICAgICAgcmVjaXBpZW50OiB1c2VySWQsXG4gICAgICBhbGVydCxcbiAgICAgIGNoYW5uZWxzLFxuICAgICAgcHJpb3JpdHk6ICdub3JtYWwnLFxuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2coYE1lZGljYXRpb24gcmVtaW5kZXIgc2VudCB0byB1c2VyICR7dXNlcklkfSBmb3IgJHttZWRpY2F0aW9uTmFtZX1gKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzZW5kaW5nIG1lZGljYXRpb24gcmVtaW5kZXI6JywgZXJyb3IpO1xuICB9XG59XG5cbi8qKlxuICogTWFpbiBoYW5kbGVyIGZvciBtZWRpY2F0aW9uIHJlbWluZGVyIGV2ZW50XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50OiBFdmVudEJyaWRnZUV2ZW50PHN0cmluZywgTWVkaWNhdGlvblJlbWluZGVyRXZlbnQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coJ1Byb2Nlc3NpbmcgbWVkaWNhdGlvbiByZW1pbmRlcnM6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQpKTtcblxuICAgIGNvbnN0IGRldGFpbCA9IGV2ZW50LmRldGFpbCBhcyB7IGNoZWNrVGltZT86IHN0cmluZyB9IHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IGNoZWNrVGltZSA9IChkZXRhaWwgJiYgZGV0YWlsLmNoZWNrVGltZSkgXG4gICAgICA/IG5ldyBEYXRlKGRldGFpbC5jaGVja1RpbWUpIFxuICAgICAgOiBuZXcgRGF0ZSgpO1xuICAgIGNvbnNvbGUubG9nKCdDaGVja2luZyBmb3IgbWVkaWNhdGlvbnMgc2NoZWR1bGVkIGFyb3VuZDonLCBjaGVja1RpbWUudG9JU09TdHJpbmcoKSk7XG5cbiAgICAvLyBHZXQgYWxsIHVzZXJzIHdpdGggbWVkaWNhdGlvbnNcbiAgICBjb25zdCB1c2VySWRzID0gYXdhaXQgZ2V0QWxsVXNlcnNXaXRoTWVkaWNhdGlvbnMoKTtcbiAgICBjb25zb2xlLmxvZyhgRm91bmQgJHt1c2VySWRzLmxlbmd0aH0gdXNlcnMgd2l0aCBtZWRpY2F0aW9uc2ApO1xuXG4gICAgLy8gQ2hlY2sgZWFjaCB1c2VyJ3MgbWVkaWNhdGlvbnNcbiAgICBmb3IgKGNvbnN0IHVzZXJJZCBvZiB1c2VySWRzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBtZWRpY2F0aW9ucyA9IGF3YWl0IGdldE1lZGljYXRpb25zQnlVc2VyKHVzZXJJZCk7XG4gICAgICAgIFxuICAgICAgICBmb3IgKGNvbnN0IG1lZFJlY29yZCBvZiBtZWRpY2F0aW9ucykge1xuICAgICAgICAgIC8vIE9ubHkgc2VuZCByZW1pbmRlcnMgZm9yIHNjaGVkdWxlZCBtZWRpY2F0aW9uc1xuICAgICAgICAgIGlmIChtZWRSZWNvcmQuc3RhdHVzID09PSAnc2NoZWR1bGVkJykge1xuICAgICAgICAgICAgaWYgKHNob3VsZFNlbmRSZW1pbmRlcihtZWRSZWNvcmQuc2NoZWR1bGVkVGltZSwgY2hlY2tUaW1lKSkge1xuICAgICAgICAgICAgICBhd2FpdCBzZW5kTWVkaWNhdGlvblJlbWluZGVyKFxuICAgICAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgICAgICBtZWRSZWNvcmQubWVkaWNhdGlvbi5uYW1lLFxuICAgICAgICAgICAgICAgIG1lZFJlY29yZC5tZWRpY2F0aW9uLmRvc2FnZSxcbiAgICAgICAgICAgICAgICBtZWRSZWNvcmQuc2NoZWR1bGVkVGltZVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcHJvY2Vzc2luZyBtZWRpY2F0aW9ucyBmb3IgdXNlciAke3VzZXJJZH06YCwgZXJyb3IpO1xuICAgICAgICAvLyBDb250aW51ZSB3aXRoIG5leHQgdXNlclxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKCdNZWRpY2F0aW9uIHJlbWluZGVycyBwcm9jZXNzaW5nIGNvbXBsZXRlJyk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gbWVkaWNhdGlvbiByZW1pbmRlciBoYW5kbGVyOicsIGVycm9yKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuIl19