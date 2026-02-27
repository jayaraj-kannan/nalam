"use strict";
// Get Alert Preferences Lambda Function
// Requirements: 9.2
// Retrieves alert notification preferences for a care circle member
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const users_1 = require("../shared/data-access/users");
async function handler(event) {
    try {
        // Get userId from path parameters
        const userId = event.pathParameters?.userId;
        if (!userId) {
            return (0, types_1.createErrorResponse)(400, 'userId is required in path');
        }
        // Get requesting user from authorizer context
        const requestingUserId = event.requestContext.authorizer?.claims?.sub;
        if (!requestingUserId) {
            return (0, types_1.createErrorResponse)(401, 'Unauthorized');
        }
        // Users can only view their own preferences
        if (requestingUserId !== userId) {
            return (0, types_1.createErrorResponse)(403, 'You can only view your own alert preferences');
        }
        // Get user
        const user = await (0, users_1.getUser)(userId);
        if (!user) {
            return (0, types_1.createErrorResponse)(404, 'User not found');
        }
        // Get alert preferences from user profile
        const alertPreferences = user.alertPreferences || {
            channels: ['push', 'sms', 'email'],
            alertTypes: {
                vital_signs: { enabled: true, urgencyLevels: ['high', 'critical'] },
                medication: { enabled: true, urgencyLevels: ['medium', 'high', 'critical'] },
                appointment: { enabled: true, urgencyLevels: ['medium', 'high', 'critical'] },
                emergency: { enabled: true, urgencyLevels: ['critical'] },
                device: { enabled: true, urgencyLevels: ['high', 'critical'] },
                check_in: { enabled: true, urgencyLevels: ['high', 'critical'] },
                fall_detection: { enabled: true, urgencyLevels: ['critical'] },
            },
        };
        return (0, types_1.createSuccessResponse)({
            userId,
            preferences: alertPreferences,
        });
    }
    catch (error) {
        console.error('Error getting alert preferences:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to retrieve alert preferences');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWFsZXJ0LXByZWZlcmVuY2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWFsZXJ0LXByZWZlcmVuY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx3Q0FBd0M7QUFDeEMsb0JBQW9CO0FBQ3BCLG9FQUFvRTs7QUFNcEUsMEJBK0NDO0FBbERELDJDQUErRjtBQUMvRix1REFBc0Q7QUFFL0MsS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUEyQjtJQUN2RCxJQUFJLENBQUM7UUFDSCxrQ0FBa0M7UUFDbEMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7UUFDNUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELDRDQUE0QztRQUM1QyxJQUFJLGdCQUFnQixLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ2hDLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsOENBQThDLENBQUMsQ0FBQztRQUNsRixDQUFDO1FBRUQsV0FBVztRQUNYLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBQSxlQUFPLEVBQUMsTUFBTSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFFRCwwQ0FBMEM7UUFDMUMsTUFBTSxnQkFBZ0IsR0FBSSxJQUFZLENBQUMsZ0JBQWdCLElBQUk7WUFDekQsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUM7WUFDbEMsVUFBVSxFQUFFO2dCQUNWLFdBQVcsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxFQUFFO2dCQUNuRSxVQUFVLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUU7Z0JBQzVFLFdBQVcsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsRUFBRTtnQkFDN0UsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDekQsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUU7Z0JBQzlELFFBQVEsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxFQUFFO2dCQUNoRSxjQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFO2FBQy9EO1NBQ0YsQ0FBQztRQUVGLE9BQU8sSUFBQSw2QkFBcUIsRUFBQztZQUMzQixNQUFNO1lBQ04sV0FBVyxFQUFFLGdCQUFnQjtTQUM5QixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDO0lBQzFFLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gR2V0IEFsZXJ0IFByZWZlcmVuY2VzIExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiA5LjJcbi8vIFJldHJpZXZlcyBhbGVydCBub3RpZmljYXRpb24gcHJlZmVyZW5jZXMgZm9yIGEgY2FyZSBjaXJjbGUgbWVtYmVyXG5cbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSwgY3JlYXRlRXJyb3JSZXNwb25zZSwgQWxlcnRQcmVmZXJlbmNlcyB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBnZXRVc2VyIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL3VzZXJzJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgdXNlcklkIGZyb20gcGF0aCBwYXJhbWV0ZXJzXG4gICAgY29uc3QgdXNlcklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnVzZXJJZDtcbiAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAndXNlcklkIGlzIHJlcXVpcmVkIGluIHBhdGgnKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgcmVxdWVzdGluZyB1c2VyIGZyb20gYXV0aG9yaXplciBjb250ZXh0XG4gICAgY29uc3QgcmVxdWVzdGluZ1VzZXJJZCA9IGV2ZW50LnJlcXVlc3RDb250ZXh0LmF1dGhvcml6ZXI/LmNsYWltcz8uc3ViO1xuICAgIGlmICghcmVxdWVzdGluZ1VzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAxLCAnVW5hdXRob3JpemVkJyk7XG4gICAgfVxuXG4gICAgLy8gVXNlcnMgY2FuIG9ubHkgdmlldyB0aGVpciBvd24gcHJlZmVyZW5jZXNcbiAgICBpZiAocmVxdWVzdGluZ1VzZXJJZCAhPT0gdXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDMsICdZb3UgY2FuIG9ubHkgdmlldyB5b3VyIG93biBhbGVydCBwcmVmZXJlbmNlcycpO1xuICAgIH1cblxuICAgIC8vIEdldCB1c2VyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXIodXNlcklkKTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwNCwgJ1VzZXIgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgLy8gR2V0IGFsZXJ0IHByZWZlcmVuY2VzIGZyb20gdXNlciBwcm9maWxlXG4gICAgY29uc3QgYWxlcnRQcmVmZXJlbmNlcyA9ICh1c2VyIGFzIGFueSkuYWxlcnRQcmVmZXJlbmNlcyB8fCB7XG4gICAgICBjaGFubmVsczogWydwdXNoJywgJ3NtcycsICdlbWFpbCddLFxuICAgICAgYWxlcnRUeXBlczoge1xuICAgICAgICB2aXRhbF9zaWduczogeyBlbmFibGVkOiB0cnVlLCB1cmdlbmN5TGV2ZWxzOiBbJ2hpZ2gnLCAnY3JpdGljYWwnXSB9LFxuICAgICAgICBtZWRpY2F0aW9uOiB7IGVuYWJsZWQ6IHRydWUsIHVyZ2VuY3lMZXZlbHM6IFsnbWVkaXVtJywgJ2hpZ2gnLCAnY3JpdGljYWwnXSB9LFxuICAgICAgICBhcHBvaW50bWVudDogeyBlbmFibGVkOiB0cnVlLCB1cmdlbmN5TGV2ZWxzOiBbJ21lZGl1bScsICdoaWdoJywgJ2NyaXRpY2FsJ10gfSxcbiAgICAgICAgZW1lcmdlbmN5OiB7IGVuYWJsZWQ6IHRydWUsIHVyZ2VuY3lMZXZlbHM6IFsnY3JpdGljYWwnXSB9LFxuICAgICAgICBkZXZpY2U6IHsgZW5hYmxlZDogdHJ1ZSwgdXJnZW5jeUxldmVsczogWydoaWdoJywgJ2NyaXRpY2FsJ10gfSxcbiAgICAgICAgY2hlY2tfaW46IHsgZW5hYmxlZDogdHJ1ZSwgdXJnZW5jeUxldmVsczogWydoaWdoJywgJ2NyaXRpY2FsJ10gfSxcbiAgICAgICAgZmFsbF9kZXRlY3Rpb246IHsgZW5hYmxlZDogdHJ1ZSwgdXJnZW5jeUxldmVsczogWydjcml0aWNhbCddIH0sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgIHVzZXJJZCxcbiAgICAgIHByZWZlcmVuY2VzOiBhbGVydFByZWZlcmVuY2VzLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgYWxlcnQgcHJlZmVyZW5jZXM6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byByZXRyaWV2ZSBhbGVydCBwcmVmZXJlbmNlcycpO1xuICB9XG59XG4iXX0=