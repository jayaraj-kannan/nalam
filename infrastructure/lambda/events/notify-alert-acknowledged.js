"use strict";
// Notify Care Circle of Alert Acknowledgment Handler
// Requirements: 9.5
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const notification_service_1 = require("../shared/notification-service");
const alerts_1 = require("../shared/data-access/alerts");
const users_1 = require("../shared/data-access/users");
async function handler(event) {
    try {
        const detail = event.detail;
        console.log('Notifying care circle of alert acknowledgment:', {
            alertId: detail.alertId,
            acknowledgedBy: detail.acknowledgedBy,
        });
        // Get the alert details
        const alert = await (0, alerts_1.getAlert)(detail.alertId, new Date(detail.acknowledgedAt).toISOString());
        if (!alert) {
            console.error('Alert not found:', detail.alertId);
            return;
        }
        // Get the user who acknowledged the alert
        const acknowledger = await (0, users_1.getUser)(detail.acknowledgedBy);
        const acknowledgerName = acknowledger
            ? `${acknowledger.profile.firstName} ${acknowledger.profile.lastName}`
            : 'A care circle member';
        // Create notification message
        const notificationMessage = `${acknowledgerName} has acknowledged the ${alert.type.replace(/_/g, ' ')} alert for ${detail.userId}. The situation is being handled.`;
        // Send notification to other care circle members (excluding the acknowledger)
        const otherMembers = detail.careCircleMembers.filter(id => id !== detail.acknowledgedBy);
        if (otherMembers.length === 0) {
            console.log('No other care circle members to notify');
            return;
        }
        // Create a notification alert
        const notificationAlert = {
            ...alert,
            message: notificationMessage,
            severity: 'low', // Acknowledgment notifications are low priority
        };
        // Send notifications via push and email (not SMS for acknowledgments)
        await (0, notification_service_1.sendNotificationToCareCircle)(otherMembers, notificationAlert, ['push', 'email']);
        console.log('Care circle notified of alert acknowledgment');
    }
    catch (error) {
        console.error('Error notifying care circle of acknowledgment:', error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZ5LWFsZXJ0LWFja25vd2xlZGdlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5vdGlmeS1hbGVydC1hY2tub3dsZWRnZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFEQUFxRDtBQUNyRCxvQkFBb0I7O0FBZXBCLDBCQW9EQztBQWhFRCx5RUFBOEU7QUFDOUUseURBQXdEO0FBQ3hELHVEQUFzRDtBQVUvQyxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQXFFO0lBQ2pHLElBQUksQ0FBQztRQUNILE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFFNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnREFBZ0QsRUFBRTtZQUM1RCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87WUFDdkIsY0FBYyxFQUFFLE1BQU0sQ0FBQyxjQUFjO1NBQ3RDLENBQUMsQ0FBQztRQUVILHdCQUF3QjtRQUN4QixNQUFNLEtBQUssR0FBRyxNQUFNLElBQUEsaUJBQVEsRUFBQyxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQzVGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xELE9BQU87UUFDVCxDQUFDO1FBRUQsMENBQTBDO1FBQzFDLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBQSxlQUFPLEVBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzFELE1BQU0sZ0JBQWdCLEdBQUcsWUFBWTtZQUNuQyxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRTtZQUN0RSxDQUFDLENBQUMsc0JBQXNCLENBQUM7UUFFM0IsOEJBQThCO1FBQzlCLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxnQkFBZ0IseUJBQXlCLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsY0FBYyxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsQ0FBQztRQUVwSyw4RUFBOEU7UUFDOUUsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFekYsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQXdDLENBQUMsQ0FBQztZQUN0RCxPQUFPO1FBQ1QsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixNQUFNLGlCQUFpQixHQUFHO1lBQ3hCLEdBQUcsS0FBSztZQUNSLE9BQU8sRUFBRSxtQkFBbUI7WUFDNUIsUUFBUSxFQUFFLEtBQWMsRUFBRSxnREFBZ0Q7U0FDM0UsQ0FBQztRQUVGLHNFQUFzRTtRQUN0RSxNQUFNLElBQUEsbURBQTRCLEVBQ2hDLFlBQVksRUFDWixpQkFBaUIsRUFDakIsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQ2xCLENBQUM7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGdEQUFnRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBOb3RpZnkgQ2FyZSBDaXJjbGUgb2YgQWxlcnQgQWNrbm93bGVkZ21lbnQgSGFuZGxlclxuLy8gUmVxdWlyZW1lbnRzOiA5LjVcblxuaW1wb3J0IHsgRXZlbnRCcmlkZ2VFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgc2VuZE5vdGlmaWNhdGlvblRvQ2FyZUNpcmNsZSB9IGZyb20gJy4uL3NoYXJlZC9ub3RpZmljYXRpb24tc2VydmljZSc7XG5pbXBvcnQgeyBnZXRBbGVydCB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9hbGVydHMnO1xuaW1wb3J0IHsgZ2V0VXNlciB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy91c2Vycyc7XG5cbmludGVyZmFjZSBBbGVydEFja25vd2xlZGdlZERldGFpbCB7XG4gIGFsZXJ0SWQ6IHN0cmluZztcbiAgdXNlcklkOiBzdHJpbmc7XG4gIGFja25vd2xlZGdlZEJ5OiBzdHJpbmc7XG4gIGFja25vd2xlZGdlZEF0OiBzdHJpbmc7XG4gIGNhcmVDaXJjbGVNZW1iZXJzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEV2ZW50QnJpZGdlRXZlbnQ8J0FsZXJ0QWNrbm93bGVkZ2VkJywgQWxlcnRBY2tub3dsZWRnZWREZXRhaWw+KTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgZGV0YWlsID0gZXZlbnQuZGV0YWlsO1xuXG4gICAgY29uc29sZS5sb2coJ05vdGlmeWluZyBjYXJlIGNpcmNsZSBvZiBhbGVydCBhY2tub3dsZWRnbWVudDonLCB7XG4gICAgICBhbGVydElkOiBkZXRhaWwuYWxlcnRJZCxcbiAgICAgIGFja25vd2xlZGdlZEJ5OiBkZXRhaWwuYWNrbm93bGVkZ2VkQnksXG4gICAgfSk7XG5cbiAgICAvLyBHZXQgdGhlIGFsZXJ0IGRldGFpbHNcbiAgICBjb25zdCBhbGVydCA9IGF3YWl0IGdldEFsZXJ0KGRldGFpbC5hbGVydElkLCBuZXcgRGF0ZShkZXRhaWwuYWNrbm93bGVkZ2VkQXQpLnRvSVNPU3RyaW5nKCkpO1xuICAgIGlmICghYWxlcnQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0FsZXJ0IG5vdCBmb3VuZDonLCBkZXRhaWwuYWxlcnRJZCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gR2V0IHRoZSB1c2VyIHdobyBhY2tub3dsZWRnZWQgdGhlIGFsZXJ0XG4gICAgY29uc3QgYWNrbm93bGVkZ2VyID0gYXdhaXQgZ2V0VXNlcihkZXRhaWwuYWNrbm93bGVkZ2VkQnkpO1xuICAgIGNvbnN0IGFja25vd2xlZGdlck5hbWUgPSBhY2tub3dsZWRnZXIgXG4gICAgICA/IGAke2Fja25vd2xlZGdlci5wcm9maWxlLmZpcnN0TmFtZX0gJHthY2tub3dsZWRnZXIucHJvZmlsZS5sYXN0TmFtZX1gXG4gICAgICA6ICdBIGNhcmUgY2lyY2xlIG1lbWJlcic7XG5cbiAgICAvLyBDcmVhdGUgbm90aWZpY2F0aW9uIG1lc3NhZ2VcbiAgICBjb25zdCBub3RpZmljYXRpb25NZXNzYWdlID0gYCR7YWNrbm93bGVkZ2VyTmFtZX0gaGFzIGFja25vd2xlZGdlZCB0aGUgJHthbGVydC50eXBlLnJlcGxhY2UoL18vZywgJyAnKX0gYWxlcnQgZm9yICR7ZGV0YWlsLnVzZXJJZH0uIFRoZSBzaXR1YXRpb24gaXMgYmVpbmcgaGFuZGxlZC5gO1xuXG4gICAgLy8gU2VuZCBub3RpZmljYXRpb24gdG8gb3RoZXIgY2FyZSBjaXJjbGUgbWVtYmVycyAoZXhjbHVkaW5nIHRoZSBhY2tub3dsZWRnZXIpXG4gICAgY29uc3Qgb3RoZXJNZW1iZXJzID0gZGV0YWlsLmNhcmVDaXJjbGVNZW1iZXJzLmZpbHRlcihpZCA9PiBpZCAhPT0gZGV0YWlsLmFja25vd2xlZGdlZEJ5KTtcblxuICAgIGlmIChvdGhlck1lbWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBjb25zb2xlLmxvZygnTm8gb3RoZXIgY2FyZSBjaXJjbGUgbWVtYmVycyB0byBub3RpZnknKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBub3RpZmljYXRpb24gYWxlcnRcbiAgICBjb25zdCBub3RpZmljYXRpb25BbGVydCA9IHtcbiAgICAgIC4uLmFsZXJ0LFxuICAgICAgbWVzc2FnZTogbm90aWZpY2F0aW9uTWVzc2FnZSxcbiAgICAgIHNldmVyaXR5OiAnbG93JyBhcyBjb25zdCwgLy8gQWNrbm93bGVkZ21lbnQgbm90aWZpY2F0aW9ucyBhcmUgbG93IHByaW9yaXR5XG4gICAgfTtcblxuICAgIC8vIFNlbmQgbm90aWZpY2F0aW9ucyB2aWEgcHVzaCBhbmQgZW1haWwgKG5vdCBTTVMgZm9yIGFja25vd2xlZGdtZW50cylcbiAgICBhd2FpdCBzZW5kTm90aWZpY2F0aW9uVG9DYXJlQ2lyY2xlKFxuICAgICAgb3RoZXJNZW1iZXJzLFxuICAgICAgbm90aWZpY2F0aW9uQWxlcnQsXG4gICAgICBbJ3B1c2gnLCAnZW1haWwnXVxuICAgICk7XG5cbiAgICBjb25zb2xlLmxvZygnQ2FyZSBjaXJjbGUgbm90aWZpZWQgb2YgYWxlcnQgYWNrbm93bGVkZ21lbnQnKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBub3RpZnlpbmcgY2FyZSBjaXJjbGUgb2YgYWNrbm93bGVkZ21lbnQ6JywgZXJyb3IpO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG4iXX0=