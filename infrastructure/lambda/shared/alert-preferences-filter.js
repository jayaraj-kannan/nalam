"use strict";
// Alert Preferences Filter
// Requirements: 9.2
// Filters alerts and notifications based on user preferences
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldSendAlert = shouldSendAlert;
exports.getNotificationChannels = getNotificationChannels;
exports.filterCareCircleByPreferences = filterCareCircleByPreferences;
const users_1 = require("./data-access/users");
/**
 * Check if current time is within quiet hours
 */
function isWithinQuietHours(quietHours) {
    if (!quietHours)
        return false;
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const { start, end } = quietHours;
    // Handle quiet hours that span midnight
    if (start > end) {
        return currentTime >= start || currentTime <= end;
    }
    return currentTime >= start && currentTime <= end;
}
/**
 * Check if alert should be sent based on user preferences
 */
async function shouldSendAlert(userId, alert) {
    try {
        const user = await (0, users_1.getUser)(userId);
        if (!user)
            return true; // Default to sending if user not found
        const preferences = user.alertPreferences;
        if (!preferences)
            return true; // Default to sending if no preferences set
        // Check if alert type is enabled
        const alertTypeConfig = preferences.alertTypes?.[alert.type];
        if (alertTypeConfig && !alertTypeConfig.enabled) {
            return false;
        }
        // Check if alert severity matches user's urgency level preferences
        if (alertTypeConfig && alertTypeConfig.urgencyLevels) {
            if (!alertTypeConfig.urgencyLevels.includes(alert.severity)) {
                return false;
            }
        }
        // Critical alerts always bypass quiet hours
        if (alert.severity === 'critical') {
            return true;
        }
        // Check quiet hours for non-critical alerts
        if (isWithinQuietHours(preferences.quietHours)) {
            return false;
        }
        return true;
    }
    catch (error) {
        console.error('Error checking alert preferences:', error);
        return true; // Default to sending on error
    }
}
/**
 * Get notification channels for a user based on their preferences
 */
async function getNotificationChannels(userId, alert) {
    try {
        const user = await (0, users_1.getUser)(userId);
        if (!user)
            return ['push', 'sms', 'email']; // Default channels
        const preferences = user.alertPreferences;
        if (!preferences || !preferences.channels) {
            return ['push', 'sms', 'email']; // Default channels
        }
        // Critical alerts use all available channels
        if (alert.severity === 'critical') {
            return ['push', 'sms', 'email'];
        }
        return preferences.channels;
    }
    catch (error) {
        console.error('Error getting notification channels:', error);
        return ['push', 'sms', 'email']; // Default channels on error
    }
}
/**
 * Filter care circle members based on alert preferences
 */
