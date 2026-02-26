"use strict";
// Update Care Circle Permissions API Endpoint
// Requirements: 8.4, 8.5 - Permission management with audit logging
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const care_circle_1 = require("../shared/data-access/care-circle");
const audit_logger_1 = require("../shared/audit-logger");
/**
 * Update permissions for a care circle member
 * Requirements: 8.5 - Allow primary users to control data sharing
 */
async function handler(event) {
    try {
        // Extract user info from authorizer context
        const requestingUserId = event.requestContext.authorizer?.principalId;
        const requestingUserType = event.requestContext.authorizer?.userType;
        if (!requestingUserId || !requestingUserType) {
            return (0, types_1.createErrorResponse)(401, 'Unauthorized: Missing user context');
        }
        // Only primary users can update permissions for their care circle
        if (requestingUserType !== 'primary') {
            return (0, types_1.createErrorResponse)(403, 'Forbidden: Only primary users can update permissions');
        }
        // Get target secondary user ID from path parameters
        const secondaryUserId = event.pathParameters?.secondaryUserId;
        if (!secondaryUserId) {
            return (0, types_1.createErrorResponse)(400, 'Missing secondaryUserId parameter');
        }
        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const newPermissions = body.permissions;
        if (!newPermissions || typeof newPermissions !== 'object') {
            return (0, types_1.createErrorResponse)(400, 'Invalid permissions object');
        }
        // Validate permission keys
        const validPermissionKeys = [
            'canViewVitals',
            'canViewMedications',
            'canViewAppointments',
            'canViewHealthRecords',
            'canReceiveAlerts',
            'canSendMessages',
            'canManageDevices',
        ];
        const invalidKeys = Object.keys(newPermissions).filter((key) => !validPermissionKeys.includes(key));
        if (invalidKeys.length > 0) {
            return (0, types_1.createErrorResponse)(400, `Invalid permission keys: ${invalidKeys.join(', ')}`);
        }
        // Validate permission values (must be boolean)
        const invalidValues = Object.entries(newPermissions).filter(([_, value]) => typeof value !== 'boolean');
        if (invalidValues.length > 0) {
            return (0, types_1.createErrorResponse)(400, 'Permission values must be boolean');
        }
        // Get current care circle member
        const member = await (0, care_circle_1.getCareCircleMember)(requestingUserId, secondaryUserId);
        if (!member) {
            return (0, types_1.createErrorResponse)(404, 'Care circle member not found');
        }
        // Store old permissions for audit log
        const oldPermissions = { ...member.permissions };
        // Merge new permissions with existing ones
        const updatedPermissions = {
            ...member.permissions,
            ...newPermissions,
        };
        // Update permissions in database
        await (0, care_circle_1.updateCareCirclePermissions)(requestingUserId, secondaryUserId, updatedPermissions);
        // Log permission change for audit trail
        await (0, audit_logger_1.logPermissionChange)(requestingUserId, requestingUserType, secondaryUserId, requestingUserId, oldPermissions, updatedPermissions, {
            relationship: member.relationship,
            changedFields: Object.keys(newPermissions),
        });
        return (0, types_1.createSuccessResponse)({
            message: 'Permissions updated successfully',
            primaryUserId: requestingUserId,
            secondaryUserId,
            oldPermissions,
            newPermissions: updatedPermissions,
            changedFields: Object.keys(newPermissions),
        });
    }
    catch (error) {
        console.error('Update permissions error:', error);
        return (0, types_1.createErrorResponse)(500, 'Internal server error');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXBlcm1pc3Npb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBkYXRlLXBlcm1pc3Npb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw4Q0FBOEM7QUFDOUMsb0VBQW9FOztBQVdwRSwwQkEyR0M7QUFuSEQsMkNBQTRGO0FBQzVGLG1FQUFxRztBQUNyRyx5REFBNkQ7QUFFN0Q7OztHQUdHO0FBQ0ksS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUEyQjtJQUN2RCxJQUFJLENBQUM7UUFDSCw0Q0FBNEM7UUFDNUMsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUM7UUFDdEUsTUFBTSxrQkFBa0IsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxRQUFtQyxDQUFDO1FBRWhHLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDN0MsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCxrRUFBa0U7UUFDbEUsSUFBSSxrQkFBa0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNyQyxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLHNEQUFzRCxDQUFDLENBQUM7UUFDMUYsQ0FBQztRQUVELG9EQUFvRDtRQUNwRCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQztRQUU5RCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDckIsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sY0FBYyxHQUEyQixJQUFJLENBQUMsV0FBVyxDQUFDO1FBRWhFLElBQUksQ0FBQyxjQUFjLElBQUksT0FBTyxjQUFjLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDMUQsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7UUFFRCwyQkFBMkI7UUFDM0IsTUFBTSxtQkFBbUIsR0FBNEI7WUFDbkQsZUFBZTtZQUNmLG9CQUFvQjtZQUNwQixxQkFBcUI7WUFDckIsc0JBQXNCO1lBQ3RCLGtCQUFrQjtZQUNsQixpQkFBaUI7WUFDakIsa0JBQWtCO1NBQ25CLENBQUM7UUFFRixNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sQ0FDcEQsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLEdBQTBCLENBQUMsQ0FDbkUsQ0FBQztRQUVGLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDRCQUE0QixXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4RixDQUFDO1FBRUQsK0NBQStDO1FBQy9DLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxDQUN6RCxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLEtBQUssS0FBSyxTQUFTLENBQzNDLENBQUM7UUFFRixJQUFJLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0IsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7UUFFRCxpQ0FBaUM7UUFDakMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLGlDQUFtQixFQUFDLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRTVFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsOEJBQThCLENBQUMsQ0FBQztRQUNsRSxDQUFDO1FBRUQsc0NBQXNDO1FBQ3RDLE1BQU0sY0FBYyxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFakQsMkNBQTJDO1FBQzNDLE1BQU0sa0JBQWtCLEdBQWtCO1lBQ3hDLEdBQUcsTUFBTSxDQUFDLFdBQVc7WUFDckIsR0FBRyxjQUFjO1NBQ2xCLENBQUM7UUFFRixpQ0FBaUM7UUFDakMsTUFBTSxJQUFBLHlDQUEyQixFQUMvQixnQkFBZ0IsRUFDaEIsZUFBZSxFQUNmLGtCQUFrQixDQUNuQixDQUFDO1FBRUYsd0NBQXdDO1FBQ3hDLE1BQU0sSUFBQSxrQ0FBbUIsRUFDdkIsZ0JBQWdCLEVBQ2hCLGtCQUFrQixFQUNsQixlQUFlLEVBQ2YsZ0JBQWdCLEVBQ2hCLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEI7WUFDRSxZQUFZLEVBQUUsTUFBTSxDQUFDLFlBQVk7WUFDakMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO1NBQzNDLENBQ0YsQ0FBQztRQUVGLE9BQU8sSUFBQSw2QkFBcUIsRUFBQztZQUMzQixPQUFPLEVBQUUsa0NBQWtDO1lBQzNDLGFBQWEsRUFBRSxnQkFBZ0I7WUFDL0IsZUFBZTtZQUNmLGNBQWM7WUFDZCxjQUFjLEVBQUUsa0JBQWtCO1lBQ2xDLGFBQWEsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztTQUMzQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0lBQzNELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVXBkYXRlIENhcmUgQ2lyY2xlIFBlcm1pc3Npb25zIEFQSSBFbmRwb2ludFxuLy8gUmVxdWlyZW1lbnRzOiA4LjQsIDguNSAtIFBlcm1pc3Npb24gbWFuYWdlbWVudCB3aXRoIGF1ZGl0IGxvZ2dpbmdcblxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlLCBQZXJtaXNzaW9uU2V0IH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IGdldENhcmVDaXJjbGVNZW1iZXIsIHVwZGF0ZUNhcmVDaXJjbGVQZXJtaXNzaW9ucyB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy9jYXJlLWNpcmNsZSc7XG5pbXBvcnQgeyBsb2dQZXJtaXNzaW9uQ2hhbmdlIH0gZnJvbSAnLi4vc2hhcmVkL2F1ZGl0LWxvZ2dlcic7XG5cbi8qKlxuICogVXBkYXRlIHBlcm1pc3Npb25zIGZvciBhIGNhcmUgY2lyY2xlIG1lbWJlclxuICogUmVxdWlyZW1lbnRzOiA4LjUgLSBBbGxvdyBwcmltYXJ5IHVzZXJzIHRvIGNvbnRyb2wgZGF0YSBzaGFyaW5nXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgLy8gRXh0cmFjdCB1c2VyIGluZm8gZnJvbSBhdXRob3JpemVyIGNvbnRleHRcbiAgICBjb25zdCByZXF1ZXN0aW5nVXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8ucHJpbmNpcGFsSWQ7XG4gICAgY29uc3QgcmVxdWVzdGluZ1VzZXJUeXBlID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8udXNlclR5cGUgYXMgJ3ByaW1hcnknIHwgJ3NlY29uZGFyeSc7XG4gICAgXG4gICAgaWYgKCFyZXF1ZXN0aW5nVXNlcklkIHx8ICFyZXF1ZXN0aW5nVXNlclR5cGUpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMSwgJ1VuYXV0aG9yaXplZDogTWlzc2luZyB1c2VyIGNvbnRleHQnKTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IHByaW1hcnkgdXNlcnMgY2FuIHVwZGF0ZSBwZXJtaXNzaW9ucyBmb3IgdGhlaXIgY2FyZSBjaXJjbGVcbiAgICBpZiAocmVxdWVzdGluZ1VzZXJUeXBlICE9PSAncHJpbWFyeScpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMywgJ0ZvcmJpZGRlbjogT25seSBwcmltYXJ5IHVzZXJzIGNhbiB1cGRhdGUgcGVybWlzc2lvbnMnKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgdGFyZ2V0IHNlY29uZGFyeSB1c2VyIElEIGZyb20gcGF0aCBwYXJhbWV0ZXJzXG4gICAgY29uc3Qgc2Vjb25kYXJ5VXNlcklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnNlY29uZGFyeVVzZXJJZDtcbiAgICBcbiAgICBpZiAoIXNlY29uZGFyeVVzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnTWlzc2luZyBzZWNvbmRhcnlVc2VySWQgcGFyYW1ldGVyJyk7XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XG4gICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSB8fCAne30nKTtcbiAgICBjb25zdCBuZXdQZXJtaXNzaW9uczogUGFydGlhbDxQZXJtaXNzaW9uU2V0PiA9IGJvZHkucGVybWlzc2lvbnM7XG5cbiAgICBpZiAoIW5ld1Blcm1pc3Npb25zIHx8IHR5cGVvZiBuZXdQZXJtaXNzaW9ucyAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ0ludmFsaWQgcGVybWlzc2lvbnMgb2JqZWN0Jyk7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgcGVybWlzc2lvbiBrZXlzXG4gICAgY29uc3QgdmFsaWRQZXJtaXNzaW9uS2V5czogKGtleW9mIFBlcm1pc3Npb25TZXQpW10gPSBbXG4gICAgICAnY2FuVmlld1ZpdGFscycsXG4gICAgICAnY2FuVmlld01lZGljYXRpb25zJyxcbiAgICAgICdjYW5WaWV3QXBwb2ludG1lbnRzJyxcbiAgICAgICdjYW5WaWV3SGVhbHRoUmVjb3JkcycsXG4gICAgICAnY2FuUmVjZWl2ZUFsZXJ0cycsXG4gICAgICAnY2FuU2VuZE1lc3NhZ2VzJyxcbiAgICAgICdjYW5NYW5hZ2VEZXZpY2VzJyxcbiAgICBdO1xuXG4gICAgY29uc3QgaW52YWxpZEtleXMgPSBPYmplY3Qua2V5cyhuZXdQZXJtaXNzaW9ucykuZmlsdGVyKFxuICAgICAgKGtleSkgPT4gIXZhbGlkUGVybWlzc2lvbktleXMuaW5jbHVkZXMoa2V5IGFzIGtleW9mIFBlcm1pc3Npb25TZXQpXG4gICAgKTtcblxuICAgIGlmIChpbnZhbGlkS2V5cy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsIGBJbnZhbGlkIHBlcm1pc3Npb24ga2V5czogJHtpbnZhbGlkS2V5cy5qb2luKCcsICcpfWApO1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIHBlcm1pc3Npb24gdmFsdWVzIChtdXN0IGJlIGJvb2xlYW4pXG4gICAgY29uc3QgaW52YWxpZFZhbHVlcyA9IE9iamVjdC5lbnRyaWVzKG5ld1Blcm1pc3Npb25zKS5maWx0ZXIoXG4gICAgICAoW18sIHZhbHVlXSkgPT4gdHlwZW9mIHZhbHVlICE9PSAnYm9vbGVhbidcbiAgICApO1xuXG4gICAgaWYgKGludmFsaWRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUGVybWlzc2lvbiB2YWx1ZXMgbXVzdCBiZSBib29sZWFuJyk7XG4gICAgfVxuXG4gICAgLy8gR2V0IGN1cnJlbnQgY2FyZSBjaXJjbGUgbWVtYmVyXG4gICAgY29uc3QgbWVtYmVyID0gYXdhaXQgZ2V0Q2FyZUNpcmNsZU1lbWJlcihyZXF1ZXN0aW5nVXNlcklkLCBzZWNvbmRhcnlVc2VySWQpO1xuICAgIFxuICAgIGlmICghbWVtYmVyKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDQsICdDYXJlIGNpcmNsZSBtZW1iZXIgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgLy8gU3RvcmUgb2xkIHBlcm1pc3Npb25zIGZvciBhdWRpdCBsb2dcbiAgICBjb25zdCBvbGRQZXJtaXNzaW9ucyA9IHsgLi4ubWVtYmVyLnBlcm1pc3Npb25zIH07XG5cbiAgICAvLyBNZXJnZSBuZXcgcGVybWlzc2lvbnMgd2l0aCBleGlzdGluZyBvbmVzXG4gICAgY29uc3QgdXBkYXRlZFBlcm1pc3Npb25zOiBQZXJtaXNzaW9uU2V0ID0ge1xuICAgICAgLi4ubWVtYmVyLnBlcm1pc3Npb25zLFxuICAgICAgLi4ubmV3UGVybWlzc2lvbnMsXG4gICAgfTtcblxuICAgIC8vIFVwZGF0ZSBwZXJtaXNzaW9ucyBpbiBkYXRhYmFzZVxuICAgIGF3YWl0IHVwZGF0ZUNhcmVDaXJjbGVQZXJtaXNzaW9ucyhcbiAgICAgIHJlcXVlc3RpbmdVc2VySWQsXG4gICAgICBzZWNvbmRhcnlVc2VySWQsXG4gICAgICB1cGRhdGVkUGVybWlzc2lvbnNcbiAgICApO1xuXG4gICAgLy8gTG9nIHBlcm1pc3Npb24gY2hhbmdlIGZvciBhdWRpdCB0cmFpbFxuICAgIGF3YWl0IGxvZ1Blcm1pc3Npb25DaGFuZ2UoXG4gICAgICByZXF1ZXN0aW5nVXNlcklkLFxuICAgICAgcmVxdWVzdGluZ1VzZXJUeXBlLFxuICAgICAgc2Vjb25kYXJ5VXNlcklkLFxuICAgICAgcmVxdWVzdGluZ1VzZXJJZCxcbiAgICAgIG9sZFBlcm1pc3Npb25zLFxuICAgICAgdXBkYXRlZFBlcm1pc3Npb25zLFxuICAgICAge1xuICAgICAgICByZWxhdGlvbnNoaXA6IG1lbWJlci5yZWxhdGlvbnNoaXAsXG4gICAgICAgIGNoYW5nZWRGaWVsZHM6IE9iamVjdC5rZXlzKG5ld1Blcm1pc3Npb25zKSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICBtZXNzYWdlOiAnUGVybWlzc2lvbnMgdXBkYXRlZCBzdWNjZXNzZnVsbHknLFxuICAgICAgcHJpbWFyeVVzZXJJZDogcmVxdWVzdGluZ1VzZXJJZCxcbiAgICAgIHNlY29uZGFyeVVzZXJJZCxcbiAgICAgIG9sZFBlcm1pc3Npb25zLFxuICAgICAgbmV3UGVybWlzc2lvbnM6IHVwZGF0ZWRQZXJtaXNzaW9ucyxcbiAgICAgIGNoYW5nZWRGaWVsZHM6IE9iamVjdC5rZXlzKG5ld1Blcm1pc3Npb25zKSxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdVcGRhdGUgcGVybWlzc2lvbnMgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ludGVybmFsIHNlcnZlciBlcnJvcicpO1xuICB9XG59XG4iXX0=