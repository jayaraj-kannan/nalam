"use strict";
// Send Care Circle Message Lambda Function
// Requirements: 4.4
// Sends a message between care circle members with read receipts
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const care_circle_1 = require("../shared/data-access/care-circle");
const users_1 = require("../shared/data-access/users");
const dynamodb_client_1 = require("../shared/dynamodb-client");
const notification_service_1 = require("../shared/notification-service");
/**
 * Generate message ID
 */
function generateMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
async function handler(event) {
    try {
        // Get userId from path parameters
        const primaryUserId = event.pathParameters?.userId;
        if (!primaryUserId) {
            return (0, types_1.createErrorResponse)(400, 'userId is required in path');
        }
        // Get requesting user from authorizer context
        const requestingUserId = event.requestContext.authorizer?.claims?.sub;
        if (!requestingUserId) {
            return (0, types_1.createErrorResponse)(401, 'Unauthorized');
        }
        // Parse request body
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.recipientId || !request.content) {
            return (0, types_1.createErrorResponse)(400, 'recipientId and content are required');
        }
        // Validate content length
        if (request.content.length > 5000) {
            return (0, types_1.createErrorResponse)(400, 'Message content cannot exceed 5000 characters');
        }
        // Determine sender and recipient roles
        let senderId;
        let recipientId;
        if (requestingUserId === primaryUserId) {
            // Primary user sending to care circle member
            senderId = primaryUserId;
            recipientId = request.recipientId;
            // Check if recipient is in care circle
            const hasPermission = await (0, care_circle_1.checkPermission)(primaryUserId, recipientId, 'canSendMessages');
            if (!hasPermission) {
                return (0, types_1.createErrorResponse)(403, 'Recipient is not in your care circle or does not have messaging permission');
            }
        }
        else {
            // Care circle member sending to primary user
            senderId = requestingUserId;
            recipientId = primaryUserId;
            // Check if sender has permission to send messages
            const hasPermission = await (0, care_circle_1.checkPermission)(primaryUserId, requestingUserId, 'canSendMessages');
            if (!hasPermission) {
                return (0, types_1.createErrorResponse)(403, 'You do not have permission to send messages to this user');
            }
        }
        // Get sender and recipient information
        const sender = await (0, users_1.getUser)(senderId);
        const recipient = await (0, users_1.getUser)(recipientId);
        if (!sender || !recipient) {
            return (0, types_1.createErrorResponse)(404, 'Sender or recipient not found');
        }
        // Create message
        const messageId = generateMessageId();
        const now = new Date();
        const message = {
            messageId,
            primaryUserId,
            senderId,
            recipientId,
            subject: request.subject,
            content: request.content,
            sentAt: now.toISOString(),
            status: 'sent',
            healthData: request.healthData,
        };
        // Store message in DynamoDB
        await (0, dynamodb_client_1.putItem)(dynamodb_client_1.TABLES.CARE_CIRCLE_MESSAGES || 'healthcare-care-circle-messages-dev', message);
        // Send notification to recipient
        const senderName = `${sender.profile.firstName} ${sender.profile.lastName}`;
        const notificationMessage = request.subject
            ? `${senderName}: ${request.subject}`
            : `${senderName} sent you a message`;
        await (0, notification_service_1.sendNotification)({
            recipient: recipientId,
            alert: {
                id: messageId,
                userId: recipientId,
                type: 'check_in',
                severity: 'low',
                message: notificationMessage,
                timestamp: now,
                acknowledged: false,
                escalated: false,
            },
            channels: ['push', 'email'],
        });
        return (0, types_1.createSuccessResponse)({
            message: 'Message sent successfully',
            messageId,
            sentAt: now.toISOString(),
        });
    }
    catch (error) {
        console.error('Error sending care circle message:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to send message');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZC1jYXJlLWNpcmNsZS1tZXNzYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VuZC1jYXJlLWNpcmNsZS1tZXNzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwyQ0FBMkM7QUFDM0Msb0JBQW9CO0FBQ3BCLGlFQUFpRTs7QUEwQ2pFLDBCQWtIQztBQXpKRCwyQ0FBNkU7QUFDN0UsbUVBQW9FO0FBQ3BFLHVEQUFzRDtBQUN0RCwrREFBNEQ7QUFDNUQseUVBQWtFO0FBNEJsRTs7R0FFRztBQUNILFNBQVMsaUJBQWlCO0lBQ3hCLE9BQU8sT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDeEUsQ0FBQztBQUVNLEtBQUssVUFBVSxPQUFPLENBQUMsS0FBMkI7SUFDdkQsSUFBSSxDQUFDO1FBQ0gsa0NBQWtDO1FBQ2xDLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO1FBQ25ELElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNuQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELDhDQUE4QztRQUM5QyxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUM7UUFDdEUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQzlELENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBdUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFM0QsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzdDLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBRUQsMEJBQTBCO1FBQzFCLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUM7WUFDbEMsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSwrQ0FBK0MsQ0FBQyxDQUFDO1FBQ25GLENBQUM7UUFFRCx1Q0FBdUM7UUFDdkMsSUFBSSxRQUFnQixDQUFDO1FBQ3JCLElBQUksV0FBbUIsQ0FBQztRQUV4QixJQUFJLGdCQUFnQixLQUFLLGFBQWEsRUFBRSxDQUFDO1lBQ3ZDLDZDQUE2QztZQUM3QyxRQUFRLEdBQUcsYUFBYSxDQUFDO1lBQ3pCLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDO1lBRWxDLHVDQUF1QztZQUN2QyxNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUEsNkJBQWUsRUFBQyxhQUFhLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDM0YsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNuQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDRFQUE0RSxDQUFDLENBQUM7WUFDaEgsQ0FBQztRQUNILENBQUM7YUFBTSxDQUFDO1lBQ04sNkNBQTZDO1lBQzdDLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQztZQUM1QixXQUFXLEdBQUcsYUFBYSxDQUFDO1lBRTVCLGtEQUFrRDtZQUNsRCxNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUEsNkJBQWUsRUFBQyxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztZQUNoRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ25CLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsMERBQTBELENBQUMsQ0FBQztZQUM5RixDQUFDO1FBQ0gsQ0FBQztRQUVELHVDQUF1QztRQUN2QyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsZUFBTyxFQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBQSxlQUFPLEVBQUMsV0FBVyxDQUFDLENBQUM7UUFFN0MsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsK0JBQStCLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBRUQsaUJBQWlCO1FBQ2pCLE1BQU0sU0FBUyxHQUFHLGlCQUFpQixFQUFFLENBQUM7UUFDdEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUV2QixNQUFNLE9BQU8sR0FBc0I7WUFDakMsU0FBUztZQUNULGFBQWE7WUFDYixRQUFRO1lBQ1IsV0FBVztZQUNYLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztZQUN4QixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDeEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxXQUFXLEVBQUU7WUFDekIsTUFBTSxFQUFFLE1BQU07WUFDZCxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVU7U0FDL0IsQ0FBQztRQUVGLDRCQUE0QjtRQUM1QixNQUFNLElBQUEseUJBQU8sRUFBQyx3QkFBTSxDQUFDLG9CQUFvQixJQUFJLHFDQUFxQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTdGLGlDQUFpQztRQUNqQyxNQUFNLFVBQVUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDNUUsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsT0FBTztZQUN6QyxDQUFDLENBQUMsR0FBRyxVQUFVLEtBQUssT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNyQyxDQUFDLENBQUMsR0FBRyxVQUFVLHFCQUFxQixDQUFDO1FBRXZDLE1BQU0sSUFBQSx1Q0FBZ0IsRUFBQztZQUNyQixTQUFTLEVBQUUsV0FBVztZQUN0QixLQUFLLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLFNBQVM7Z0JBQ2IsTUFBTSxFQUFFLFdBQVc7Z0JBQ25CLElBQUksRUFBRSxVQUFVO2dCQUNoQixRQUFRLEVBQUUsS0FBSztnQkFDZixPQUFPLEVBQUUsbUJBQW1CO2dCQUM1QixTQUFTLEVBQUUsR0FBRztnQkFDZCxZQUFZLEVBQUUsS0FBSztnQkFDbkIsU0FBUyxFQUFFLEtBQUs7YUFDakI7WUFDRCxRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDO1NBQzVCLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBQSw2QkFBcUIsRUFBQztZQUMzQixPQUFPLEVBQUUsMkJBQTJCO1lBQ3BDLFNBQVM7WUFDVCxNQUFNLEVBQUUsR0FBRyxDQUFDLFdBQVcsRUFBRTtTQUMxQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0NBQW9DLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0QsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0lBQzVELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gU2VuZCBDYXJlIENpcmNsZSBNZXNzYWdlIExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiA0LjRcbi8vIFNlbmRzIGEgbWVzc2FnZSBiZXR3ZWVuIGNhcmUgY2lyY2xlIG1lbWJlcnMgd2l0aCByZWFkIHJlY2VpcHRzXG5cbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSwgY3JlYXRlRXJyb3JSZXNwb25zZSB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBjaGVja1Blcm1pc3Npb24gfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvY2FyZS1jaXJjbGUnO1xuaW1wb3J0IHsgZ2V0VXNlciB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy91c2Vycyc7XG5pbXBvcnQgeyBUQUJMRVMsIHB1dEl0ZW0gfSBmcm9tICcuLi9zaGFyZWQvZHluYW1vZGItY2xpZW50JztcbmltcG9ydCB7IHNlbmROb3RpZmljYXRpb24gfSBmcm9tICcuLi9zaGFyZWQvbm90aWZpY2F0aW9uLXNlcnZpY2UnO1xuXG5pbnRlcmZhY2UgSGVhbHRoRGF0YUF0dGFjaG1lbnQge1xuICB0eXBlOiAndml0YWxzJyB8ICdtZWRpY2F0aW9uJyB8ICdhcHBvaW50bWVudCc7XG4gIGRhdGE6IGFueTtcbiAgc3VtbWFyeTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQ2FyZUNpcmNsZU1lc3NhZ2Uge1xuICBtZXNzYWdlSWQ6IHN0cmluZztcbiAgcHJpbWFyeVVzZXJJZDogc3RyaW5nO1xuICBzZW5kZXJJZDogc3RyaW5nO1xuICByZWNpcGllbnRJZDogc3RyaW5nO1xuICBzdWJqZWN0Pzogc3RyaW5nO1xuICBjb250ZW50OiBzdHJpbmc7XG4gIHNlbnRBdDogc3RyaW5nO1xuICByZWFkQXQ/OiBzdHJpbmc7XG4gIHN0YXR1czogJ3NlbnQnIHwgJ2RlbGl2ZXJlZCcgfCAncmVhZCc7XG4gIGhlYWx0aERhdGE/OiBIZWFsdGhEYXRhQXR0YWNobWVudDtcbn1cblxuaW50ZXJmYWNlIFNlbmRNZXNzYWdlUmVxdWVzdCB7XG4gIHJlY2lwaWVudElkOiBzdHJpbmc7XG4gIHN1YmplY3Q/OiBzdHJpbmc7XG4gIGNvbnRlbnQ6IHN0cmluZztcbiAgaGVhbHRoRGF0YT86IEhlYWx0aERhdGFBdHRhY2htZW50O1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIG1lc3NhZ2UgSURcbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVNZXNzYWdlSWQoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBtc2ctJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xuICB0cnkge1xuICAgIC8vIEdldCB1c2VySWQgZnJvbSBwYXRoIHBhcmFtZXRlcnNcbiAgICBjb25zdCBwcmltYXJ5VXNlcklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnVzZXJJZDtcbiAgICBpZiAoIXByaW1hcnlVc2VySWQpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ3VzZXJJZCBpcyByZXF1aXJlZCBpbiBwYXRoJyk7XG4gICAgfVxuXG4gICAgLy8gR2V0IHJlcXVlc3RpbmcgdXNlciBmcm9tIGF1dGhvcml6ZXIgY29udGV4dFxuICAgIGNvbnN0IHJlcXVlc3RpbmdVc2VySWQgPSBldmVudC5yZXF1ZXN0Q29udGV4dC5hdXRob3JpemVyPy5jbGFpbXM/LnN1YjtcbiAgICBpZiAoIXJlcXVlc3RpbmdVc2VySWQpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMSwgJ1VuYXV0aG9yaXplZCcpO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxuICAgIGlmICghZXZlbnQuYm9keSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVxdWVzdDogU2VuZE1lc3NhZ2VSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcblxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgIGlmICghcmVxdWVzdC5yZWNpcGllbnRJZCB8fCAhcmVxdWVzdC5jb250ZW50KSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdyZWNpcGllbnRJZCBhbmQgY29udGVudCBhcmUgcmVxdWlyZWQnKTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBjb250ZW50IGxlbmd0aFxuICAgIGlmIChyZXF1ZXN0LmNvbnRlbnQubGVuZ3RoID4gNTAwMCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnTWVzc2FnZSBjb250ZW50IGNhbm5vdCBleGNlZWQgNTAwMCBjaGFyYWN0ZXJzJyk7XG4gICAgfVxuXG4gICAgLy8gRGV0ZXJtaW5lIHNlbmRlciBhbmQgcmVjaXBpZW50IHJvbGVzXG4gICAgbGV0IHNlbmRlcklkOiBzdHJpbmc7XG4gICAgbGV0IHJlY2lwaWVudElkOiBzdHJpbmc7XG5cbiAgICBpZiAocmVxdWVzdGluZ1VzZXJJZCA9PT0gcHJpbWFyeVVzZXJJZCkge1xuICAgICAgLy8gUHJpbWFyeSB1c2VyIHNlbmRpbmcgdG8gY2FyZSBjaXJjbGUgbWVtYmVyXG4gICAgICBzZW5kZXJJZCA9IHByaW1hcnlVc2VySWQ7XG4gICAgICByZWNpcGllbnRJZCA9IHJlcXVlc3QucmVjaXBpZW50SWQ7XG4gICAgICBcbiAgICAgIC8vIENoZWNrIGlmIHJlY2lwaWVudCBpcyBpbiBjYXJlIGNpcmNsZVxuICAgICAgY29uc3QgaGFzUGVybWlzc2lvbiA9IGF3YWl0IGNoZWNrUGVybWlzc2lvbihwcmltYXJ5VXNlcklkLCByZWNpcGllbnRJZCwgJ2NhblNlbmRNZXNzYWdlcycpO1xuICAgICAgaWYgKCFoYXNQZXJtaXNzaW9uKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMywgJ1JlY2lwaWVudCBpcyBub3QgaW4geW91ciBjYXJlIGNpcmNsZSBvciBkb2VzIG5vdCBoYXZlIG1lc3NhZ2luZyBwZXJtaXNzaW9uJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIENhcmUgY2lyY2xlIG1lbWJlciBzZW5kaW5nIHRvIHByaW1hcnkgdXNlclxuICAgICAgc2VuZGVySWQgPSByZXF1ZXN0aW5nVXNlcklkO1xuICAgICAgcmVjaXBpZW50SWQgPSBwcmltYXJ5VXNlcklkO1xuICAgICAgXG4gICAgICAvLyBDaGVjayBpZiBzZW5kZXIgaGFzIHBlcm1pc3Npb24gdG8gc2VuZCBtZXNzYWdlc1xuICAgICAgY29uc3QgaGFzUGVybWlzc2lvbiA9IGF3YWl0IGNoZWNrUGVybWlzc2lvbihwcmltYXJ5VXNlcklkLCByZXF1ZXN0aW5nVXNlcklkLCAnY2FuU2VuZE1lc3NhZ2VzJyk7XG4gICAgICBpZiAoIWhhc1Blcm1pc3Npb24pIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAzLCAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gc2VuZCBtZXNzYWdlcyB0byB0aGlzIHVzZXInKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBHZXQgc2VuZGVyIGFuZCByZWNpcGllbnQgaW5mb3JtYXRpb25cbiAgICBjb25zdCBzZW5kZXIgPSBhd2FpdCBnZXRVc2VyKHNlbmRlcklkKTtcbiAgICBjb25zdCByZWNpcGllbnQgPSBhd2FpdCBnZXRVc2VyKHJlY2lwaWVudElkKTtcblxuICAgIGlmICghc2VuZGVyIHx8ICFyZWNpcGllbnQpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwNCwgJ1NlbmRlciBvciByZWNpcGllbnQgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIG1lc3NhZ2VcbiAgICBjb25zdCBtZXNzYWdlSWQgPSBnZW5lcmF0ZU1lc3NhZ2VJZCgpO1xuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG5cbiAgICBjb25zdCBtZXNzYWdlOiBDYXJlQ2lyY2xlTWVzc2FnZSA9IHtcbiAgICAgIG1lc3NhZ2VJZCxcbiAgICAgIHByaW1hcnlVc2VySWQsXG4gICAgICBzZW5kZXJJZCxcbiAgICAgIHJlY2lwaWVudElkLFxuICAgICAgc3ViamVjdDogcmVxdWVzdC5zdWJqZWN0LFxuICAgICAgY29udGVudDogcmVxdWVzdC5jb250ZW50LFxuICAgICAgc2VudEF0OiBub3cudG9JU09TdHJpbmcoKSxcbiAgICAgIHN0YXR1czogJ3NlbnQnLFxuICAgICAgaGVhbHRoRGF0YTogcmVxdWVzdC5oZWFsdGhEYXRhLFxuICAgIH07XG5cbiAgICAvLyBTdG9yZSBtZXNzYWdlIGluIER5bmFtb0RCXG4gICAgYXdhaXQgcHV0SXRlbShUQUJMRVMuQ0FSRV9DSVJDTEVfTUVTU0FHRVMgfHwgJ2hlYWx0aGNhcmUtY2FyZS1jaXJjbGUtbWVzc2FnZXMtZGV2JywgbWVzc2FnZSk7XG5cbiAgICAvLyBTZW5kIG5vdGlmaWNhdGlvbiB0byByZWNpcGllbnRcbiAgICBjb25zdCBzZW5kZXJOYW1lID0gYCR7c2VuZGVyLnByb2ZpbGUuZmlyc3ROYW1lfSAke3NlbmRlci5wcm9maWxlLmxhc3ROYW1lfWA7XG4gICAgY29uc3Qgbm90aWZpY2F0aW9uTWVzc2FnZSA9IHJlcXVlc3Quc3ViamVjdCBcbiAgICAgID8gYCR7c2VuZGVyTmFtZX06ICR7cmVxdWVzdC5zdWJqZWN0fWBcbiAgICAgIDogYCR7c2VuZGVyTmFtZX0gc2VudCB5b3UgYSBtZXNzYWdlYDtcblxuICAgIGF3YWl0IHNlbmROb3RpZmljYXRpb24oe1xuICAgICAgcmVjaXBpZW50OiByZWNpcGllbnRJZCxcbiAgICAgIGFsZXJ0OiB7XG4gICAgICAgIGlkOiBtZXNzYWdlSWQsXG4gICAgICAgIHVzZXJJZDogcmVjaXBpZW50SWQsXG4gICAgICAgIHR5cGU6ICdjaGVja19pbicsXG4gICAgICAgIHNldmVyaXR5OiAnbG93JyxcbiAgICAgICAgbWVzc2FnZTogbm90aWZpY2F0aW9uTWVzc2FnZSxcbiAgICAgICAgdGltZXN0YW1wOiBub3csXG4gICAgICAgIGFja25vd2xlZGdlZDogZmFsc2UsXG4gICAgICAgIGVzY2FsYXRlZDogZmFsc2UsXG4gICAgICB9LFxuICAgICAgY2hhbm5lbHM6IFsncHVzaCcsICdlbWFpbCddLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICBtZXNzYWdlOiAnTWVzc2FnZSBzZW50IHN1Y2Nlc3NmdWxseScsXG4gICAgICBtZXNzYWdlSWQsXG4gICAgICBzZW50QXQ6IG5vdy50b0lTT1N0cmluZygpLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNlbmRpbmcgY2FyZSBjaXJjbGUgbWVzc2FnZTonLCBlcnJvcik7XG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIHNlbmQgbWVzc2FnZScpO1xuICB9XG59XG4iXX0=