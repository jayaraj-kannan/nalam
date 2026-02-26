"use strict";
// Get Medications Lambda Function
// Requirements: 2.4, 4.5
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const medications_1 = require("../shared/data-access/medications");
const access_control_1 = require("../shared/access-control");
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
        // Check if requesting user has permission to view medications
        const hasPermission = await (0, access_control_1.checkPermission)(requestingUserId, 'secondary', userId, 'medications', 'read');
        if (!hasPermission) {
            return (0, types_1.createErrorResponse)(403, 'You do not have permission to view this user\'s medications');
        }
        // Get medications
        const medications = await (0, medications_1.getMedicationsByUser)(userId);
        return (0, types_1.createSuccessResponse)({
            medications,
            count: medications.length,
        });
    }
    catch (error) {
        console.error('Error getting medications:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to retrieve medications');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LW1lZGljYXRpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LW1lZGljYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrQ0FBa0M7QUFDbEMseUJBQXlCOztBQU96QiwwQkFzQ0M7QUExQ0QsMkNBQTZFO0FBQzdFLG1FQUF5RTtBQUN6RSw2REFBMkQ7QUFFcEQsS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUEyQjtJQUN2RCxJQUFJLENBQUM7UUFDSCxrQ0FBa0M7UUFDbEMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7UUFDNUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELDhEQUE4RDtRQUM5RCxNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUEsZ0NBQWUsRUFDekMsZ0JBQWdCLEVBQ2hCLFdBQVcsRUFDWCxNQUFNLEVBQ04sYUFBYSxFQUNiLE1BQU0sQ0FDUCxDQUFDO1FBRUYsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ25CLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsNkRBQTZELENBQUMsQ0FBQztRQUNqRyxDQUFDO1FBRUQsa0JBQWtCO1FBQ2xCLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBQSxrQ0FBb0IsRUFBQyxNQUFNLENBQUMsQ0FBQztRQUV2RCxPQUFPLElBQUEsNkJBQXFCLEVBQUM7WUFDM0IsV0FBVztZQUNYLEtBQUssRUFBRSxXQUFXLENBQUMsTUFBTTtTQUMxQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkQsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gR2V0IE1lZGljYXRpb25zIExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiAyLjQsIDQuNVxuXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBjcmVhdGVTdWNjZXNzUmVzcG9uc2UsIGNyZWF0ZUVycm9yUmVzcG9uc2UgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgZ2V0TWVkaWNhdGlvbnNCeVVzZXIgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvbWVkaWNhdGlvbnMnO1xuaW1wb3J0IHsgY2hlY2tQZXJtaXNzaW9uIH0gZnJvbSAnLi4vc2hhcmVkL2FjY2Vzcy1jb250cm9sJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgdXNlcklkIGZyb20gcGF0aCBwYXJhbWV0ZXJzXG4gICAgY29uc3QgdXNlcklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnVzZXJJZDtcbiAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAndXNlcklkIGlzIHJlcXVpcmVkIGluIHBhdGgnKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgcmVxdWVzdGluZyB1c2VyIGZyb20gYXV0aG9yaXplciBjb250ZXh0XG4gICAgY29uc3QgcmVxdWVzdGluZ1VzZXJJZCA9IGV2ZW50LnJlcXVlc3RDb250ZXh0LmF1dGhvcml6ZXI/LmNsYWltcz8uc3ViO1xuICAgIGlmICghcmVxdWVzdGluZ1VzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAxLCAnVW5hdXRob3JpemVkJyk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgcmVxdWVzdGluZyB1c2VyIGhhcyBwZXJtaXNzaW9uIHRvIHZpZXcgbWVkaWNhdGlvbnNcbiAgICBjb25zdCBoYXNQZXJtaXNzaW9uID0gYXdhaXQgY2hlY2tQZXJtaXNzaW9uKFxuICAgICAgcmVxdWVzdGluZ1VzZXJJZCxcbiAgICAgICdzZWNvbmRhcnknLFxuICAgICAgdXNlcklkLFxuICAgICAgJ21lZGljYXRpb25zJyxcbiAgICAgICdyZWFkJ1xuICAgICk7XG5cbiAgICBpZiAoIWhhc1Blcm1pc3Npb24pIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMywgJ1lvdSBkbyBub3QgaGF2ZSBwZXJtaXNzaW9uIHRvIHZpZXcgdGhpcyB1c2VyXFwncyBtZWRpY2F0aW9ucycpO1xuICAgIH1cblxuICAgIC8vIEdldCBtZWRpY2F0aW9uc1xuICAgIGNvbnN0IG1lZGljYXRpb25zID0gYXdhaXQgZ2V0TWVkaWNhdGlvbnNCeVVzZXIodXNlcklkKTtcblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgbWVkaWNhdGlvbnMsXG4gICAgICBjb3VudDogbWVkaWNhdGlvbnMubGVuZ3RoLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgbWVkaWNhdGlvbnM6JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byByZXRyaWV2ZSBtZWRpY2F0aW9ucycpO1xuICB9XG59XG4iXX0=