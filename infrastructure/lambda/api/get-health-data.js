"use strict";
// Get Health Data API Endpoint with Authorization
// Requirements: 8.4, 8.5 - Authorized health data access with audit logging
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const access_control_1 = require("../shared/access-control");
const users_1 = require("../shared/data-access/users");
const audit_logger_1 = require("../shared/audit-logger");
/**
 * Get health data for a user with permission checks
 * Requirements: 8.4, 8.5 - Secure data access with permissions
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
        // Get data types requested (query parameter)
        const requestedDataTypes = event.queryStringParameters?.dataTypes?.split(',') || [
            'vitals',
            'medications',
            'appointments',
            'healthRecords',
        ];
        // Check permissions for each data type
        const permissionChecks = await Promise.all(requestedDataTypes.map(async (dataType) => {
            const hasPermission = await (0, access_control_1.checkPermission)(requestingUserId, requestingUserType, targetUserId, dataType, 'read');
            return { dataType, hasPermission };
        }));
        // Filter to only allowed data types
        const allowedDataTypes = permissionChecks
            .filter((check) => check.hasPermission)
            .map((check) => check.dataType);
        if (allowedDataTypes.length === 0) {
            await (0, audit_logger_1.logDataAccess)(requestingUserId, requestingUserType, targetUserId, 'all', 'read', false, requestedDataTypes, { reason: 'No permissions for any requested data types' });
            return (0, types_1.createErrorResponse)(403, 'Forbidden: Insufficient permissions');
        }
        // Get user data
        const user = await (0, users_1.getUser)(targetUserId);
        if (!user) {
            return (0, types_1.createErrorResponse)(404, 'User not found');
        }
        // Get effective permissions for filtering
        let permissions;
        if (requestingUserType === 'secondary') {
            permissions = await (0, access_control_1.getEffectivePermissions)(requestingUserId, targetUserId);
            if (!permissions) {
                return (0, types_1.createErrorResponse)(403, 'Forbidden: Not a care circle member');
            }
        }
        else {
            // Primary user accessing own data - full permissions
            permissions = {
                canViewVitals: true,
                canViewMedications: true,
                canViewAppointments: true,
                canViewHealthRecords: true,
                canReceiveAlerts: true,
                canSendMessages: true,
                canManageDevices: true,
            };
        }
        // Filter user data based on permissions
        const filteredData = (0, access_control_1.filterDataByPermissions)(user, permissions, {
            healthProfile: 'healthRecords',
            devices: 'devices',
            preferences: 'healthRecords',
        });
        // Log successful access
        await (0, audit_logger_1.logDataAccess)(requestingUserId, requestingUserType, targetUserId, 'user-data', 'read', true, allowedDataTypes, {
            dataTypesAccessed: allowedDataTypes,
            dataTypesRequested: requestedDataTypes,
        });
        return (0, types_1.createSuccessResponse)({
            userId: targetUserId,
            data: filteredData,
            allowedDataTypes,
            requestedDataTypes,
        });
    }
    catch (error) {
        console.error('Get health data error:', error);
        return (0, types_1.createErrorResponse)(500, 'Internal server error');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWhlYWx0aC1kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWhlYWx0aC1kYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrREFBa0Q7QUFDbEQsNEVBQTRFOztBQVk1RSwwQkF5SEM7QUFsSUQsMkNBQTZFO0FBQzdFLDZEQUE2RztBQUM3Ryx1REFBc0Q7QUFDdEQseURBQXVEO0FBRXZEOzs7R0FHRztBQUNJLEtBQUssVUFBVSxPQUFPLENBQUMsS0FBMkI7SUFDdkQsSUFBSSxDQUFDO1FBQ0gsNENBQTRDO1FBQzVDLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDO1FBQ3RFLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsUUFBbUMsQ0FBQztRQUVoRyxJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzdDLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQsMENBQTBDO1FBQzFDLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO1FBRWxELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELDZDQUE2QztRQUM3QyxNQUFNLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJO1lBQy9FLFFBQVE7WUFDUixhQUFhO1lBQ2IsY0FBYztZQUNkLGVBQWU7U0FDaEIsQ0FBQztRQUVGLHVDQUF1QztRQUN2QyxNQUFNLGdCQUFnQixHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDeEMsa0JBQWtCLENBQUMsR0FB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LElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDM0QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBHZXQgSGVhbHRoIERhdGEgQVBJIEVuZHBvaW50IHdpdGggQXV0aG9yaXphdGlvblxuLy8gUmVxdWlyZW1lbnRzOiA4LjQsIDguNSAtIEF1dGhvcml6ZWQgaGVhbHRoIGRhdGEgYWNjZXNzIHdpdGggYXVkaXQgbG9nZ2luZ1xuXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBjcmVhdGVTdWNjZXNzUmVzcG9uc2UsIGNyZWF0ZUVycm9yUmVzcG9uc2UgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgY2hlY2tQZXJtaXNzaW9uLCBmaWx0ZXJEYXRhQnlQZXJtaXNzaW9ucywgZ2V0RWZmZWN0aXZlUGVybWlzc2lvbnMgfSBmcm9tICcuLi9zaGFyZWQvYWNjZXNzLWNvbnRyb2wnO1xuaW1wb3J0IHsgZ2V0VXNlciB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy91c2Vycyc7XG5pbXBvcnQgeyBsb2dEYXRhQWNjZXNzIH0gZnJvbSAnLi4vc2hhcmVkL2F1ZGl0LWxvZ2dlcic7XG5cbi8qKlxuICogR2V0IGhlYWx0aCBkYXRhIGZvciBhIHVzZXIgd2l0aCBwZXJtaXNzaW9uIGNoZWNrc1xuICogUmVxdWlyZW1lbnRzOiA4LjQsIDguNSAtIFNlY3VyZSBkYXRhIGFjY2VzcyB3aXRoIHBlcm1pc3Npb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgLy8gRXh0cmFjdCB1c2VyIGluZm8gZnJvbSBhdXRob3JpemVyIGNvbnRleHRcbiAgICBjb25zdCByZXF1ZXN0aW5nVXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8ucHJpbmNpcGFsSWQ7XG4gICAgY29uc3QgcmVxdWVzdGluZ1VzZXJUeXBlID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8udXNlclR5cGUgYXMgJ3ByaW1hcnknIHwgJ3NlY29uZGFyeSc7XG4gICAgXG4gICAgaWYgKCFyZXF1ZXN0aW5nVXNlcklkIHx8ICFyZXF1ZXN0aW5nVXNlclR5cGUpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMSwgJ1VuYXV0aG9yaXplZDogTWlzc2luZyB1c2VyIGNvbnRleHQnKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgdGFyZ2V0IHVzZXIgSUQgZnJvbSBwYXRoIHBhcmFtZXRlcnNcbiAgICBjb25zdCB0YXJnZXRVc2VySWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8udXNlcklkO1xuICAgIFxuICAgIGlmICghdGFyZ2V0VXNlcklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdNaXNzaW5nIHVzZXJJZCBwYXJhbWV0ZXInKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgZGF0YSB0eXBlcyByZXF1ZXN0ZWQgKHF1ZXJ5IHBhcmFtZXRlcilcbiAgICBjb25zdCByZXF1ZXN0ZWREYXRhVHlwZXMgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LmRhdGFUeXBlcz8uc3BsaXQoJywnKSB8fCBbXG4gICAgICAndml0YWxzJyxcbiAgICAgICdtZWRpY2F0aW9ucycsXG4gICAgICAnYXBwb2ludG1lbnRzJyxcbiAgICAgICdoZWFsdGhSZWNvcmRzJyxcbiAgICBdO1xuXG4gICAgLy8gQ2hlY2sgcGVybWlzc2lvbnMgZm9yIGVhY2ggZGF0YSB0eXBlXG4gICAgY29uc3QgcGVybWlzc2lvbkNoZWNrcyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgcmVxdWVzdGVkRGF0YVR5cGVzLm1hcChhc3luYyAoZGF0YVR5cGUpID0+IHtcbiAgICAgICAgY29uc3QgaGFzUGVybWlzc2lvbiA9IGF3YWl0IGNoZWNrUGVybWlzc2lvbihcbiAgICAgICAgICByZXF1ZXN0aW5nVXNlcklkLFxuICAgICAgICAgIHJlcXVlc3RpbmdVc2VyVHlwZSxcbiAgICAgICAgICB0YXJnZXRVc2VySWQsXG4gICAgICAgICAgZGF0YVR5cGUgYXMgYW55LFxuICAgICAgICAgICdyZWFkJ1xuICAgICAgICApO1xuICAgICAgICByZXR1cm4geyBkYXRhVHlwZSwgaGFzUGVybWlzc2lvbiB9O1xuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gRmlsdGVyIHRvIG9ubHkgYWxsb3dlZCBkYXRhIHR5cGVzXG4gICAgY29uc3QgYWxsb3dlZERhdGFUeXBlcyA9IHBlcm1pc3Npb25DaGVja3NcbiAgICAgIC5maWx0ZXIoKGNoZWNrKSA9PiBjaGVjay5oYXNQZXJtaXNzaW9uKVxuICAgICAgLm1hcCgoY2hlY2spID0+IGNoZWNrLmRhdGFUeXBlKTtcblxuICAgIGlmIChhbGxvd2VkRGF0YVR5cGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgYXdhaXQgbG9nRGF0YUFjY2VzcyhcbiAgICAgICAgcmVxdWVzdGluZ1VzZXJJZCxcbiAgICAgICAgcmVxdWVzdGluZ1VzZXJUeXBlLFxuICAgICAgICB0YXJnZXRVc2VySWQsXG4gICAgICAgICdhbGwnLFxuICAgICAgICAncmVhZCcsXG4gICAgICAgIGZhbHNlLFxuICAgICAgICByZXF1ZXN0ZWREYXRhVHlwZXMsXG4gICAgICAgIHsgcmVhc29uOiAnTm8gcGVybWlzc2lvbnMgZm9yIGFueSByZXF1ZXN0ZWQgZGF0YSB0eXBlcycgfVxuICAgICAgKTtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMywgJ0ZvcmJpZGRlbjogSW5zdWZmaWNpZW50IHBlcm1pc3Npb25zJyk7XG4gICAgfVxuXG4gICAgLy8gR2V0IHVzZXIgZGF0YVxuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyKHRhcmdldFVzZXJJZCk7XG4gICAgXG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDQsICdVc2VyIG5vdCBmb3VuZCcpO1xuICAgIH1cblxuICAgIC8vIEdldCBlZmZlY3RpdmUgcGVybWlzc2lvbnMgZm9yIGZpbHRlcmluZ1xuICAgIGxldCBwZXJtaXNzaW9ucztcbiAgICBpZiAocmVxdWVzdGluZ1VzZXJUeXBlID09PSAnc2Vjb25kYXJ5Jykge1xuICAgICAgcGVybWlzc2lvbnMgPSBhd2FpdCBnZXRFZmZlY3RpdmVQZXJtaXNzaW9ucyhyZXF1ZXN0aW5nVXNlcklkLCB0YXJnZXRVc2VySWQpO1xuICAgICAgaWYgKCFwZXJtaXNzaW9ucykge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDMsICdGb3JiaWRkZW46IE5vdCBhIGNhcmUgY2lyY2xlIG1lbWJlcicpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBQcmltYXJ5IHVzZXIgYWNjZXNzaW5nIG93biBkYXRhIC0gZnVsbCBwZXJtaXNzaW9uc1xuICAgICAgcGVybWlzc2lvbnMgPSB7XG4gICAgICAgIGNhblZpZXdWaXRhbHM6IHRydWUsXG4gICAgICAgIGNhblZpZXdNZWRpY2F0aW9uczogdHJ1ZSxcbiAgICAgICAgY2FuVmlld0FwcG9pbnRtZW50czogdHJ1ZSxcbiAgICAgICAgY2FuVmlld0hlYWx0aFJlY29yZHM6IHRydWUsXG4gICAgICAgIGNhblJlY2VpdmVBbGVydHM6IHRydWUsXG4gICAgICAgIGNhblNlbmRNZXNzYWdlczogdHJ1ZSxcbiAgICAgICAgY2FuTWFuYWdlRGV2aWNlczogdHJ1ZSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRmlsdGVyIHVzZXIgZGF0YSBiYXNlZCBvbiBwZXJtaXNzaW9uc1xuICAgIGNvbnN0IGZpbHRlcmVkRGF0YSA9IGZpbHRlckRhdGFCeVBlcm1pc3Npb25zKFxuICAgICAgdXNlcixcbiAgICAgIHBlcm1pc3Npb25zLFxuICAgICAge1xuICAgICAgICBoZWFsdGhQcm9maWxlOiAnaGVhbHRoUmVjb3JkcycsXG4gICAgICAgIGRldmljZXM6ICdkZXZpY2VzJyxcbiAgICAgICAgcHJlZmVyZW5jZXM6ICdoZWFsdGhSZWNvcmRzJyxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gTG9nIHN1Y2Nlc3NmdWwgYWNjZXNzXG4gICAgYXdhaXQgbG9nRGF0YUFjY2VzcyhcbiAgICAgIHJlcXVlc3RpbmdVc2VySWQsXG4gICAgICByZXF1ZXN0aW5nVXNlclR5cGUsXG4gICAgICB0YXJnZXRVc2VySWQsXG4gICAgICAndXNlci1kYXRhJyxcbiAgICAgICdyZWFkJyxcbiAgICAgIHRydWUsXG4gICAgICBhbGxvd2VkRGF0YVR5cGVzLFxuICAgICAge1xuICAgICAgICBkYXRhVHlwZXNBY2Nlc3NlZDogYWxsb3dlZERhdGFUeXBlcyxcbiAgICAgICAgZGF0YVR5cGVzUmVxdWVzdGVkOiByZXF1ZXN0ZWREYXRhVHlwZXMsXG4gICAgICB9XG4gICAgKTtcblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgdXNlcklkOiB0YXJnZXRVc2VySWQsXG4gICAgICBkYXRhOiBmaWx0ZXJlZERhdGEsXG4gICAgICBhbGxvd2VkRGF0YVR5cGVzLFxuICAgICAgcmVxdWVzdGVkRGF0YVR5cGVzLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBoZWFsdGggZGF0YSBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyk7XG4gIH1cbn1cbiJdfQ==