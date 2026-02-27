"use strict";
// Add Care Circle Member Lambda Function
// Requirements: 4.1, 4.5
// Adds a new member to a primary user's care circle
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const care_circle_1 = require("../shared/data-access/care-circle");
const users_1 = require("../shared/data-access/users");
const audit_logger_1 = require("../shared/audit-logger");
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
        // Only the primary user can add members to their care circle
        if (requestingUserId !== primaryUserId) {
            return (0, types_1.createErrorResponse)(403, 'Only the primary user can add care circle members');
        }
        // Parse request body
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.secondaryUserId || !request.relationship || !request.permissions) {
            return (0, types_1.createErrorResponse)(400, 'secondaryUserId, relationship, and permissions are required');
        }
        // Verify secondary user exists
        const secondaryUser = await (0, users_1.getUser)(request.secondaryUserId);
        if (!secondaryUser) {
            return (0, types_1.createErrorResponse)(404, 'Secondary user not found');
        }
        // Add member to care circle
        await (0, care_circle_1.addCareCircleMember)(primaryUserId, request.secondaryUserId, request.relationship, request.permissions);
        // Log audit event
        await (0, audit_logger_1.logAuditEvent)({
            userId: primaryUserId,
            action: 'add_care_circle_member',
            resourceType: 'care_circle',
            resourceId: `${primaryUserId}:${request.secondaryUserId}`,
            details: {
                secondaryUserId: request.secondaryUserId,
                relationship: request.relationship,
                permissions: request.permissions,
            },
            ipAddress: event.requestContext.identity?.sourceIp,
            userAgent: event.requestContext.identity?.userAgent,
        });
        return (0, types_1.createSuccessResponse)({
            message: 'Care circle member added successfully',
            primaryUserId,
            secondaryUserId: request.secondaryUserId,
            relationship: request.relationship,
        });
    }
    catch (error) {
        console.error('Error adding care circle member:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to add care circle member');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLWNhcmUtY2lyY2xlLW1lbWJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFkZC1jYXJlLWNpcmNsZS1tZW1iZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHlDQUF5QztBQUN6Qyx5QkFBeUI7QUFDekIsb0RBQW9EOztBQWNwRCwwQkFzRUM7QUFqRkQsMkNBQThHO0FBQzlHLG1FQUF3RTtBQUN4RSx1REFBc0Q7QUFDdEQseURBQXVEO0FBUWhELEtBQUssVUFBVSxPQUFPLENBQUMsS0FBMkI7SUFDdkQsSUFBSSxDQUFDO1FBQ0gsa0NBQWtDO1FBQ2xDLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO1FBQ25ELElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNuQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELDhDQUE4QztRQUM5QyxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUM7UUFDdEUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsNkRBQTZEO1FBQzdELElBQUksZ0JBQWdCLEtBQUssYUFBYSxFQUFFLENBQUM7WUFDdkMsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxtREFBbUQsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFxQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6RCwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzlFLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsNkRBQTZELENBQUMsQ0FBQztRQUNqRyxDQUFDO1FBRUQsK0JBQStCO1FBQy9CLE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBQSxlQUFPLEVBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNuQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELDRCQUE0QjtRQUM1QixNQUFNLElBQUEsaUNBQW1CLEVBQ3ZCLGFBQWEsRUFDYixPQUFPLENBQUMsZUFBZSxFQUN2QixPQUFPLENBQUMsWUFBWSxFQUNwQixPQUFPLENBQUMsV0FBVyxDQUNwQixDQUFDO1FBRUYsa0JBQWtCO1FBQ2xCLE1BQU0sSUFBQSw0QkFBYSxFQUFDO1lBQ2xCLE1BQU0sRUFBRSxhQUFhO1lBQ3JCLE1BQU0sRUFBRSx3QkFBd0I7WUFDaEMsWUFBWSxFQUFFLGFBQWE7WUFDM0IsVUFBVSxFQUFFLEdBQUcsYUFBYSxJQUFJLE9BQU8sQ0FBQyxlQUFlLEVBQUU7WUFDekQsT0FBTyxFQUFFO2dCQUNQLGVBQWUsRUFBRSxPQUFPLENBQUMsZUFBZTtnQkFDeEMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxZQUFZO2dCQUNsQyxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7YUFDakM7WUFDRCxTQUFTLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsUUFBUTtZQUNsRCxTQUFTLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsU0FBUztTQUNwRCxDQUFDLENBQUM7UUFFSCxPQUFPLElBQUEsNkJBQXFCLEVBQUM7WUFDM0IsT0FBTyxFQUFFLHVDQUF1QztZQUNoRCxhQUFhO1lBQ2IsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlO1lBQ3hDLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWTtTQUNuQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQWRkIENhcmUgQ2lyY2xlIE1lbWJlciBMYW1iZGEgRnVuY3Rpb25cbi8vIFJlcXVpcmVtZW50czogNC4xLCA0LjVcbi8vIEFkZHMgYSBuZXcgbWVtYmVyIHRvIGEgcHJpbWFyeSB1c2VyJ3MgY2FyZSBjaXJjbGVcblxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlLCBSZWxhdGlvbnNoaXBUeXBlLCBQZXJtaXNzaW9uU2V0IH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IGFkZENhcmVDaXJjbGVNZW1iZXIgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvY2FyZS1jaXJjbGUnO1xuaW1wb3J0IHsgZ2V0VXNlciB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy91c2Vycyc7XG5pbXBvcnQgeyBsb2dBdWRpdEV2ZW50IH0gZnJvbSAnLi4vc2hhcmVkL2F1ZGl0LWxvZ2dlcic7XG5cbmludGVyZmFjZSBBZGRNZW1iZXJSZXF1ZXN0IHtcbiAgc2Vjb25kYXJ5VXNlcklkOiBzdHJpbmc7XG4gIHJlbGF0aW9uc2hpcDogUmVsYXRpb25zaGlwVHlwZTtcbiAgcGVybWlzc2lvbnM6IFBlcm1pc3Npb25TZXQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IHVzZXJJZCBmcm9tIHBhdGggcGFyYW1ldGVyc1xuICAgIGNvbnN0IHByaW1hcnlVc2VySWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8udXNlcklkO1xuICAgIGlmICghcHJpbWFyeVVzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAndXNlcklkIGlzIHJlcXVpcmVkIGluIHBhdGgnKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgcmVxdWVzdGluZyB1c2VyIGZyb20gYXV0aG9yaXplciBjb250ZXh0XG4gICAgY29uc3QgcmVxdWVzdGluZ1VzZXJJZCA9IGV2ZW50LnJlcXVlc3RDb250ZXh0LmF1dGhvcml6ZXI/LmNsYWltcz8uc3ViO1xuICAgIGlmICghcmVxdWVzdGluZ1VzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAxLCAnVW5hdXRob3JpemVkJyk7XG4gICAgfVxuXG4gICAgLy8gT25seSB0aGUgcHJpbWFyeSB1c2VyIGNhbiBhZGQgbWVtYmVycyB0byB0aGVpciBjYXJlIGNpcmNsZVxuICAgIGlmIChyZXF1ZXN0aW5nVXNlcklkICE9PSBwcmltYXJ5VXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDMsICdPbmx5IHRoZSBwcmltYXJ5IHVzZXIgY2FuIGFkZCBjYXJlIGNpcmNsZSBtZW1iZXJzJyk7XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XG4gICAgaWYgKCFldmVudC5ib2R5KSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXF1ZXN0OiBBZGRNZW1iZXJSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcblxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgIGlmICghcmVxdWVzdC5zZWNvbmRhcnlVc2VySWQgfHwgIXJlcXVlc3QucmVsYXRpb25zaGlwIHx8ICFyZXF1ZXN0LnBlcm1pc3Npb25zKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdzZWNvbmRhcnlVc2VySWQsIHJlbGF0aW9uc2hpcCwgYW5kIHBlcm1pc3Npb25zIGFyZSByZXF1aXJlZCcpO1xuICAgIH1cblxuICAgIC8vIFZlcmlmeSBzZWNvbmRhcnkgdXNlciBleGlzdHNcbiAgICBjb25zdCBzZWNvbmRhcnlVc2VyID0gYXdhaXQgZ2V0VXNlcihyZXF1ZXN0LnNlY29uZGFyeVVzZXJJZCk7XG4gICAgaWYgKCFzZWNvbmRhcnlVc2VyKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDQsICdTZWNvbmRhcnkgdXNlciBub3QgZm91bmQnKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgbWVtYmVyIHRvIGNhcmUgY2lyY2xlXG4gICAgYXdhaXQgYWRkQ2FyZUNpcmNsZU1lbWJlcihcbiAgICAgIHByaW1hcnlVc2VySWQsXG4gICAgICByZXF1ZXN0LnNlY29uZGFyeVVzZXJJZCxcbiAgICAgIHJlcXVlc3QucmVsYXRpb25zaGlwLFxuICAgICAgcmVxdWVzdC5wZXJtaXNzaW9uc1xuICAgICk7XG5cbiAgICAvLyBMb2cgYXVkaXQgZXZlbnRcbiAgICBhd2FpdCBsb2dBdWRpdEV2ZW50KHtcbiAgICAgIHVzZXJJZDogcHJpbWFyeVVzZXJJZCxcbiAgICAgIGFjdGlvbjogJ2FkZF9jYXJlX2NpcmNsZV9tZW1iZXInLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnY2FyZV9jaXJjbGUnLFxuICAgICAgcmVzb3VyY2VJZDogYCR7cHJpbWFyeVVzZXJJZH06JHtyZXF1ZXN0LnNlY29uZGFyeVVzZXJJZH1gLFxuICAgICAgZGV0YWlsczoge1xuICAgICAgICBzZWNvbmRhcnlVc2VySWQ6IHJlcXVlc3Quc2Vjb25kYXJ5VXNlcklkLFxuICAgICAgICByZWxhdGlvbnNoaXA6IHJlcXVlc3QucmVsYXRpb25zaGlwLFxuICAgICAgICBwZXJtaXNzaW9uczogcmVxdWVzdC5wZXJtaXNzaW9ucyxcbiAgICAgIH0sXG4gICAgICBpcEFkZHJlc3M6IGV2ZW50LnJlcXVlc3RDb250ZXh0LmlkZW50aXR5Py5zb3VyY2VJcCxcbiAgICAgIHVzZXJBZ2VudDogZXZlbnQucmVxdWVzdENvbnRleHQuaWRlbnRpdHk/LnVzZXJBZ2VudCxcbiAgICB9KTtcblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgbWVzc2FnZTogJ0NhcmUgY2lyY2xlIG1lbWJlciBhZGRlZCBzdWNjZXNzZnVsbHknLFxuICAgICAgcHJpbWFyeVVzZXJJZCxcbiAgICAgIHNlY29uZGFyeVVzZXJJZDogcmVxdWVzdC5zZWNvbmRhcnlVc2VySWQsXG4gICAgICByZWxhdGlvbnNoaXA6IHJlcXVlc3QucmVsYXRpb25zaGlwLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGFkZGluZyBjYXJlIGNpcmNsZSBtZW1iZXI6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byBhZGQgY2FyZSBjaXJjbGUgbWVtYmVyJyk7XG4gIH1cbn1cbiJdfQ==