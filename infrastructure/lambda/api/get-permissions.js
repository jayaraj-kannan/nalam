"use strict";
// Get Care Circle Permissions API Endpoint
// Requirements: 8.4, 8.5 - View permission matrix
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const access_control_1 = require("../shared/access-control");
const care_circle_1 = require("../shared/data-access/care-circle");
const audit_logger_1 = require("../shared/audit-logger");
/**
 * Get permissions for care circle members
 * Requirements: 8.4, 8.5 - View permission matrix
 */
async function handler(event) {
    try {
        // Extract user info from authorizer context
        const requestingUserId = event.requestContext.authorizer?.principalId;
        const requestingUserType = event.requestContext.authorizer?.userType;
        if (!requestingUserId || !requestingUserType) {
            return (0, types_1.createErrorResponse)(401, 'Unauthorized: Missing user context');
        }
        // Get target user ID from path parameters
        const targetUserId = event.pathParameters?.userId;
        if (!targetUserId) {
            return (0, types_1.createErrorResponse)(400, 'Missing userId parameter');
        }
        // Primary users can view their own care circle permissions
        if (requestingUserType === 'primary' && requestingUserId === targetUserId) {
            const members = await (0, care_circle_1.getCareCircleMembers)(requestingUserId);
            const permissionMatrix = members.reduce((matrix, member) => {
                matrix[member.secondaryUserId] = {
                    permissions: member.permissions,
                    relationship: member.relationship,
                    joinedAt: member.joinedAt,
                    lastActive: member.lastActive,
                };
                return matrix;
            }, {});
            await (0, audit_logger_1.logCareCircleAccess)(requestingUserId, requestingUserId, 'view-permission-matrix', true, ['self-access'], { memberCount: members.length });
            return (0, types_1.createSuccessResponse)({
                userId: requestingUserId,
                permissionMatrix,
                memberCount: members.length,
            });
        }
        // Secondary users can view their own permissions for a primary user
        if (requestingUserType === 'secondary') {
            const permissions = await (0, access_control_1.getEffectivePermissions)(requestingUserId, targetUserId);
            if (!permissions) {
                return (0, types_1.createErrorResponse)(403, 'Forbidden: Not a care circle member');
            }
            return (0, types_1.createSuccessResponse)({
                primaryUserId: targetUserId,
                secondaryUserId: requestingUserId,
                permissions,
            });
        }
        return (0, types_1.createErrorResponse)(403, 'Forbidden: Cannot view other users\' permissions');
    }
    catch (error) {
        console.error('Get permissions error:', error);
        return (0, types_1.createErrorResponse)(500, 'Internal server error');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXBlcm1pc3Npb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXBlcm1pc3Npb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwyQ0FBMkM7QUFDM0Msa0RBQWtEOztBQVlsRCwwQkFtRUM7QUE1RUQsMkNBQTZFO0FBQzdFLDZEQUFtRTtBQUNuRSxtRUFBeUU7QUFDekUseURBQTZEO0FBRTdEOzs7R0FHRztBQUNJLEtBQUssVUFBVSxPQUFPLENBQUMsS0FBMkI7SUFDdkQsSUFBSSxDQUFDO1FBQ0gsNENBQTRDO1FBQzVDLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDO1FBQ3RFLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsUUFBbUMsQ0FBQztRQUVoRyxJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzdDLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQsMENBQTBDO1FBQzFDLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO1FBRWxELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELDJEQUEyRDtRQUMzRCxJQUFJLGtCQUFrQixLQUFLLFNBQVMsSUFBSSxnQkFBZ0IsS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUMxRSxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUEsa0NBQW9CLEVBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUU3RCxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ3pELE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUc7b0JBQy9CLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVztvQkFDL0IsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZO29CQUNqQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7b0JBQ3pCLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVTtpQkFDOUIsQ0FBQztnQkFDRixPQUFPLE1BQU0sQ0FBQztZQUNoQixDQUFDLEVBQUUsRUFBeUIsQ0FBQyxDQUFDO1lBRTlCLE1BQU0sSUFBQSxrQ0FBbUIsRUFDdkIsZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQix3QkFBd0IsRUFDeEIsSUFBSSxFQUNKLENBQUMsYUFBYSxDQUFDLEVBQ2YsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUNoQyxDQUFDO1lBRUYsT0FBTyxJQUFBLDZCQUFxQixFQUFDO2dCQUMzQixNQUFNLEVBQUUsZ0JBQWdCO2dCQUN4QixnQkFBZ0I7Z0JBQ2hCLFdBQVcsRUFBRSxPQUFPLENBQUMsTUFBTTthQUM1QixDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsb0VBQW9FO1FBQ3BFLElBQUksa0JBQWtCLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDdkMsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFBLHdDQUF1QixFQUFDLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxDQUFDO1lBRWxGLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDakIsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxxQ0FBcUMsQ0FBQyxDQUFDO1lBQ3pFLENBQUM7WUFFRCxPQUFPLElBQUEsNkJBQXFCLEVBQUM7Z0JBQzNCLGFBQWEsRUFBRSxZQUFZO2dCQUMzQixlQUFlLEVBQUUsZ0JBQWdCO2dCQUNqQyxXQUFXO2FBQ1osQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsa0RBQWtELENBQUMsQ0FBQztJQUN0RixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0MsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0lBQzNELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gR2V0IENhcmUgQ2lyY2xlIFBlcm1pc3Npb25zIEFQSSBFbmRwb2ludFxuLy8gUmVxdWlyZW1lbnRzOiA4LjQsIDguNSAtIFZpZXcgcGVybWlzc2lvbiBtYXRyaXhcblxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlIH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IGdldEVmZmVjdGl2ZVBlcm1pc3Npb25zIH0gZnJvbSAnLi4vc2hhcmVkL2FjY2Vzcy1jb250cm9sJztcbmltcG9ydCB7IGdldENhcmVDaXJjbGVNZW1iZXJzIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2NhcmUtY2lyY2xlJztcbmltcG9ydCB7IGxvZ0NhcmVDaXJjbGVBY2Nlc3MgfSBmcm9tICcuLi9zaGFyZWQvYXVkaXQtbG9nZ2VyJztcblxuLyoqXG4gKiBHZXQgcGVybWlzc2lvbnMgZm9yIGNhcmUgY2lyY2xlIG1lbWJlcnNcbiAqIFJlcXVpcmVtZW50czogOC40LCA4LjUgLSBWaWV3IHBlcm1pc3Npb24gbWF0cml4XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgLy8gRXh0cmFjdCB1c2VyIGluZm8gZnJvbSBhdXRob3JpemVyIGNvbnRleHRcbiAgICBjb25zdCByZXF1ZXN0aW5nVXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8ucHJpbmNpcGFsSWQ7XG4gICAgY29uc3QgcmVxdWVzdGluZ1VzZXJUeXBlID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8udXNlclR5cGUgYXMgJ3ByaW1hcnknIHwgJ3NlY29uZGFyeSc7XG4gICAgXG4gICAgaWYgKCFyZXF1ZXN0aW5nVXNlcklkIHx8ICFyZXF1ZXN0aW5nVXNlclR5cGUpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMSwgJ1VuYXV0aG9yaXplZDogTWlzc2luZyB1c2VyIGNvbnRleHQnKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgdGFyZ2V0IHVzZXIgSUQgZnJvbSBwYXRoIHBhcmFtZXRlcnNcbiAgICBjb25zdCB0YXJnZXRVc2VySWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8udXNlcklkO1xuICAgIFxuICAgIGlmICghdGFyZ2V0VXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdNaXNzaW5nIHVzZXJJZCBwYXJhbWV0ZXInKTtcbiAgICB9XG5cbiAgICAvLyBQcmltYXJ5IHVzZXJzIGNhbiB2aWV3IHRoZWlyIG93biBjYXJlIGNpcmNsZSBwZXJtaXNzaW9uc1xuICAgIGlmIChyZXF1ZXN0aW5nVXNlclR5cGUgPT09ICdwcmltYXJ5JyAmJiByZXF1ZXN0aW5nVXNlcklkID09PSB0YXJnZXRVc2VySWQpIHtcbiAgICAgIGNvbnN0IG1lbWJlcnMgPSBhd2FpdCBnZXRDYXJlQ2lyY2xlTWVtYmVycyhyZXF1ZXN0aW5nVXNlcklkKTtcbiAgICAgIFxuICAgICAgY29uc3QgcGVybWlzc2lvbk1hdHJpeCA9IG1lbWJlcnMucmVkdWNlKChtYXRyaXgsIG1lbWJlcikgPT4ge1xuICAgICAgICBtYXRyaXhbbWVtYmVyLnNlY29uZGFyeVVzZXJJZF0gPSB7XG4gICAgICAgICAgcGVybWlzc2lvbnM6IG1lbWJlci5wZXJtaXNzaW9ucyxcbiAgICAgICAgICByZWxhdGlvbnNoaXA6IG1lbWJlci5yZWxhdGlvbnNoaXAsXG4gICAgICAgICAgam9pbmVkQXQ6IG1lbWJlci5qb2luZWRBdCxcbiAgICAgICAgICBsYXN0QWN0aXZlOiBtZW1iZXIubGFzdEFjdGl2ZSxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG1hdHJpeDtcbiAgICAgIH0sIHt9IGFzIFJlY29yZDxzdHJpbmcsIGFueT4pO1xuXG4gICAgICBhd2FpdCBsb2dDYXJlQ2lyY2xlQWNjZXNzKFxuICAgICAgICByZXF1ZXN0aW5nVXNlcklkLFxuICAgICAgICByZXF1ZXN0aW5nVXNlcklkLFxuICAgICAgICAndmlldy1wZXJtaXNzaW9uLW1hdHJpeCcsXG4gICAgICAgIHRydWUsXG4gICAgICAgIFsnc2VsZi1hY2Nlc3MnXSxcbiAgICAgICAgeyBtZW1iZXJDb3VudDogbWVtYmVycy5sZW5ndGggfVxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgIHVzZXJJZDogcmVxdWVzdGluZ1VzZXJJZCxcbiAgICAgICAgcGVybWlzc2lvbk1hdHJpeCxcbiAgICAgICAgbWVtYmVyQ291bnQ6IG1lbWJlcnMubGVuZ3RoLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gU2Vjb25kYXJ5IHVzZXJzIGNhbiB2aWV3IHRoZWlyIG93biBwZXJtaXNzaW9ucyBmb3IgYSBwcmltYXJ5IHVzZXJcbiAgICBpZiAocmVxdWVzdGluZ1VzZXJUeXBlID09PSAnc2Vjb25kYXJ5Jykge1xuICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSBhd2FpdCBnZXRFZmZlY3RpdmVQZXJtaXNzaW9ucyhyZXF1ZXN0aW5nVXNlcklkLCB0YXJnZXRVc2VySWQpO1xuICAgICAgXG4gICAgICBpZiAoIXBlcm1pc3Npb25zKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMywgJ0ZvcmJpZGRlbjogTm90IGEgY2FyZSBjaXJjbGUgbWVtYmVyJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICBwcmltYXJ5VXNlcklkOiB0YXJnZXRVc2VySWQsXG4gICAgICAgIHNlY29uZGFyeVVzZXJJZDogcmVxdWVzdGluZ1VzZXJJZCxcbiAgICAgICAgcGVybWlzc2lvbnMsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDMsICdGb3JiaWRkZW46IENhbm5vdCB2aWV3IG90aGVyIHVzZXJzXFwnIHBlcm1pc3Npb25zJyk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignR2V0IHBlcm1pc3Npb25zIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InKTtcbiAgfVxufVxuIl19