async function filterCareCircleByPreferences(userIds, alert) {
    const filteredUsers = [];
    for (const userId of userIds) {
        const shouldSend = await shouldSendAlert(userId, alert);
        if (shouldSend) {
            filteredUsers.push(userId);
        }
    }
    return filteredUsers;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxlcnQtcHJlZmVyZW5jZXMtZmlsdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYWxlcnQtcHJlZmVyZW5jZXMtZmlsdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwyQkFBMkI7QUFDM0Isb0JBQW9CO0FBQ3BCLDZEQUE2RDs7QUEyQjdELDBDQXVDQztBQUtELDBEQXVCQztBQUtELHNFQWNDO0FBOUdELCtDQUE4QztBQUU5Qzs7R0FFRztBQUNILFNBQVMsa0JBQWtCLENBQUMsVUFBMkM7SUFDckUsSUFBSSxDQUFDLFVBQVU7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUU5QixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ3ZCLE1BQU0sV0FBVyxHQUFHLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztJQUVwSCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLFVBQVUsQ0FBQztJQUVsQyx3Q0FBd0M7SUFDeEMsSUFBSSxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDaEIsT0FBTyxXQUFXLElBQUksS0FBSyxJQUFJLFdBQVcsSUFBSSxHQUFHLENBQUM7SUFDcEQsQ0FBQztJQUVELE9BQU8sV0FBVyxJQUFJLEtBQUssSUFBSSxXQUFXLElBQUksR0FBRyxDQUFDO0FBQ3BELENBQUM7QUFFRDs7R0FFRztBQUNJLEtBQUssVUFBVSxlQUFlLENBQ25DLE1BQWMsRUFDZCxLQUFrQjtJQUVsQixJQUFJLENBQUM7UUFDSCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUEsZUFBTyxFQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxJQUFJO1lBQUUsT0FB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QUFhLENBQUM7QUFDdkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEFsZXJ0IFByZWZlcmVuY2VzIEZpbHRlclxuLy8gUmVxdWlyZW1lbnRzOiA5LjJcbi8vIEZpbHRlcnMgYWxlcnRzIGFuZCBub3RpZmljYXRpb25zIGJhc2VkIG9uIHVzZXIgcHJlZmVyZW5jZXNcblxuaW1wb3J0IHsgQWxlcnRUeXBlLCBBbGVydFNldmVyaXR5LCBOb3RpZmljYXRpb25DaGFubmVsLCBBbGVydFByZWZlcmVuY2VzLCBIZWFsdGhBbGVydCB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgZ2V0VXNlciB9IGZyb20gJy4vZGF0YS1hY2Nlc3MvdXNlcnMnO1xuXG4vKipcbiAqIENoZWNrIGlmIGN1cnJlbnQgdGltZSBpcyB3aXRoaW4gcXVpZXQgaG91cnNcbiAqL1xuZnVuY3Rpb24gaXNXaXRoaW5RdWlldEhvdXJzKHF1aWV0SG91cnM/OiB7IHN0YXJ0OiBzdHJpbmc7IGVuZDogc3RyaW5nIH0pOiBib29sZWFuIHtcbiAgaWYgKCFxdWlldEhvdXJzKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgY29uc3QgY3VycmVudFRpbWUgPSBgJHtub3cuZ2V0SG91cnMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyl9OiR7bm93LmdldE1pbnV0ZXMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyl9YDtcbiAgXG4gIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gcXVpZXRIb3VycztcbiAgXG4gIC8vIEhhbmRsZSBxdWlldCBob3VycyB0aGF0IHNwYW4gbWlkbmlnaHRcbiAgaWYgKHN0YXJ0ID4gZW5kKSB7XG4gICAgcmV0dXJuIGN1cnJlbnRUaW1lID49IHN0YXJ0IHx8IGN1cnJlbnRUaW1lIDw9IGVuZDtcbiAgfVxuICBcbiAgcmV0dXJuIGN1cnJlbnRUaW1lID49IHN0YXJ0ICYmIGN1cnJlbnRUaW1lIDw9IGVuZDtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhbGVydCBzaG91bGQgYmUgc2VudCBiYXNlZCBvbiB1c2VyIHByZWZlcmVuY2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzaG91bGRTZW5kQWxlcnQoXG4gIHVzZXJJZDogc3RyaW5nLFxuICBhbGVydDogSGVhbHRoQWxlcnRcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyKHVzZXJJZCk7XG4gICAgaWYgKCF1c2VyKSByZXR1cm4gdHJ1ZTsgLy8gRGVmYXVsdCB0byBzZW5kaW5nIGlmIHVzZXIgbm90IGZvdW5kXG5cbiAgICBjb25zdCBwcmVmZXJlbmNlcyA9ICh1c2VyIGFzIGFueSkuYWxlcnRQcmVmZXJlbmNlcyBhcyBBbGVydFByZWZlcmVuY2VzIHwgdW5kZWZpbmVkO1xuICAgIGlmICghcHJlZmVyZW5jZXMpIHJldHVybiB0cnVlOyAvLyBEZWZhdWx0IHRvIHNlbmRpbmcgaWYgbm8gcHJlZmVyZW5jZXMgc2V0XG5cbiAgICAvLyBDaGVjayBpZiBhbGVydCB0eXBlIGlzIGVuYWJsZWRcbiAgICBjb25zdCBhbGVydFR5cGVDb25maWcgPSBwcmVmZXJlbmNlcy5hbGVydFR5cGVzPy5bYWxlcnQudHlwZV07XG4gICAgaWYgKGFsZXJ0VHlwZUNvbmZpZyAmJiAhYWxlcnRUeXBlQ29uZmlnLmVuYWJsZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBhbGVydCBzZXZlcml0eSBtYXRjaGVzIHVzZXIncyB1cmdlbmN5IGxldmVsIHByZWZlcmVuY2VzXG4gICAgaWYgKGFsZXJ0VHlwZUNvbmZpZyAmJiBhbGVydFR5cGVDb25maWcudXJnZW5jeUxldmVscykge1xuICAgICAgaWYgKCFhbGVydFR5cGVDb25maWcudXJnZW5jeUxldmVscy5pbmNsdWRlcyhhbGVydC5zZXZlcml0eSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENyaXRpY2FsIGFsZXJ0cyBhbHdheXMgYnlwYXNzIHF1aWV0IGhvdXJzXG4gICAgaWYgKGFsZXJ0LnNldmVyaXR5ID09PSAnY3JpdGljYWwnKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBxdWlldCBob3VycyBmb3Igbm9uLWNyaXRpY2FsIGFsZXJ0c1xuICAgIGlmIChpc1dpdGhpblF1aWV0SG91cnMocHJlZmVyZW5jZXMucXVpZXRIb3VycykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjaGVja2luZyBhbGVydCBwcmVmZXJlbmNlczonLCBlcnJvcik7XG4gICAgcmV0dXJuIHRydWU7IC8vIERlZmF1bHQgdG8gc2VuZGluZyBvbiBlcnJvclxuICB9XG59XG5cbi8qKlxuICogR2V0IG5vdGlmaWNhdGlvbiBjaGFubmVscyBmb3IgYSB1c2VyIGJhc2VkIG9uIHRoZWlyIHByZWZlcmVuY2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXROb3RpZmljYXRpb25DaGFubmVscyhcbiAgdXNlcklkOiBzdHJpbmcsXG4gIGFsZXJ0OiBIZWFsdGhBbGVydFxuKTogUHJvbWlzZTxOb3RpZmljYXRpb25DaGFubmVsW10+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZ2V0VXNlcih1c2VySWQpO1xuICAgIGlmICghdXNlcikgcmV0dXJuIFsncHVzaCcsICdzbXMnLCAnZW1haWwnXTsgLy8gRGVmYXVsdCBjaGFubmVsc1xuXG4gICAgY29uc3QgcHJlZmVyZW5jZXMgPSAodXNlciBhcyBhbnkpLmFsZXJ0UHJlZmVyZW5jZXMgYXMgQWxlcnRQcmVmZXJlbmNlcyB8IHVuZGVmaW5lZDtcbiAgICBpZiAoIXByZWZlcmVuY2VzIHx8ICFwcmVmZXJlbmNlcy5jaGFubmVscykge1xuICAgICAgcmV0dXJuIFsncHVzaCcsICdzbXMnLCAnZW1haWwnXTsgLy8gRGVmYXVsdCBjaGFubmVsc1xuICAgIH1cblxuICAgIC8vIENyaXRpY2FsIGFsZXJ0cyB1c2UgYWxsIGF2YWlsYWJsZSBjaGFubmVsc1xuICAgIGlmIChhbGVydC5zZXZlcml0eSA9PT0gJ2NyaXRpY2FsJykge1xuICAgICAgcmV0dXJuIFsncHVzaCcsICdzbXMnLCAnZW1haWwnXTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJlZmVyZW5jZXMuY2hhbm5lbHM7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBub3RpZmljYXRpb24gY2hhbm5lbHM6JywgZXJyb3IpO1xuICAgIHJldHVybiBbJ3B1c2gnLCAnc21zJywgJ2VtYWlsJ107IC8vIERlZmF1bHQgY2hhbm5lbHMgb24gZXJyb3JcbiAgfVxufVxuXG4vKipcbiAqIEZpbHRlciBjYXJlIGNpcmNsZSBtZW1iZXJzIGJhc2VkIG9uIGFsZXJ0IHByZWZlcmVuY2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaWx0ZXJDYXJlQ2lyY2xlQnlQcmVmZXJlbmNlcyhcbiAgdXNlcklkczogc3RyaW5nW10sXG4gIGFsZXJ0OiBIZWFsdGhBbGVydFxuKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICBjb25zdCBmaWx0ZXJlZFVzZXJzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgdXNlcklkIG9mIHVzZXJJZHMpIHtcbiAgICBjb25zdCBzaG91bGRTZW5kID0gYXdhaXQgc2hvdWxkU2VuZEFsZXJ0KHVzZXJJZCwgYWxlcnQpO1xuICAgIGlmIChzaG91bGRTZW5kKSB7XG4gICAgICBmaWx0ZXJlZFVzZXJzLnB1c2godXNlcklkKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmlsdGVyZWRVc2Vycztcbn1cbiJdfQ==