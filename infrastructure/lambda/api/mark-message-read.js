"use strict";
// Mark Message as Read Lambda Function
// Requirements: 4.4
// Marks a message as read and notifies the sender
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const dynamodb_client_1 = require("../shared/dynamodb-client");
const notification_service_1 = require("../shared/notification-service");
const users_1 = require("../shared/data-access/users");
/**
 * Mark a message as read and notify the sender
 */
async function handler(event) {
    try {
        // Get messageId from path parameters
        const messageId = event.pathParameters?.messageId;
        if (!messageId) {
            return (0, types_1.createErrorResponse)(400, 'messageId is required in path');
        }
        // Get requesting user from authorizer context
        const requestingUserId = event.requestContext.authorizer?.claims?.sub;
        if (!requestingUserId) {
            return (0, types_1.createErrorResponse)(401, 'Unauthorized');
        }
        // Get the message from DynamoDB
        const message = await (0, dynamodb_client_1.getItem)(dynamodb_client_1.TABLES.CARE_CIRCLE_MESSAGES || 'healthcare-care-circle-messages-dev', { messageId });
        if (!message) {
            return (0, types_1.createErrorResponse)(404, 'Message not found');
        }
        // Verify the requesting user is the recipient
        if (message.recipientId !== requestingUserId) {
            return (0, types_1.createErrorResponse)(403, 'You can only mark your own messages as read');
        }
        // Check if already marked as read
        if (message.status === 'read') {
            return (0, types_1.createSuccessResponse)({
                message: 'Message already marked as read',
                readAt: message.readAt,
            });
        }
        // Update message status to read
        const now = new Date();
        await (0, dynamodb_client_1.updateItem)(dynamodb_client_1.TABLES.CARE_CIRCLE_MESSAGES || 'healthcare-care-circle-messages-dev', { messageId }, {
            status: 'read',
            readAt: now.toISOString(),
        });
        // Get sender and recipient information for notification
        const sender = await (0, users_1.getUser)(message.senderId);
        const recipient = await (0, users_1.getUser)(message.recipientId);
        if (sender && recipient) {
            // Send notification to the sender that their message was read
            const recipientName = `${recipient.profile.firstName} ${recipient.profile.lastName}`;
            const notificationMessage = message.subject
                ? `${recipientName} read your message: "${message.subject}"`
                : `${recipientName} read your message`;
            await (0, notification_service_1.sendNotification)({
                recipient: message.senderId,
                alert: {
                    id: `read-${messageId}`,
                    userId: message.senderId,
                    type: 'check_in',
                    severity: 'low',
                    message: notificationMessage,
                    timestamp: now,
                    acknowledged: false,
                    escalated: false,
                },
                channels: ['push'], // Only push notification for read receipts
            });
        }
        return (0, types_1.createSuccessResponse)({
            message: 'Message marked as read',
            readAt: now.toISOString(),
        });
    }
    catch (error) {
        console.error('Error marking message as read:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to mark message as read');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFyay1tZXNzYWdlLXJlYWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXJrLW1lc3NhZ2UtcmVhZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsdUNBQXVDO0FBQ3ZDLG9CQUFvQjtBQUNwQixrREFBa0Q7O0FBdUJsRCwwQkFtRkM7QUF2R0QsMkNBQTZFO0FBQzdFLCtEQUF3RTtBQUN4RSx5RUFBa0U7QUFDbEUsdURBQXNEO0FBY3REOztHQUVHO0FBQ0ksS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUEyQjtJQUN2RCxJQUFJLENBQUM7UUFDSCxxQ0FBcUM7UUFDckMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUM7UUFDbEQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2YsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELGdDQUFnQztRQUNoQyxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUEseUJBQU8sRUFDM0Isd0JBQU0sQ0FBQyxvQkFBb0IsSUFBSSxxQ0FBcUMsRUFDcEUsRUFBRSxTQUFTLEVBQUUsQ0FDZCxDQUFDO1FBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsSUFBSSxPQUFPLENBQUMsV0FBVyxLQUFLLGdCQUFnQixFQUFFLENBQUM7WUFDN0MsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSw2Q0FBNkMsQ0FBQyxDQUFDO1FBQ2pGLENBQUM7UUFFRCxrQ0FBa0M7UUFDbEMsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBQSw2QkFBcUIsRUFBQztnQkFDM0IsT0FBTyxFQUFFLGdDQUFnQztnQkFDekMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO2FBQ3ZCLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxnQ0FBZ0M7UUFDaEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2QixNQUFNLElBQUEsNEJBQVUsRUFDZCx3QkFBTSxDQUFDLG9CQUFvQixJQUFJLHFDQUFxQyxFQUNwRSxFQUFFLFNBQVMsRUFBRSxFQUNiO1lBQ0UsTUFBTSxFQUFFLE1BQU07WUFDZCxNQUFNLEVBQUUsR0FBRyxDQUFDLFdBQVcsRUFBRTtTQUMxQixDQUNGLENBQUM7UUFFRix3REFBd0Q7UUFDeEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLGVBQU8sRUFBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFBLGVBQU8sRUFBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFckQsSUFBSSxNQUFNLElBQUksU0FBUyxFQUFFLENBQUM7WUFDeEIsOERBQThEO1lBQzlELE1BQU0sYUFBYSxHQUFHLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyRixNQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxPQUFPO2dCQUN6QyxDQUFDLENBQUMsR0FBRyxhQUFhLHdCQUF3QixPQUFPLENBQUMsT0FBTyxHQUFHO2dCQUM1RCxDQUFDLENBQUMsR0FBRyxhQUFhLG9CQUFvQixDQUFDO1lBRXpDLE1BQU0sSUFBQSx1Q0FBZ0IsRUFBQztnQkFDckIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxRQUFRO2dCQUMzQixLQUFLLEVBQUU7b0JBQ0wsRUFBRSxFQUFFLFFBQVEsU0FBUyxFQUFFO29CQUN2QixNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVE7b0JBQ3hCLElBQUksRUFBRSxVQUFVO29CQUNoQixRQUFRLEVBQUUsS0FBSztvQkFDZixPQUFPLEVBQUUsbUJBQW1CO29CQUM1QixTQUFTLEVBQUUsR0FBRztvQkFDZCxZQUFZLEVBQUUsS0FBSztvQkFDbkIsU0FBUyxFQUFFLEtBQUs7aUJBQ2pCO2dCQUNELFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLDJDQUEyQzthQUNoRSxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsT0FBTyxJQUFBLDZCQUFxQixFQUFDO1lBQzNCLE9BQU8sRUFBRSx3QkFBd0I7WUFDakMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxXQUFXLEVBQUU7U0FDMUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztJQUNwRSxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIE1hcmsgTWVzc2FnZSBhcyBSZWFkIExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiA0LjRcbi8vIE1hcmtzIGEgbWVzc2FnZSBhcyByZWFkIGFuZCBub3RpZmllcyB0aGUgc2VuZGVyXG5cbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSwgY3JlYXRlRXJyb3JSZXNwb25zZSB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBUQUJMRVMsIGdldEl0ZW0sIHVwZGF0ZUl0ZW0gfSBmcm9tICcuLi9zaGFyZWQvZHluYW1vZGItY2xpZW50JztcbmltcG9ydCB7IHNlbmROb3RpZmljYXRpb24gfSBmcm9tICcuLi9zaGFyZWQvbm90aWZpY2F0aW9uLXNlcnZpY2UnO1xuaW1wb3J0IHsgZ2V0VXNlciB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy91c2Vycyc7XG5cbmludGVyZmFjZSBDYXJlQ2lyY2xlTWVzc2FnZSB7XG4gIG1lc3NhZ2VJZDogc3RyaW5nO1xuICBwcmltYXJ5VXNlcklkOiBzdHJpbmc7XG4gIHNlbmRlcklkOiBzdHJpbmc7XG4gIHJlY2lwaWVudElkOiBzdHJpbmc7XG4gIHN1YmplY3Q/OiBzdHJpbmc7XG4gIGNvbnRlbnQ6IHN0cmluZztcbiAgc2VudEF0OiBzdHJpbmc7XG4gIHJlYWRBdD86IHN0cmluZztcbiAgc3RhdHVzOiAnc2VudCcgfCAnZGVsaXZlcmVkJyB8ICdyZWFkJztcbn1cblxuLyoqXG4gKiBNYXJrIGEgbWVzc2FnZSBhcyByZWFkIGFuZCBub3RpZnkgdGhlIHNlbmRlclxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xuICB0cnkge1xuICAgIC8vIEdldCBtZXNzYWdlSWQgZnJvbSBwYXRoIHBhcmFtZXRlcnNcbiAgICBjb25zdCBtZXNzYWdlSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8ubWVzc2FnZUlkO1xuICAgIGlmICghbWVzc2FnZUlkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdtZXNzYWdlSWQgaXMgcmVxdWlyZWQgaW4gcGF0aCcpO1xuICAgIH1cblxuICAgIC8vIEdldCByZXF1ZXN0aW5nIHVzZXIgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcbiAgICBjb25zdCByZXF1ZXN0aW5nVXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8uY2xhaW1zPy5zdWI7XG4gICAgaWYgKCFyZXF1ZXN0aW5nVXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdVbmF1dGhvcml6ZWQnKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgdGhlIG1lc3NhZ2UgZnJvbSBEeW5hbW9EQlxuICAgIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCBnZXRJdGVtPENhcmVDaXJjbGVNZXNzYWdlPihcbiAgICAgIFRBQkxFUy5DQVJFX0NJUkNMRV9NRVNTQUdFUyB8fCAnaGVhbHRoY2FyZS1jYXJlLWNpcmNsZS1tZXNzYWdlcy1kZXYnLFxuICAgICAgeyBtZXNzYWdlSWQgfVxuICAgICk7XG5cbiAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwNCwgJ01lc3NhZ2Ugbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgLy8gVmVyaWZ5IHRoZSByZXF1ZXN0aW5nIHVzZXIgaXMgdGhlIHJlY2lwaWVudFxuICAgIGlmIChtZXNzYWdlLnJlY2lwaWVudElkICE9PSByZXF1ZXN0aW5nVXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDMsICdZb3UgY2FuIG9ubHkgbWFyayB5b3VyIG93biBtZXNzYWdlcyBhcyByZWFkJyk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBtYXJrZWQgYXMgcmVhZFxuICAgIGlmIChtZXNzYWdlLnN0YXR1cyA9PT0gJ3JlYWQnKSB7XG4gICAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgbWVzc2FnZTogJ01lc3NhZ2UgYWxyZWFkeSBtYXJrZWQgYXMgcmVhZCcsXG4gICAgICAgIHJlYWRBdDogbWVzc2FnZS5yZWFkQXQsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgbWVzc2FnZSBzdGF0dXMgdG8gcmVhZFxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgYXdhaXQgdXBkYXRlSXRlbShcbiAgICAgIFRBQkxFUy5DQVJFX0NJUkNMRV9NRVNTQUdFUyB8fCAnaGVhbHRoY2FyZS1jYXJlLWNpcmNsZS1tZXNzYWdlcy1kZXYnLFxuICAgICAgeyBtZXNzYWdlSWQgfSxcbiAgICAgIHtcbiAgICAgICAgc3RhdHVzOiAncmVhZCcsXG4gICAgICAgIHJlYWRBdDogbm93LnRvSVNPU3RyaW5nKCksXG4gICAgICB9XG4gICAgKTtcblxuICAgIC8vIEdldCBzZW5kZXIgYW5kIHJlY2lwaWVudCBpbmZvcm1hdGlvbiBmb3Igbm90aWZpY2F0aW9uXG4gICAgY29uc3Qgc2VuZGVyID0gYXdhaXQgZ2V0VXNlcihtZXNzYWdlLnNlbmRlcklkKTtcbiAgICBjb25zdCByZWNpcGllbnQgPSBhd2FpdCBnZXRVc2VyKG1lc3NhZ2UucmVjaXBpZW50SWQpO1xuXG4gICAgaWYgKHNlbmRlciAmJiByZWNpcGllbnQpIHtcbiAgICAgIC8vIFNlbmQgbm90aWZpY2F0aW9uIHRvIHRoZSBzZW5kZXIgdGhhdCB0aGVpciBtZXNzYWdlIHdhcyByZWFkXG4gICAgICBjb25zdCByZWNpcGllbnROYW1lID0gYCR7cmVjaXBpZW50LnByb2ZpbGUuZmlyc3ROYW1lfSAke3JlY2lwaWVudC5wcm9maWxlLmxhc3ROYW1lfWA7XG4gICAgICBjb25zdCBub3RpZmljYXRpb25NZXNzYWdlID0gbWVzc2FnZS5zdWJqZWN0XG4gICAgICAgID8gYCR7cmVjaXBpZW50TmFtZX0gcmVhZCB5b3VyIG1lc3NhZ2U6IFwiJHttZXNzYWdlLnN1YmplY3R9XCJgXG4gICAgICAgIDogYCR7cmVjaXBpZW50TmFtZX0gcmVhZCB5b3VyIG1lc3NhZ2VgO1xuXG4gICAgICBhd2FpdCBzZW5kTm90aWZpY2F0aW9uKHtcbiAgICAgICAgcmVjaXBpZW50OiBtZXNzYWdlLnNlbmRlcklkLFxuICAgICAgICBhbGVydDoge1xuICAgICAgICAgIGlkOiBgcmVhZC0ke21lc3NhZ2VJZH1gLFxuICAgICAgICAgIHVzZXJJZDogbWVzc2FnZS5zZW5kZXJJZCxcbiAgICAgICAgICB0eXBlOiAnY2hlY2tfaW4nLFxuICAgICAgICAgIHNldmVyaXR5OiAnbG93JyxcbiAgICAgICAgICBtZXNzYWdlOiBub3RpZmljYXRpb25NZXNzYWdlLFxuICAgICAgICAgIHRpbWVzdGFtcDogbm93LFxuICAgICAgICAgIGFja25vd2xlZGdlZDogZmFsc2UsXG4gICAgICAgICAgZXNjYWxhdGVkOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgY2hhbm5lbHM6IFsncHVzaCddLCAvLyBPbmx5IHB1c2ggbm90aWZpY2F0aW9uIGZvciByZWFkIHJlY2VpcHRzXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgIG1lc3NhZ2U6ICdNZXNzYWdlIG1hcmtlZCBhcyByZWFkJyxcbiAgICAgIHJlYWRBdDogbm93LnRvSVNPU3RyaW5nKCksXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgbWFya2luZyBtZXNzYWdlIGFzIHJlYWQ6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byBtYXJrIG1lc3NhZ2UgYXMgcmVhZCcpO1xuICB9XG59XG4iXX0=