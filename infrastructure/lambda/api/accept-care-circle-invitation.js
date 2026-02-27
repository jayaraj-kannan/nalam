"use strict";
// Accept Care Circle Invitation Lambda Function
// Requirements: 4.1
// Accepts a care circle invitation and adds the user to the care circle
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../shared/types");
const dynamodb_client_1 = require("../shared/dynamodb-client");
const care_circle_1 = require("../shared/data-access/care-circle");
const users_1 = require("../shared/data-access/users");
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
        // Check if invitation has expired
        const now = new Date();
        const expiresAt = new Date(invitation.expiresAt);
        if (now > expiresAt) {
            // Update invitation status to expired
            await (0, dynamodb_client_1.updateItem)(dynamodb_client_1.TABLES.CARE_CIRCLE_INVITATIONS || 'healthcare-care-circle-invitations-dev', { invitationId }, 'SET #status = :status', { ':status': 'expired' }, { '#status': 'status' });
            return (0, types_1.createErrorResponse)(400, 'Invitation has expired');
        }
        // Verify primary user still exists
        const primaryUser = await (0, users_1.getUser)(invitation.primaryUserId);
        if (!primaryUser) {
            return (0, types_1.createErrorResponse)(404, 'Primary user not found');
        }
        // Add user to care circle
        await (0, care_circle_1.addCareCircleMember)(invitation.primaryUserId, requestingUserId, invitation.relationship, invitation.permissions);
        // Update invitation status to accepted
        await (0, dynamodb_client_1.updateItem)(dynamodb_client_1.TABLES.CARE_CIRCLE_INVITATIONS || 'healthcare-care-circle-invitations-dev', { invitationId }, 'SET #status = :status, acceptedAt = :acceptedAt, acceptedBy = :acceptedBy', {
            ':status': 'accepted',
            ':acceptedAt': now.toISOString(),
            ':acceptedBy': requestingUserId,
        }, { '#status': 'status' });
        // Log audit event
        await (0, audit_logger_1.logAuditEvent)({
            userId: requestingUserId,
            action: 'accept_care_circle_invitation',
            resourceType: 'care_circle_invitation',
            resourceId: invitationId,
            details: {
                primaryUserId: invitation.primaryUserId,
                relationship: invitation.relationship,
            },
            ipAddress: event.requestContext.identity?.sourceIp,
            userAgent: event.requestContext.identity?.userAgent,
        });
        return (0, types_1.createSuccessResponse)({
            message: 'Invitation accepted successfully',
            primaryUserId: invitation.primaryUserId,
            relationship: invitation.relationship,
            permissions: invitation.permissions,
        });
    }
    catch (error) {
        console.error('Error accepting care circle invitation:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to accept invitation');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXB0LWNhcmUtY2lyY2xlLWludml0YXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhY2NlcHQtY2FyZS1jaXJjbGUtaW52aXRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsZ0RBQWdEO0FBQ2hELG9CQUFvQjtBQUNwQix3RUFBd0U7O0FBb0J4RSwwQkFzR0M7QUF2SEQsMkNBQTZFO0FBQzdFLCtEQUF3RTtBQUN4RSxtRUFBd0U7QUFDeEUsdURBQXNEO0FBQ3RELHlEQUF1RDtBQWFoRCxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQTJCO0lBQ3ZELElBQUksQ0FBQztRQUNILHdDQUF3QztRQUN4QyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQztRQUN4RCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbEIsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDO1FBQ3RFLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQztRQUUzRSxJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzlDLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELCtCQUErQjtRQUMvQixNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUEseUJBQU8sRUFDOUIsd0JBQU0sQ0FBQyx1QkFBdUIsSUFBSSx3Q0FBd0MsRUFDMUUsRUFBRSxZQUFZLEVBQUUsQ0FDakIsQ0FBQztRQUVGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPLElB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QUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHlDQUF5QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hFLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztJQUNqRSxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEFjY2VwdCBDYXJlIENpcmNsZSBJbnZpdGF0aW9uIExhbWJkYSBGdW5jdGlvblxuLy8gUmVxdWlyZW1lbnRzOiA0LjFcbi8vIEFjY2VwdHMgYSBjYXJlIGNpcmNsZSBpbnZpdGF0aW9uIGFuZCBhZGRzIHRoZSB1c2VyIHRvIHRoZSBjYXJlIGNpcmNsZVxuXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBjcmVhdGVTdWNjZXNzUmVzcG9uc2UsIGNyZWF0ZUVycm9yUmVzcG9uc2UgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgVEFCTEVTLCBnZXRJdGVtLCB1cGRhdGVJdGVtIH0gZnJvbSAnLi4vc2hhcmVkL2R5bmFtb2RiLWNsaWVudCc7XG5pbXBvcnQgeyBhZGRDYXJlQ2lyY2xlTWVtYmVyIH0gZnJvbSAnLi4vc2hhcmVkL2RhdGEtYWNjZXNzL2NhcmUtY2lyY2xlJztcbmltcG9ydCB7IGdldFVzZXIgfSBmcm9tICcuLi9zaGFyZWQvZGF0YS1hY2Nlc3MvdXNlcnMnO1xuaW1wb3J0IHsgbG9nQXVkaXRFdmVudCB9IGZyb20gJy4uL3NoYXJlZC9hdWRpdC1sb2dnZXInO1xuXG5pbnRlcmZhY2UgQ2FyZUNpcmNsZUludml0YXRpb24ge1xuICBpbnZpdGF0aW9uSWQ6IHN0cmluZztcbiAgcHJpbWFyeVVzZXJJZDogc3RyaW5nO1xuICBlbWFpbDogc3RyaW5nO1xuICByZWxhdGlvbnNoaXA6IHN0cmluZztcbiAgcGVybWlzc2lvbnM6IGFueTtcbiAgc3RhdHVzOiAncGVuZGluZycgfCAnYWNjZXB0ZWQnIHwgJ3JlamVjdGVkJyB8ICdleHBpcmVkJztcbiAgY3JlYXRlZEF0OiBzdHJpbmc7XG4gIGV4cGlyZXNBdDogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xuICB0cnkge1xuICAgIC8vIEdldCBpbnZpdGF0aW9uSWQgZnJvbSBwYXRoIHBhcmFtZXRlcnNcbiAgICBjb25zdCBpbnZpdGF0aW9uSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uaW52aXRhdGlvbklkO1xuICAgIGlmICghaW52aXRhdGlvbklkKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdpbnZpdGF0aW9uSWQgaXMgcmVxdWlyZWQgaW4gcGF0aCcpO1xuICAgIH1cblxuICAgIC8vIEdldCByZXF1ZXN0aW5nIHVzZXIgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcbiAgICBjb25zdCByZXF1ZXN0aW5nVXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8uY2xhaW1zPy5zdWI7XG4gICAgY29uc3QgcmVxdWVzdGluZ1VzZXJFbWFpbCA9IGV2ZW50LnJlcXVlc3RDb250ZXh0LmF1dGhvcml6ZXI/LmNsYWltcz8uZW1haWw7XG4gICAgXG4gICAgaWYgKCFyZXF1ZXN0aW5nVXNlcklkIHx8ICFyZXF1ZXN0aW5nVXNlckVtYWlsKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdVbmF1dGhvcml6ZWQnKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgaW52aXRhdGlvbiBmcm9tIER5bmFtb0RCXG4gICAgY29uc3QgaW52aXRhdGlvbiA9IGF3YWl0IGdldEl0ZW08Q2FyZUNpcmNsZUludml0YXRpb24+KFxuICAgICAgVEFCTEVTLkNBUkVfQ0lSQ0xFX0lOVklUQVRJT05TIHx8ICdoZWFsdGhjYXJlLWNhcmUtY2lyY2xlLWludml0YXRpb25zLWRldicsXG4gICAgICB7IGludml0YXRpb25JZCB9XG4gICAgKTtcblxuICAgIGlmICghaW52aXRhdGlvbikge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA0LCAnSW52aXRhdGlvbiBub3QgZm91bmQnKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBpbnZpdGF0aW9uIGlzIGZvciB0aGUgcmVxdWVzdGluZyB1c2VyXG4gICAgaWYgKGludml0YXRpb24uZW1haWwudG9Mb3dlckNhc2UoKSAhPT0gcmVxdWVzdGluZ1VzZXJFbWFpbC50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDMsICdUaGlzIGludml0YXRpb24gaXMgbm90IGZvciB5b3UnKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBpbnZpdGF0aW9uIGlzIHN0aWxsIHBlbmRpbmdcbiAgICBpZiAoaW52aXRhdGlvbi5zdGF0dXMgIT09ICdwZW5kaW5nJykge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCBgSW52aXRhdGlvbiBoYXMgYWxyZWFkeSBiZWVuICR7aW52aXRhdGlvbi5zdGF0dXN9YCk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgaW52aXRhdGlvbiBoYXMgZXhwaXJlZFxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgZXhwaXJlc0F0ID0gbmV3IERhdGUoaW52aXRhdGlvbi5leHBpcmVzQXQpO1xuICAgIGlmIChub3cgPiBleHBpcmVzQXQpIHtcbiAgICAgIC8vIFVwZGF0ZSBpbnZpdGF0aW9uIHN0YXR1cyB0byBleHBpcmVkXG4gICAgICBhd2FpdCB1cGRhdGVJdGVtKFxuICAgICAgICBUQUJMRVMuQ0FSRV9DSVJDTEVfSU5WSVRBVElPTlMgfHwgJ2hlYWx0aGNhcmUtY2FyZS1jaXJjbGUtaW52aXRhdGlvbnMtZGV2JyxcbiAgICAgICAgeyBpbnZpdGF0aW9uSWQgfSxcbiAgICAgICAgJ1NFVCAjc3RhdHVzID0gOnN0YXR1cycsXG4gICAgICAgIHsgJzpzdGF0dXMnOiAnZXhwaXJlZCcgfSxcbiAgICAgICAgeyAnI3N0YXR1cyc6ICdzdGF0dXMnIH1cbiAgICAgICk7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdJbnZpdGF0aW9uIGhhcyBleHBpcmVkJyk7XG4gICAgfVxuXG4gICAgLy8gVmVyaWZ5IHByaW1hcnkgdXNlciBzdGlsbCBleGlzdHNcbiAgICBjb25zdCBwcmltYXJ5VXNlciA9IGF3YWl0IGdldFVzZXIoaW52aXRhdGlvbi5wcmltYXJ5VXNlcklkKTtcbiAgICBpZiAoIXByaW1hcnlVc2VyKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDQsICdQcmltYXJ5IHVzZXIgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgLy8gQWRkIHVzZXIgdG8gY2FyZSBjaXJjbGVcbiAgICBhd2FpdCBhZGRDYXJlQ2lyY2xlTWVtYmVyKFxuICAgICAgaW52aXRhdGlvbi5wcmltYXJ5VXNlcklkLFxuICAgICAgcmVxdWVzdGluZ1VzZXJJZCxcbiAgICAgIGludml0YXRpb24ucmVsYXRpb25zaGlwIGFzIGFueSxcbiAgICAgIGludml0YXRpb24ucGVybWlzc2lvbnNcbiAgICApO1xuXG4gICAgLy8gVXBkYXRlIGludml0YXRpb24gc3RhdHVzIHRvIGFjY2VwdGVkXG4gICAgYXdhaXQgdXBkYXRlSXRlbShcbiAgICAgIFRBQkxFUy5DQVJFX0NJUkNMRV9JTlZJVEFUSU9OUyB8fCAnaGVhbHRoY2FyZS1jYXJlLWNpcmNsZS1pbnZpdGF0aW9ucy1kZXYnLFxuICAgICAgeyBpbnZpdGF0aW9uSWQgfSxcbiAgICAgICdTRVQgI3N0YXR1cyA9IDpzdGF0dXMsIGFjY2VwdGVkQXQgPSA6YWNjZXB0ZWRBdCwgYWNjZXB0ZWRCeSA9IDphY2NlcHRlZEJ5JyxcbiAgICAgIHtcbiAgICAgICAgJzpzdGF0dXMnOiAnYWNjZXB0ZWQnLFxuICAgICAgICAnOmFjY2VwdGVkQXQnOiBub3cudG9JU09TdHJpbmcoKSxcbiAgICAgICAgJzphY2NlcHRlZEJ5JzogcmVxdWVzdGluZ1VzZXJJZCxcbiAgICAgIH0sXG4gICAgICB7ICcjc3RhdHVzJzogJ3N0YXR1cycgfVxuICAgICk7XG5cbiAgICAvLyBMb2cgYXVkaXQgZXZlbnRcbiAgICBhd2FpdCBsb2dBdWRpdEV2ZW50KHtcbiAgICAgIHVzZXJJZDogcmVxdWVzdGluZ1VzZXJJZCxcbiAgICAgIGFjdGlvbjogJ2FjY2VwdF9jYXJlX2NpcmNsZV9pbnZpdGF0aW9uJyxcbiAgICAgIHJlc291cmNlVHlwZTogJ2NhcmVfY2lyY2xlX2ludml0YXRpb24nLFxuICAgICAgcmVzb3VyY2VJZDogaW52aXRhdGlvbklkLFxuICAgICAgZGV0YWlsczoge1xuICAgICAgICBwcmltYXJ5VXNlcklkOiBpbnZpdGF0aW9uLnByaW1hcnlVc2VySWQsXG4gICAgICAgIHJlbGF0aW9uc2hpcDogaW52aXRhdGlvbi5yZWxhdGlvbnNoaXAsXG4gICAgICB9LFxuICAgICAgaXBBZGRyZXNzOiBldmVudC5yZXF1ZXN0Q29udGV4dC5pZGVudGl0eT8uc291cmNlSXAsXG4gICAgICB1c2VyQWdlbnQ6IGV2ZW50LnJlcXVlc3RDb250ZXh0LmlkZW50aXR5Py51c2VyQWdlbnQsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgIG1lc3NhZ2U6ICdJbnZpdGF0aW9uIGFjY2VwdGVkIHN1Y2Nlc3NmdWxseScsXG4gICAgICBwcmltYXJ5VXNlcklkOiBpbnZpdGF0aW9uLnByaW1hcnlVc2VySWQsXG4gICAgICByZWxhdGlvbnNoaXA6IGludml0YXRpb24ucmVsYXRpb25zaGlwLFxuICAgICAgcGVybWlzc2lvbnM6IGludml0YXRpb24ucGVybWlzc2lvbnMsXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgYWNjZXB0aW5nIGNhcmUgY2lyY2xlIGludml0YXRpb246JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byBhY2NlcHQgaW52aXRhdGlvbicpO1xuICB9XG59XG4iXX0=