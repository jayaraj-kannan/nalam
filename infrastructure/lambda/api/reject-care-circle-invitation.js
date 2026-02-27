"use strict";
// Reject Care Circle Invitation Lambda Function
// Requirements: 4.1
// Rejects a care circle invitation
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const dynamodb_client_1 = require("../shared/dynamodb-client");
const audit_logger_1 = require("../shared/audit-logger");
async function handler(event) {
    try {
        // Get invitationId from path parameters
        const invitationId = event.pathParameters?.invitationId;
        if (!invitationId) {
            return (0, types_1.createErrorResponse)(400, 'invitationId is required in path');
        }
        // Get requesting user from authorizer context
        const requestingUserId = event.requestContext.authorizer?.claims?.sub;
        const requestingUserEmail = event.requestContext.authorizer?.claims?.email;
        if (!requestingUserId || !requestingUserEmail) {
            return (0, types_1.createErrorResponse)(401, 'Unauthorized');
        }
        // Get invitation from DynamoDB
        const invitation = await (0, dynamodb_client_1.getItem)(dynamodb_client_1.TABLES.CARE_CIRCLE_INVITATIONS || 'healthcare-care-circle-invitations-dev', { invitationId });
        if (!invitation) {
            return (0, types_1.createErrorResponse)(404, 'Invitation not found');
        }
        // Check if invitation is for the requesting user
        if (invitation.email.toLowerCase() !== requestingUserEmail.toLowerCase()) {
            return (0, types_1.createErrorResponse)(403, 'This invitation is not for you');
        }
        // Check if invitation is still pending
        if (invitation.status !== 'pending') {
            return (0, types_1.createErrorResponse)(400, `Invitation has already been ${invitation.status}`);
        }
        // Update invitation status to rejected
        const now = new Date();
        await (0, dynamodb_client_1.updateItem)(dynamodb_client_1.TABLES.CARE_CIRCLE_INVITATIONS || 'healthcare-care-circle-invitations-dev', { invitationId }, 'SET #status = :status, rejectedAt = :rejectedAt, rejectedBy = :rejectedBy', {
            ':status': 'rejected',
            ':rejectedAt': now.toISOString(),
            ':rejectedBy': requestingUserId,
        }, { '#status': 'status' });
        // Log audit event
        await (0, audit_logger_1.logAuditEvent)({
            userId: requestingUserId,
            action: 'reject_care_circle_invitation',
            resourceType: 'care_circle_invitation',
            resourceId: invitationId,
            details: {
                primaryUserId: invitation.primaryUserId,
            },
            ipAddress: event.requestContext.identity?.sourceIp,
            userAgent: event.requestContext.identity?.userAgent,
        });
        return (0, types_1.createSuccessResponse)({
            message: 'Invitation rejected successfully',
            invitationId,
        });
    }
    catch (error) {
        console.error('Error rejecting care circle invitation:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to reject invitation');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVqZWN0LWNhcmUtY2lyY2xlLWludml0YXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWplY3QtY2FyZS1jaXJjbGUtaW52aXRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsZ0RBQWdEO0FBQ2hELG9CQUFvQjtBQUNwQixtQ0FBbUM7O0FBZW5DLDBCQXVFQztBQW5GRCwyQ0FBNkU7QUFDN0UsK0RBQXdFO0FBQ3hFLHlEQUF1RDtBQVVoRCxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQTJCO0lBQ3ZELElBQUksQ0FBQztRQUNILHdDQUF3QztRQUN4QyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQztRQUN4RCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbEIsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDO1FBQ3RFLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQztRQUUzRSxJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzlDLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELCtCQUErQjtRQUMvQixNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUEseUJBQU8sRUFDOUIsd0JBQU0sQ0FBQyx1QkFBdUIsSUFBSSx3Q0FBd0MsRUFDMUUsRUFBRSxZQUFZLEVBQUUsQ0FDakIsQ0FBQztRQUVGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUVELGlEQUFpRDtRQUNqRCxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssbUJBQW1CLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUN6RSxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVELHVDQUF1QztRQUN2QyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDcEMsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSwrQkFBK0IsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUVELHVDQUF1QztRQUN2QyxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sSUFBQSw0QkFBVSxFQUNkLHdCQUFNLENBQUMsdUJBQXVCLElBQUksd0NBQXdDLEVBQzFFLEVBQUUsWUFBWSxFQUFFLEVBQ2hCLDJFQUEyRSxFQUMzRTtZQUNFLFNBQVMsRUFBRSxVQUFVO1lBQ3JCLGFBQWEsRUFBRSxHQUFHLENBQUMsV0FBVyxFQUFFO1lBQ2hDLGFBQWEsRUFBRSxnQkFBZ0I7U0FDaEMsRUFDRCxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FDeEIsQ0FBQztRQUVGLGtCQUFrQjtRQUNsQixNQUFNLElBQUEsNEJBQWEsRUFBQztZQUNsQixNQUFNLEVBQUUsZ0JBQWdCO1lBQ3hCLE1BQU0sRUFBRSwrQkFBK0I7WUFDdkMsWUFBWSxFQUFFLHdCQUF3QjtZQUN0QyxVQUFVLEVBQUUsWUFBWTtZQUN4QixPQUFPLEVBQUU7Z0JBQ1AsYUFBYSxFQUFFLFVBQVUsQ0FBQyxhQUFhO2FBQ3hDO1lBQ0QsU0FBUyxFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFFBQVE7WUFDbEQsU0FBUyxFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFNBQVM7U0FDcEQsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFBLDZCQUFxQixFQUFDO1lBQzNCLE9BQU8sRUFBRSxrQ0FBa0M7WUFDM0MsWUFBWTtTQUNiLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRSxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDZCQUE2QixDQUFDLENBQUM7SUFDakUsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBSZWplY3QgQ2FyZSBDaXJjbGUgSW52aXRhdGlvbiBMYW1iZGEgRnVuY3Rpb25cbi8vIFJlcXVpcmVtZW50czogNC4xXG4vLyBSZWplY3RzIGEgY2FyZSBjaXJjbGUgaW52aXRhdGlvblxuXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBjcmVhdGVTdWNjZXNzUmVzcG9uc2UsIGNyZWF0ZUVycm9yUmVzcG9uc2UgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgVEFCTEVTLCBnZXRJdGVtLCB1cGRhdGVJdGVtIH0gZnJvbSAnLi4vc2hhcmVkL2R5bmFtb2RiLWNsaWVudCc7XG5pbXBvcnQgeyBsb2dBdWRpdEV2ZW50IH0gZnJvbSAnLi4vc2hhcmVkL2F1ZGl0LWxvZ2dlcic7XG5cbmludGVyZmFjZSBDYXJlQ2lyY2xlSW52aXRhdGlvbiB7XG4gIGludml0YXRpb25JZDogc3RyaW5nO1xuICBwcmltYXJ5VXNlcklkOiBzdHJpbmc7XG4gIGVtYWlsOiBzdHJpbmc7XG4gIHN0YXR1czogJ3BlbmRpbmcnIHwgJ2FjY2VwdGVkJyB8ICdyZWplY3RlZCcgfCAnZXhwaXJlZCc7XG4gIGV4cGlyZXNBdDogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xuICB0cnkge1xuICAgIC8vIEdldCBpbnZpdGF0aW9uSWQgZnJvbSBwYXRoIHBhcmFtZXRlcnNcbiAgICBjb25zdCBpbnZpdGF0aW9uSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uaW52aXRhdGlvbklkO1xuICAgIGlmICghaW52aXRhdGlvbklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdpbnZpdGF0aW9uSWQgaXMgcmVxdWlyZWQgaW4gcGF0aCcpO1xuICAgIH1cblxuICAgIC8vIEdldCByZXF1ZXN0aW5nIHVzZXIgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcbiAgICBjb25zdCByZXF1ZXN0aW5nVXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8uY2xhaW1zPy5zdWI7XG4gICAgY29uc3QgcmVxdWVzdGluZ1VzZXJFbWFpbCA9IGV2ZW50LnJlcXVlc3RDb250ZXh0LmF1dGhvcml6ZXI/LmNsYWltcz8uZW1haWw7XG4gICAgXG4gICAgaWYgKCFyZXF1ZXN0aW5nVXNlcklkIHx8ICFyZXF1ZXN0aW5nVXNlckVtYWlsKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdVbmF1dGhvcml6ZWQnKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgaW52aXRhdGlvbiBmcm9tIER5bmFtb0RCXG4gICAgY29uc3QgaW52aXRhdGlvbiA9IGF3YWl0IGdldEl0ZW08Q2FyZUNpcmNsZUludml0YXRpb24+KFxuICAgICAgVEFCTEVTLkNBUkVfQ0lSQ0xFX0lOVklUQVRJT05TIHx8ICdoZWFsdGhjYXJlLWNhcmUtY2lyY2xlLWludml0YXRpb25zLWRldicsXG4gICAgICB7IGludml0YXRpb25JZCB9XG4gICAgKTtcblxuICAgIGlmICghaW52aXRhdGlvbikge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA0LCAnSW52aXRhdGlvbiBub3QgZm91bmQnKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBpbnZpdGF0aW9uIGlzIGZvciB0aGUgcmVxdWVzdGluZyB1c2VyXG4gICAgaWYgKGludml0YXRpb24uZW1haWwudG9Mb3dlckNhc2UoKSAhPT0gcmVxdWVzdGluZ1VzZXJFbWFpbC50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDMsICdUaGlzIGludml0YXRpb24gaXMgbm90IGZvciB5b3UnKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBpbnZpdGF0aW9uIGlzIHN0aWxsIHBlbmRpbmdcbiAgICBpZiAoaW52aXRhdGlvbi5zdGF0dXMgIT09ICdwZW5kaW5nJykge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCBgSW52aXRhdGlvbiBoYXMgYWxyZWFkeSBiZWVuICR7aW52aXRhdGlvbi5zdGF0dXN9YCk7XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIGludml0YXRpb24gc3RhdHVzIHRvIHJlamVjdGVkXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBhd2FpdCB1cGRhdGVJdGVtKFxuICAgICAgVEFCTEVTLkNBUkVfQ0lSQ0xFX0lOVklUQVRJT05TIHx8ICdoZWFsdGhjYXJlLWNhcmUtY2lyY2xlLWludml0YXRpb25zLWRldicsXG4gICAgICB7IGludml0YXRpb25JZCB9LFxuICAgICAgJ1NFVCAjc3RhdHVzID0gOnN0YXR1cywgcmVqZWN0ZWRBdCA9IDpyZWplY3RlZEF0LCByZWplY3RlZEJ5ID0gOnJlamVjdGVkQnknLFxuICAgICAge1xuICAgICAgICAnOnN0YXR1cyc6ICdyZWplY3RlZCcsXG4gICAgICAgICc6cmVqZWN0ZWRBdCc6IG5vdy50b0lTT1N0cmluZygpLFxuICAgICAgICAnOnJlamVjdGVkQnknOiByZXF1ZXN0aW5nVXNlcklkLFxuICAgICAgfSxcbiAgICAgIHsgJyNzdGF0dXMnOiAnc3RhdHVzJyB9XG4gICAgKTtcblxuICAgIC8vIExvZyBhdWRpdCBldmVudFxuICAgIGF3YWl0IGxvZ0F1ZGl0RXZlbnQoe1xuICAgICAgdXNlcklkOiByZXF1ZXN0aW5nVXNlcklkLFxuICAgICAgYWN0aW9uOiAncmVqZWN0X2NhcmVfY2lyY2xlX2ludml0YXRpb24nLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnY2FyZV9jaXJjbGVfaW52aXRhdGlvbicsXG4gICAgICByZXNvdXJjZUlkOiBpbnZpdGF0aW9uSWQsXG4gICAgICBkZXRhaWxzOiB7XG4gICAgICAgIHByaW1hcnlVc2VySWQ6IGludml0YXRpb24ucHJpbWFyeVVzZXJJZCxcbiAgICAgIH0sXG4gICAgICBpcEFkZHJlc3M6IGV2ZW50LnJlcXVlc3RDb250ZXh0LmlkZW50aXR5Py5zb3VyY2VJcCxcbiAgICAgIHVzZXJBZ2VudDogZXZlbnQucmVxdWVzdENvbnRleHQuaWRlbnRpdHk/LnVzZXJBZ2VudCxcbiAgICB9KTtcblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgbWVzc2FnZTogJ0ludml0YXRpb24gcmVqZWN0ZWQgc3VjY2Vzc2Z1bGx5JyxcbiAgICAgIGludml0YXRpb25JZCxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZWplY3RpbmcgY2FyZSBjaXJjbGUgaW52aXRhdGlvbjonLCBlcnJvcik7XG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIHJlamVjdCBpbnZpdGF0aW9uJyk7XG4gIH1cbn1cbiJdfQ==