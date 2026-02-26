"use strict";
// Send Alert Notifications Handler
// Requirements: 9.1, 9.2, 9.4
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const notification_service_1 = require("../shared/notification-service");
const care_circle_1 = require("../shared/data-access/care-circle");
const users_1 = require("../shared/data-access/users");
async function handler(event) {
    try {
        const { alert, userId } = event.detail;
        console.log('Sending alert notifications:', {
            alertId: alert.id,
            userId,
            type: alert.type,
            severity: alert.severity,
        });
        // Get care circle members
        const careCircleMembers = await (0, care_circle_1.getCareCircleMembers)(userId);
        // Filter members who can receive alerts
        const eligibleMembers = careCircleMembers.filter(m => m.permissions.canReceiveAlerts);
        if (eligibleMembers.length === 0) {
            console.log('No care circle members eligible to receive alerts');
            return;
        }
        // Get notification preferences for each member
        const memberIds = eligibleMembers.map(m => m.secondaryUserId);
        const members = await Promise.all(memberIds.map(id => (0, users_1.getUser)(id)));
        // Determine channels based on alert severity and user preferences
        const channels = [];
        // For critical and high severity alerts, use all channels
        if (alert.severity === 'critical' || alert.severity === 'high') {
            channels.push('push', 'sms', 'email');
        }
        else if (alert.severity === 'medium') {
            channels.push('push', 'email');
        }
        else {
            channels.push('push');
        }
        // Apply user preferences if available
        const finalChannels = members.map((member, index) => {
            if (!member)
                return channels;
            const preferences = 'alertPreferences' in member ? member.alertPreferences : null;
            if (!preferences)
                return channels;
            // Check if user has preferences for this alert type
            const alertTypePrefs = preferences.alertTypes?.[alert.type];
            if (alertTypePrefs && !alertTypePrefs.enabled) {
                return []; // User disabled this alert type
            }
            // Check if user wants this severity level
            if (alertTypePrefs?.urgencyLevels && !alertTypePrefs.urgencyLevels.includes(alert.severity)) {
                return []; // User doesn't want this severity level
            }
            // Use user's preferred channels if specified
            if (preferences.channels && preferences.channels.length > 0) {
                return preferences.channels.filter(c => channels.includes(c));
            }
            return channels;
        });
        // Send notifications to care circle members
        const results = await (0, notification_service_1.sendNotificationToCareCircle)(memberIds, alert, channels);
        // Log results
        const successCount = results.filter(r => r.status === 'sent' || r.status === 'delivered').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        console.log('Notification results:', {
            total: results.length,
            successful: successCount,
            failed: failedCount,
        });
        if (failedCount > 0) {
            console.warn('Some notifications failed:', results.filter(r => r.status === 'failed'));
        }
    }
    catch (error) {
        console.error('Error sending alert notifications:', error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZC1hbGVydC1ub3RpZmljYXRpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VuZC1hbGVydC1ub3RpZmljYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQ0FBbUM7QUFDbkMsOEJBQThCOztBQWE5QiwwQkF3RkM7QUFqR0QseUVBQThFO0FBQzlFLG1FQUF5RTtBQUN6RSx1REFBc0Q7QUFPL0MsS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUF5RDtJQUNyRixJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFFdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsRUFBRTtZQUMxQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUU7WUFDakIsTUFBTTtZQUNOLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7U0FDekIsQ0FBQyxDQUFDO1FBRUgsMEJBQTBCO1FBQzFCLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxJQUFBLGtDQUFvQixFQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTdELHdDQUF3QztRQUN4QyxNQUFNLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFdEYsSUFBSSxlQUFlLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbURBQW1ELENBQUMsQ0FBQztZQUNqRSxPQUFPO1FBQ1QsQ0FBQztRQUVELCtDQUErQztRQUMvQyxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzlELE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxD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QUFFLENBQUM7WUFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLENBQUM7SUFDSCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0NBQW9DLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0QsTUFBTSxLQUFLLENBQUM7SUFDZCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFNlbmQgQWxlcnQgTm90aWZpY2F0aW9ucyBIYW5kbGVyXG4vLyBSZXF1aXJlbWVudHM6IDkuMSwgOS4yLCA5LjRcblxuaW1wb3J0IHsgRXZlbnRCcmlkZ2VFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgSGVhbHRoQWxlcnQsIE5vdGlmaWNhdGlvbkNoYW5uZWwgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgc2VuZE5vdGlmaWNhdGlvblRvQ2FyZUNpcmNsZSB9IGZyb20gJy4uL3NoYXJlZC9ub3RpZmljYXRpb24tc2VydmljZSc7XG5pbXBvcnQgeyBnZXRDYXJlQ2lyY2xlTWVtYmVycyB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9jYXJlLWNpcmNsZSc7XG5pbXBvcnQgeyBnZXRVc2VyIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL3VzZXJzJztcblxuaW50ZXJmYWNlIEFsZXJ0RXZlbnREZXRhaWwge1xuICBhbGVydDogSGVhbHRoQWxlcnQ7XG4gIHVzZXJJZDogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihldmVudDogRXZlbnRCcmlkZ2VFdmVudDwnQWxlcnRDcmVhdGVkJywgQWxlcnRFdmVudERldGFpbD4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGFsZXJ0LCB1c2VySWQgfSA9IGV2ZW50LmRldGFpbDtcblxuICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIGFsZXJ0IG5vdGlmaWNhdGlvbnM6Jywge1xuICAgICAgYWxlcnRJZDogYWxlcnQuaWQsXG4gICAgICB1c2VySWQsXG4gICAgICB0eXBlOiBhbGVydC50eXBlLFxuICAgICAgc2V2ZXJpdHk6IGFsZXJ0LnNldmVyaXR5LFxuICAgIH0pO1xuXG4gICAgLy8gR2V0IGNhcmUgY2lyY2xlIG1lbWJlcnNcbiAgICBjb25zdCBjYXJlQ2lyY2xlTWVtYmVycyA9IGF3YWl0IGdldENhcmVDaXJjbGVNZW1iZXJzKHVzZXJJZCk7XG4gICAgXG4gICAgLy8gRmlsdGVyIG1lbWJlcnMgd2hvIGNhbiByZWNlaXZlIGFsZXJ0c1xuICAgIGNvbnN0IGVsaWdpYmxlTWVtYmVycyA9IGNhcmVDaXJjbGVNZW1iZXJzLmZpbHRlcihtID0+IG0ucGVybWlzc2lvbnMuY2FuUmVjZWl2ZUFsZXJ0cyk7XG5cbiAgICBpZiAoZWxpZ2libGVNZW1iZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc29sZS5sb2coJ05vIGNhcmUgY2lyY2xlIG1lbWJlcnMgZWxpZ2libGUgdG8gcmVjZWl2ZSBhbGVydHMnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBHZXQgbm90aWZpY2F0aW9uIHByZWZlcmVuY2VzIGZvciBlYWNoIG1lbWJlclxuICAgIGNvbnN0IG1lbWJlcklkcyA9IGVsaWdpYmxlTWVtYmVycy5tYXAobSA9PiBtLnNlY29uZGFyeVVzZXJJZCk7XG4gICAgY29uc3QgbWVtYmVycyA9IGF3YWl0IFByb21pc2UuYWxsKG1lbWJlcklkcy5tYXAoaWQgPT4gZ2V0VXNlcihpZCkpKTtcblxuICAgIC8vIERldGVybWluZSBjaGFubmVscyBiYXNlZCBvbiBhbGVydCBzZXZlcml0eSBhbmQgdXNlciBwcmVmZXJlbmNlc1xuICAgIGNvbnN0IGNoYW5uZWxzOiBOb3RpZmljYXRpb25DaGFubmVsW10gPSBbXTtcbiAgICBcbiAgICAvLyBGb3IgY3JpdGljYWwgYW5kIGhpZ2ggc2V2ZXJpdHkgYWxlcnRzLCB1c2UgYWxsIGNoYW5uZWxzXG4gICAgaWYgKGFsZXJ0LnNldmVyaXR5ID09PSAnY3JpdGljYWwnIHx8IGFsZXJ0LnNldmVyaXR5ID09PSAnaGlnaCcpIHtcbiAgICAgIGNoYW5uZWxzLnB1c2goJ3B1c2gnLCAnc21zJywgJ2VtYWlsJyk7XG4gICAgfSBlbHNlIGlmIChhbGVydC5zZXZlcml0eSA9PT0gJ21lZGl1bScpIHtcbiAgICAgIGNoYW5uZWxzLnB1c2goJ3B1c2gnLCAnZW1haWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hhbm5lbHMucHVzaCgncHVzaCcpO1xuICAgIH1cblxuICAgIC8vIEFwcGx5IHVzZXIgcHJlZmVyZW5jZXMgaWYgYXZhaWxhYmxlXG4gICAgY29uc3QgZmluYWxDaGFubmVscyA9IG1lbWJlcnMubWFwKChtZW1iZXIsIGluZGV4KSA9PiB7XG4gICAgICBpZiAoIW1lbWJlcikgcmV0dXJuIGNoYW5uZWxzO1xuICAgICAgXG4gICAgICBjb25zdCBwcmVmZXJlbmNlcyA9ICdhbGVydFByZWZlcmVuY2VzJyBpbiBtZW1iZXIgPyBtZW1iZXIuYWxlcnRQcmVmZXJlbmNlcyA6IG51bGw7XG4gICAgICBpZiAoIXByZWZlcmVuY2VzKSByZXR1cm4gY2hhbm5lbHM7XG5cbiAgICAgIC8vIENoZWNrIGlmIHVzZXIgaGFzIHByZWZlcmVuY2VzIGZvciB0aGlzIGFsZXJ0IHR5cGVcbiAgICAgIGNvbnN0IGFsZXJ0VHlwZVByZWZzID0gcHJlZmVyZW5jZXMuYWxlcnRUeXBlcz8uW2FsZXJ0LnR5cGVdO1xuICAgICAgaWYgKGFsZXJ0VHlwZVByZWZzICYmICFhbGVydFR5cGVQcmVmcy5lbmFibGVkKSB7XG4gICAgICAgIHJldHVybiBbXTsgLy8gVXNlciBkaXNhYmxlZCB0aGlzIGFsZXJ0IHR5cGVcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgaWYgdXNlciB3YW50cyB0aGlzIHNldmVyaXR5IGxldmVsXG4gICAgICBpZiAoYWxlcnRUeXBlUHJlZnM/LnVyZ2VuY3lMZXZlbHMgJiYgIWFsZXJ0VHlwZVByZWZzLnVyZ2VuY3lMZXZlbHMuaW5jbHVkZXMoYWxlcnQuc2V2ZXJpdHkpKSB7XG4gICAgICAgIHJldHVybiBbXTsgLy8gVXNlciBkb2Vzbid0IHdhbnQgdGhpcyBzZXZlcml0eSBsZXZlbFxuICAgICAgfVxuXG4gICAgICAvLyBVc2UgdXNlcidzIHByZWZlcnJlZCBjaGFubmVscyBpZiBzcGVjaWZpZWRcbiAgICAgIGlmIChwcmVmZXJlbmNlcy5jaGFubmVscyAmJiBwcmVmZXJlbmNlcy5jaGFubmVscy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBwcmVmZXJlbmNlcy5jaGFubmVscy5maWx0ZXIoYyA9PiBjaGFubmVscy5pbmNsdWRlcyhjKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjaGFubmVscztcbiAgICB9KTtcblxuICAgIC8vIFNlbmQgbm90aWZpY2F0aW9ucyB0byBjYXJlIGNpcmNsZSBtZW1iZXJzXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHNlbmROb3RpZmljYXRpb25Ub0NhcmVDaXJjbGUoXG4gICAgICBtZW1iZXJJZHMsXG4gICAgICBhbGVydCxcbiAgICAgIGNoYW5uZWxzXG4gICAgKTtcblxuICAgIC8vIExvZyByZXN1bHRzXG4gICAgY29uc3Qgc3VjY2Vzc0NvdW50ID0gcmVzdWx0cy5maWx0ZXIociA9PiByLnN0YXR1cyA9PT0gJ3NlbnQnIHx8IHIuc3RhdHVzID09PSAnZGVsaXZlcmVkJykubGVuZ3RoO1xuICAgIGNvbnN0IGZhaWxlZENvdW50ID0gcmVzdWx0cy5maWx0ZXIociA9PiByLnN0YXR1cyA9PT0gJ2ZhaWxlZCcpLmxlbmd0aDtcblxuICAgIGNvbnNvbGUubG9nKCdOb3RpZmljYXRpb24gcmVzdWx0czonLCB7XG4gICAgICB0b3RhbDogcmVzdWx0cy5sZW5ndGgsXG4gICAgICBzdWNjZXNzZnVsOiBzdWNjZXNzQ291bnQsXG4gICAgICBmYWlsZWQ6IGZhaWxlZENvdW50LFxuICAgIH0pO1xuXG4gICAgaWYgKGZhaWxlZENvdW50ID4gMCkge1xuICAgICAgY29uc29sZS53YXJuKCdTb21lIG5vdGlmaWNhdGlvbnMgZmFpbGVkOicsIHJlc3VsdHMuZmlsdGVyKHIgPT4gci5zdGF0dXMgPT09ICdmYWlsZWQnKSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNlbmRpbmcgYWxlcnQgbm90aWZpY2F0aW9uczonLCBlcnJvcik7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiJdfQ==