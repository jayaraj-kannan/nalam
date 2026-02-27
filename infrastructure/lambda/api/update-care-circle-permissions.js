"use strict";
// Update Care Circle Permissions Lambda Function
// Requirements: 4.5, 8.5
// Updates permissions for a care circle member
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
        // Only the primary user can update permissions
        if (requestingUserId !== primaryUserId) {
            return (0, types_1.createErrorResponse)(403, 'Only the primary user can update care circle permissions');
        }
        // Parse request body
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        // Validate permissions object
        if (!request.permissions) {
            return (0, types_1.createErrorResponse)(400, 'permissions object is required');
        }
        // Update permissions
        await (0, care_circle_1.updateCareCirclePermissions)(primaryUserId, secondaryUserId, request.permissions);
        // Log audit event
        await (0, audit_logger_1.logAuditEvent)({
            userId: primaryUserId,
            action: 'update_care_circle_permissions',
            resourceType: 'care_circle',
            resourceId: `${primaryUserId}:${secondaryUserId}`,
            details: {
                secondaryUserId,
                newPermissions: request.permissions,
            },
            ipAddress: event.requestContext.identity?.sourceIp,
            userAgent: event.requestContext.identity?.userAgent,
        });
        return (0, types_1.createSuccessResponse)({
            message: 'Care circle permissions updated successfully',
            primaryUserId,
            secondaryUserId,
            permissions: request.permissions,
        });
    }
    catch (error) {
        console.error('Error updating care circle permissions:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to update care circle permissions');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWNhcmUtY2lyY2xlLXBlcm1pc3Npb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBkYXRlLWNhcmUtY2lyY2xlLXBlcm1pc3Npb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxpREFBaUQ7QUFDakQseUJBQXlCO0FBQ3pCLCtDQUErQzs7QUFXL0MsMEJBNERDO0FBcEVELDJDQUE0RjtBQUM1RixtRUFBZ0Y7QUFDaEYseURBQXVEO0FBTWhELEtBQUssVUFBVSxPQUFPLENBQUMsS0FBMkI7SUFDdkQsSUFBSSxDQUFDO1FBQ0gsK0NBQStDO1FBQy9DLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO1FBQ25ELE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDO1FBRXZELElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN2QyxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBDQUEwQyxDQUFDLENBQUM7UUFDOUUsQ0FBQztRQUVELDhDQUE4QztRQUM5QyxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUM7UUFDdEUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsK0NBQStDO1FBQy9DLElBQUksZ0JBQWdCLEtBQUssYUFBYSxFQUFFLENBQUM7WUFDdkMsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSwwREFBMEQsQ0FBQyxDQUFDO1FBQzlGLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUE2QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVqRSw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN6QixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVELHFCQUFxQjtRQUNyQixNQUFNLElBQUEseUNBQTJCLEVBQUMsYUFBYSxFQUFFLGVBQWUsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFdkYsa0JBQWtCO1FBQ2xCLE1BQU0sSUFBQSw0QkFBYSxFQUFDO1lBQ2xCLE1BQU0sRUFBRSxhQUFhO1lBQ3JCLE1BQU0sRUFBRSxnQ0FBZ0M7WUFDeEMsWUFBWSxFQUFFLGFBQWE7WUFDM0IsVUFBVSxFQUFFLEdBQUcsYUFBYSxJQUFJLGVBQWUsRUFBRTtZQUNqRCxPQUFPLEVBQUU7Z0JBQ1AsZUFBZTtnQkFDZixjQUFjLEVBQUUsT0FBTyxDQUFDLFdBQVc7YUFDcEM7WUFDRCxTQUFTLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsUUFBUTtZQUNsRCxTQUFTLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsU0FBUztTQUNwRCxDQUFDLENBQUM7UUFFSCxPQUFPLElBQUEsNkJBQXFCLEVBQUM7WUFDM0IsT0FBTyxFQUFFLDhDQUE4QztZQUN2RCxhQUFhO1lBQ2IsZUFBZTtZQUNmLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztTQUNqQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMseUNBQXlDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEUsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSwwQ0FBMEMsQ0FBQyxDQUFDO0lBQzlFLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVXBkYXRlIENhcmUgQ2lyY2xlIFBlcm1pc3Npb25zIExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiA0LjUsIDguNVxuLy8gVXBkYXRlcyBwZXJtaXNzaW9ucyBmb3IgYSBjYXJlIGNpcmNsZSBtZW1iZXJcblxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlLCBQZXJtaXNzaW9uU2V0IH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IHVwZGF0ZUNhcmVDaXJjbGVQZXJtaXNzaW9ucyB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9jYXJlLWNpcmNsZSc7XG5pbXBvcnQgeyBsb2dBdWRpdEV2ZW50IH0gZnJvbSAnLi4vc2hhcmVkL2F1ZGl0LWxvZ2dlcic7XG5cbmludGVyZmFjZSBVcGRhdGVQZXJtaXNzaW9uc1JlcXVlc3Qge1xuICBwZXJtaXNzaW9uczogUGVybWlzc2lvblNldDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgdXNlcklkIGFuZCBtZW1iZXJJZCBmcm9tIHBhdGggcGFyYW1ldGVyc1xuICAgIGNvbnN0IHByaW1hcnlVc2VySWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8udXNlcklkO1xuICAgIGNvbnN0IHNlY29uZGFyeVVzZXJJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5tZW1iZXJJZDtcbiAgICBcbiAgICBpZiAoIXByaW1hcnlVc2VySWQgfHwgIXNlY29uZGFyeVVzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAndXNlcklkIGFuZCBtZW1iZXJJZCBhcmUgcmVxdWlyZWQgaW4gcGF0aCcpO1xuICAgIH1cblxuICAgIC8vIEdldCByZXF1ZXN0aW5nIHVzZXIgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcbiAgICBjb25zdCByZXF1ZXN0aW5nVXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8uY2xhaW1zPy5zdWI7XG4gICAgaWYgKCFyZXF1ZXN0aW5nVXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdVbmF1dGhvcml6ZWQnKTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IHRoZSBwcmltYXJ5IHVzZXIgY2FuIHVwZGF0ZSBwZXJtaXNzaW9uc1xuICAgIGlmIChyZXF1ZXN0aW5nVXNlcklkICE9PSBwcmltYXJ5VXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDMsICdPbmx5IHRoZSBwcmltYXJ5IHVzZXIgY2FuIHVwZGF0ZSBjYXJlIGNpcmNsZSBwZXJtaXNzaW9ucycpO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxuICAgIGlmICghZXZlbnQuYm9keSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVxdWVzdDogVXBkYXRlUGVybWlzc2lvbnNSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcblxuICAgIC8vIFZhbGlkYXRlIHBlcm1pc3Npb25zIG9iamVjdFxuICAgIGlmICghcmVxdWVzdC5wZXJtaXNzaW9ucykge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAncGVybWlzc2lvbnMgb2JqZWN0IGlzIHJlcXVpcmVkJyk7XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHBlcm1pc3Npb25zXG4gICAgYXdhaXQgdXBkYXRlQ2FyZUNpcmNsZVBlcm1pc3Npb25zKHByaW1hcnlVc2VySWQsIHNlY29uZGFyeVVzZXJJZCwgcmVxdWVzdC5wZXJtaXNzaW9ucyk7XG5cbiAgICAvLyBMb2cgYXVkaXQgZXZlbnRcbiAgICBhd2FpdCBsb2dBdWRpdEV2ZW50KHtcbiAgICAgIHVzZXJJZDogcHJpbWFyeVVzZXJJZCxcbiAgICAgIGFjdGlvbjogJ3VwZGF0ZV9jYXJlX2NpcmNsZV9wZXJtaXNzaW9ucycsXG4gICAgICByZXNvdXJjZVR5cGU6ICdjYXJlX2NpcmNsZScsXG4gICAgICByZXNvdXJjZUlkOiBgJHtwcmltYXJ5VXNlcklkfToke3NlY29uZGFyeVVzZXJJZH1gLFxuICAgICAgZGV0YWlsczoge1xuICAgICAgICBzZWNvbmRhcnlVc2VySWQsXG4gICAgICAgIG5ld1Blcm1pc3Npb25zOiByZXF1ZXN0LnBlcm1pc3Npb25zLFxuICAgICAgfSxcbiAgICAgIGlwQWRkcmVzczogZXZlbnQucmVxdWVzdENvbnRleHQuaWRlbnRpdHk/LnNvdXJjZUlwLFxuICAgICAgdXNlckFnZW50OiBldmVudC5yZXF1ZXN0Q29udGV4dC5pZGVudGl0eT8udXNlckFnZW50LFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICBtZXNzYWdlOiAnQ2FyZSBjaXJjbGUgcGVybWlzc2lvbnMgdXBkYXRlZCBzdWNjZXNzZnVsbHknLFxuICAgICAgcHJpbWFyeVVzZXJJZCxcbiAgICAgIHNlY29uZGFyeVVzZXJJZCxcbiAgICAgIHBlcm1pc3Npb25zOiByZXF1ZXN0LnBlcm1pc3Npb25zLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIGNhcmUgY2lyY2xlIHBlcm1pc3Npb25zOicsIGVycm9yKTtcbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdGYWlsZWQgdG8gdXBkYXRlIGNhcmUgY2lyY2xlIHBlcm1pc3Npb25zJyk7XG4gIH1cbn1cbiJdfQ==