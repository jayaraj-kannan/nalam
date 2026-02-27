"use strict";
// Remove Care Circle Member Lambda Function
// Requirements: 4.1, 8.5
// Removes a member from a primary user's care circle
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const care_circle_1 = require("../shared/data-access/care-circle");
const audit_logger_1 = require("../shared/audit-logger");
async function handler(event) {
    try {
        // Get userId and memberId from path parameters
        const primaryUserId = event.pathParameters?.userId;
        const secondaryUserId = event.pathParameters?.memberId;
        if (!primaryUserId || !secondaryUserId) {
            return (0, types_1.createErrorResponse)(400, 'userId and memberId are required in path');
        }
        // Get requesting user from authorizer context
        const requestingUserId = event.requestContext.authorizer?.claims?.sub;
        if (!requestingUserId) {
            return (0, types_1.createErrorResponse)(401, 'Unauthorized');
        }
        // Only the primary user can remove members from their care circle
        if (requestingUserId !== primaryUserId) {
            return (0, types_1.createErrorResponse)(403, 'Only the primary user can remove care circle members');
        }
        // Remove member from care circle
        await (0, care_circle_1.removeCareCircleMember)(primaryUserId, secondaryUserId);
        // Log audit event
        await (0, audit_logger_1.logAuditEvent)({
            userId: primaryUserId,
            action: 'remove_care_circle_member',
            resourceType: 'care_circle',
            resourceId: `${primaryUserId}:${secondaryUserId}`,
            details: {
                secondaryUserId,
            },
            ipAddress: event.requestContext.identity?.sourceIp,
            userAgent: event.requestContext.identity?.userAgent,
        });
        return (0, types_1.createSuccessResponse)({
            message: 'Care circle member removed successfully',
            primaryUserId,
            secondaryUserId,
        });
    }
    catch (error) {
        console.error('Error removing care circle member:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to remove care circle member');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3ZlLWNhcmUtY2lyY2xlLW1lbWJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlbW92ZS1jYXJlLWNpcmNsZS1tZW1iZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDRDQUE0QztBQUM1Qyx5QkFBeUI7QUFDekIscURBQXFEOztBQU9yRCwwQkE4Q0M7QUFsREQsMkNBQTZFO0FBQzdFLG1FQUEyRTtBQUMzRSx5REFBdUQ7QUFFaEQsS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUEyQjtJQUN2RCxJQUFJLENBQUM7UUFDSCwrQ0FBK0M7UUFDL0MsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7UUFDbkQsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUM7UUFFdkQsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsMENBQTBDLENBQUMsQ0FBQztRQUM5RSxDQUFDO1FBRUQsOENBQThDO1FBQzlDLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQztRQUN0RSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFFRCxrRUFBa0U7UUFDbEUsSUFBSSxnQkFBZ0IsS0FBSyxhQUFhLEVBQUUsQ0FBQztZQUN2QyxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLHNEQUFzRCxDQUFDLENBQUM7UUFDMUYsQ0FBQztRQUVELGlDQUFpQztRQUNqQyxNQUFNLElBQUEsb0NBQXNCLEVBQUMsYUFBYSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRTdELGtCQUFrQjtRQUNsQixNQUFNLElBQUEsNEJBQWEsRUFBQztZQUNsQixNQUFNLEVBQUUsYUFBYTtZQUNyQixNQUFNLEVBQUUsMkJBQTJCO1lBQ25DLFlBQVksRUFBRSxhQUFhO1lBQzNCLFVBQVUsRUFBRSxHQUFHLGFBQWEsSUFBSSxlQUFlLEVBQUU7WUFDakQsT0FBTyxFQUFFO2dCQUNQLGVBQWU7YUFDaEI7WUFDRCxTQUFTLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsUUFBUTtZQUNsRCxTQUFTLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsU0FBUztTQUNwRCxDQUFDLENBQUM7UUFFSCxPQUFPLElBQUEsNkJBQXFCLEVBQUM7WUFDM0IsT0FBTyxFQUFFLHlDQUF5QztZQUNsRCxhQUFhO1lBQ2IsZUFBZTtTQUNoQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0NBQW9DLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0QsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxxQ0FBcUMsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gUmVtb3ZlIENhcmUgQ2lyY2xlIE1lbWJlciBMYW1iZGEgRnVuY3Rpb25cbi8vIFJlcXVpcmVtZW50czogNC4xLCA4LjVcbi8vIFJlbW92ZXMgYSBtZW1iZXIgZnJvbSBhIHByaW1hcnkgdXNlcidzIGNhcmUgY2lyY2xlXG5cbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSwgY3JlYXRlRXJyb3JSZXNwb25zZSB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyByZW1vdmVDYXJlQ2lyY2xlTWVtYmVyIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2NhcmUtY2lyY2xlJztcbmltcG9ydCB7IGxvZ0F1ZGl0RXZlbnQgfSBmcm9tICcuLi9zaGFyZWQvYXVkaXQtbG9nZ2VyJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgdXNlcklkIGFuZCBtZW1iZXJJZCBmcm9tIHBhdGggcGFyYW1ldGVyc1xuICAgIGNvbnN0IHByaW1hcnlVc2VySWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8udXNlcklkO1xuICAgIGNvbnN0IHNlY29uZGFyeVVzZXJJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5tZW1iZXJJZDtcbiAgICBcbiAgICBpZiAoIXByaW1hcnlVc2VySWQgfHwgIXNlY29uZGFyeVVzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAndXNlcklkIGFuZCBtZW1iZXJJZCBhcmUgcmVxdWlyZWQgaW4gcGF0aCcpO1xuICAgIH1cblxuICAgIC8vIEdldCByZXF1ZXN0aW5nIHVzZXIgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcbiAgICBjb25zdCByZXF1ZXN0aW5nVXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8uY2xhaW1zPy5zdWI7XG4gICAgaWYgKCFyZXF1ZXN0aW5nVXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdVbmF1dGhvcml6ZWQnKTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IHRoZSBwcmltYXJ5IHVzZXIgY2FuIHJlbW92ZSBtZW1iZXJzIGZyb20gdGhlaXIgY2FyZSBjaXJjbGVcbiAgICBpZiAocmVxdWVzdGluZ1VzZXJJZCAhPT0gcHJpbWFyeVVzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAzLCAnT25seSB0aGUgcHJpbWFyeSB1c2VyIGNhbiByZW1vdmUgY2FyZSBjaXJjbGUgbWVtYmVycycpO1xuICAgIH1cblxuICAgIC8vIFJlbW92ZSBtZW1iZXIgZnJvbSBjYXJlIGNpcmNsZVxuICAgIGF3YWl0IHJlbW92ZUNhcmVDaXJjbGVNZW1iZXIocHJpbWFyeVVzZXJJZCwgc2Vjb25kYXJ5VXNlcklkKTtcblxuICAgIC8vIExvZyBhdWRpdCBldmVudFxuICAgIGF3YWl0IGxvZ0F1ZGl0RXZlbnQoe1xuICAgICAgdXNlcklkOiBwcmltYXJ5VXNlcklkLFxuICAgICAgYWN0aW9uOiAncmVtb3ZlX2NhcmVfY2lyY2xlX21lbWJlcicsXG4gICAgICByZXNvdXJjZVR5cGU6ICdjYXJlX2NpcmNsZScsXG4gICAgICByZXNvdXJjZUlkOiBgJHtwcmltYXJ5VXNlcklkfToke3NlY29uZGFyeVVzZXJJZH1gLFxuICAgICAgZGV0YWlsczoge1xuICAgICAgICBzZWNvbmRhcnlVc2VySWQsXG4gICAgICB9LFxuICAgICAgaXBBZGRyZXNzOiBldmVudC5yZXF1ZXN0Q29udGV4dC5pZGVudGl0eT8uc291cmNlSXAsXG4gICAgICB1c2VyQWdlbnQ6IGV2ZW50LnJlcXVlc3RDb250ZXh0LmlkZW50aXR5Py51c2VyQWdlbnQsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgIG1lc3NhZ2U6ICdDYXJlIGNpcmNsZSBtZW1iZXIgcmVtb3ZlZCBzdWNjZXNzZnVsbHknLFxuICAgICAgcHJpbWFyeVVzZXJJZCxcbiAgICAgIHNlY29uZGFyeVVzZXJJZCxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZW1vdmluZyBjYXJlIGNpcmNsZSBtZW1iZXI6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byByZW1vdmUgY2FyZSBjaXJjbGUgbWVtYmVyJyk7XG4gIH1cbn1cbiJdfQ==