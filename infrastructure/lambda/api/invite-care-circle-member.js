"use strict";
// Invite Care Circle Member Lambda Function
// Requirements: 4.1
// Sends an invitation to join a primary user's care circle
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const client_ses_1 = require("@aws-sdk/client-ses");
const types_1 = require("../shared/types");
const dynamodb_client_1 = require("../shared/dynamodb-client");
const audit_logger_1 = require("../shared/audit-logger");
const sesClient = new client_ses_1.SESClient({});
/**
 * Generate invitation token
 */
function generateInvitationId() {
    return `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Send invitation email
 */
async function sendInvitationEmail(invitation, primaryUserName) {
    const invitationUrl = `${process.env.APP_URL || 'https://healthcare-monitoring.com'}/accept-invitation/${invitation.invitationId}`;
    const emailBody = `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Care Circle Invitation</h2>
        <p style="font-size: 16px;">
          ${primaryUserName} has invited you to join their care circle on Healthcare Monitoring App.
        </p>
        ${invitation.message ? `
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">"${invitation.message}"</p>
          </div>
        ` : ''}
        <p style="font-size: 16px;">
          As a <strong>${invitation.relationship}</strong>, you will be able to:
        </p>
        <ul style="font-size: 14px;">
          ${invitation.permissions.canViewVitals ? '<li>View vital signs and health data</li>' : ''}
          ${invitation.permissions.canViewMedications ? '<li>View medication schedules and adherence</li>' : ''}
          ${invitation.permissions.canViewAppointments ? '<li>View medical appointments</li>' : ''}
          ${invitation.permissions.canReceiveAlerts ? '<li>Receive health alerts and notifications</li>' : ''}
          ${invitation.permissions.canSendMessages ? '<li>Send messages and communicate</li>' : ''}
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" 
             style="background-color: #1976d2; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          This invitation will expire on ${new Date(invitation.expiresAt).toLocaleDateString()}.
        </p>
        <p style="font-size: 14px; color: #666;">
          If you don't want to join this care circle, you can safely ignore this email.
        </p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">
          Healthcare Monitoring App - Keeping families connected
        </p>
      </body>
    </html>
  `;
    await sesClient.send(new client_ses_1.SendEmailCommand({
        Source: process.env.SES_FROM_EMAIL || 'noreply@healthcare-monitoring.com',
        Destination: {
            ToAddresses: [invitation.email],
        },
        Message: {
            Subject: {
                Data: `Care Circle Invitation from ${primaryUserName}`,
            },
            Body: {
                Html: {
                    Data: emailBody,
                },
                Text: {
                    Data: `${primaryUserName} has invited you to join their care circle. Visit ${invitationUrl} to accept.`,
                },
            },
        },
    }));
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
        // Only the primary user can send invitations
        if (requestingUserId !== primaryUserId) {
            return (0, types_1.createErrorResponse)(403, 'Only the primary user can send care circle invitations');
        }
        // Parse request body
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.email || !request.relationship || !request.permissions) {
            return (0, types_1.createErrorResponse)(400, 'email, relationship, and permissions are required');
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(request.email)) {
            return (0, types_1.createErrorResponse)(400, 'Invalid email format');
        }
        // Create invitation
        const invitationId = generateInvitationId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        const invitation = {
            invitationId,
            primaryUserId,
            email: request.email.toLowerCase(),
            relationship: request.relationship,
            permissions: request.permissions,
            status: 'pending',
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            message: request.message,
        };
        // Store invitation in DynamoDB
        await (0, dynamodb_client_1.putItem)(dynamodb_client_1.TABLES.CARE_CIRCLE_INVITATIONS || 'healthcare-care-circle-invitations-dev', invitation);
        // Get primary user name for email
        const primaryUserName = event.requestContext.authorizer?.claims?.name || 'A family member';
        // Send invitation email
        await sendInvitationEmail(invitation, primaryUserName);
        // Log audit event
        await (0, audit_logger_1.logAuditEvent)({
            userId: primaryUserId,
            action: 'send_care_circle_invitation',
            resourceType: 'care_circle_invitation',
            resourceId: invitationId,
            details: {
                email: request.email,
                relationship: request.relationship,
            },
            ipAddress: event.requestContext.identity?.sourceIp,
            userAgent: event.requestContext.identity?.userAgent,
        });
        return (0, types_1.createSuccessResponse)({
            message: 'Invitation sent successfully',
            invitationId,
            email: request.email,
            expiresAt: expiresAt.toISOString(),
        });
    }
    catch (error) {
        console.error('Error sending care circle invitation:', error);
        return (0, types_1.createErrorResponse)(500, 'Failed to send invitation');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52aXRlLWNhcmUtY2lyY2xlLW1lbWJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImludml0ZS1jYXJlLWNpcmNsZS1tZW1iZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDRDQUE0QztBQUM1QyxvQkFBb0I7QUFDcEIsMkRBQTJEOztBQThHM0QsMEJBdUZDO0FBbE1ELG9EQUFrRTtBQUNsRSwyQ0FBOEc7QUFFOUcsK0RBQTREO0FBQzVELHlEQUF1RDtBQUV2RCxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7QUFxQnBDOztHQUVHO0FBQ0gsU0FBUyxvQkFBb0I7SUFDM0IsT0FBTyxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUN4RSxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxLQUFLLFVBQVUsbUJBQW1CLENBQ2hDLFVBQWdDLEVBQ2hDLGVBQXVCO0lBRXZCLE1BQU0sYUFBYSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLElBQUksbUNBQW1DLHNCQUFzQixVQUFVLENBQUMsWUFBWSxFQUFFLENBQUM7SUFFbkksTUFBTSxTQUFTLEdBQUc7Ozs7O1lBS1IsZUFBZTs7VUFFakIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7O3lEQUUwQixVQUFVLENBQUMsT0FBTzs7U0FFbEUsQ0FBQyxDQUFDLENBQUMsRUFBRTs7eUJBRVcsVUFBVSxDQUFDLFlBQVk7OztZQUdwQyxVQUFVLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsMkNBQTJDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdkYsVUFBVSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsa0RBQWtELENBQUMsQ0FBQyxD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QUFFLE9BQU8sQ0FBQyxZQUFZO2FBQ25DO1lBQ0QsU0FBUyxFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFFBQVE7WUFDbEQsU0FBUyxFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFNBQVM7U0FDcEQsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFBLDZCQUFxQixFQUFDO1lBQzNCLE9BQU8sRUFBRSw4QkFBOEI7WUFDdkMsWUFBWTtZQUNaLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsRUFBRTtTQUNuQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUNBQXVDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDOUQsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO0lBQy9ELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gSW52aXRlIENhcmUgQ2lyY2xlIE1lbWJlciBMYW1iZGEgRnVuY3Rpb25cbi8vIFJlcXVpcmVtZW50czogNC4xXG4vLyBTZW5kcyBhbiBpbnZpdGF0aW9uIHRvIGpvaW4gYSBwcmltYXJ5IHVzZXIncyBjYXJlIGNpcmNsZVxuXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBTRVNDbGllbnQsIFNlbmRFbWFpbENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2VzJztcbmltcG9ydCB7IGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSwgY3JlYXRlRXJyb3JSZXNwb25zZSwgUmVsYXRpb25zaGlwVHlwZSwgUGVybWlzc2lvblNldCB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBnZXRVc2VyQnlFbWFpbCB9IGZyb20gJy4uL3NoYXJlZC9kYXRhLWFjY2Vzcy91c2Vycyc7XG5pbXBvcnQgeyBUQUJMRVMsIHB1dEl0ZW0gfSBmcm9tICcuLi9zaGFyZWQvZHluYW1vZGItY2xpZW50JztcbmltcG9ydCB7IGxvZ0F1ZGl0RXZlbnQgfSBmcm9tICcuLi9zaGFyZWQvYXVkaXQtbG9nZ2VyJztcblxuY29uc3Qgc2VzQ2xpZW50ID0gbmV3IFNFU0NsaWVudCh7fSk7XG5cbmludGVyZmFjZSBJbnZpdGVSZXF1ZXN0IHtcbiAgZW1haWw6IHN0cmluZztcbiAgcmVsYXRpb25zaGlwOiBSZWxhdGlvbnNoaXBUeXBlO1xuICBwZXJtaXNzaW9uczogUGVybWlzc2lvblNldDtcbiAgbWVzc2FnZT86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIENhcmVDaXJjbGVJbnZpdGF0aW9uIHtcbiAgaW52aXRhdGlvbklkOiBzdHJpbmc7XG4gIHByaW1hcnlVc2VySWQ6IHN0cmluZztcbiAgZW1haWw6IHN0cmluZztcbiAgcmVsYXRpb25zaGlwOiBSZWxhdGlvbnNoaXBUeXBlO1xuICBwZXJtaXNzaW9uczogUGVybWlzc2lvblNldDtcbiAgc3RhdHVzOiAncGVuZGluZycgfCAnYWNjZXB0ZWQnIHwgJ3JlamVjdGVkJyB8ICdleHBpcmVkJztcbiAgY3JlYXRlZEF0OiBzdHJpbmc7XG4gIGV4cGlyZXNBdDogc3RyaW5nO1xuICBtZXNzYWdlPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGludml0YXRpb24gdG9rZW5cbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVJbnZpdGF0aW9uSWQoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBpbnYtJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xufVxuXG4vKipcbiAqIFNlbmQgaW52aXRhdGlvbiBlbWFpbFxuICovXG5hc3luYyBmdW5jdGlvbiBzZW5kSW52aXRhdGlvbkVtYWlsKFxuICBpbnZpdGF0aW9uOiBDYXJlQ2lyY2xlSW52aXRhdGlvbixcbiAgcHJpbWFyeVVzZXJOYW1lOiBzdHJpbmdcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBpbnZpdGF0aW9uVXJsID0gYCR7cHJvY2Vzcy5lbnYuQVBQX1VSTCB8fCAnaHR0cHM6Ly9oZWFsdGhjYXJlLW1vbml0b3JpbmcuY29tJ30vYWNjZXB0LWludml0YXRpb24vJHtpbnZpdGF0aW9uLmludml0YXRpb25JZH1gO1xuICBcbiAgY29uc3QgZW1haWxCb2R5ID0gYFxuICAgIDxodG1sPlxuICAgICAgPGJvZHkgc3R5bGU9XCJmb250LWZhbWlseTogQXJpYWwsIHNhbnMtc2VyaWY7IHBhZGRpbmc6IDIwcHg7IG1heC13aWR0aDogNjAwcHg7IG1hcmdpbjogMCBhdXRvO1wiPlxuICAgICAgICA8aDIgc3R5bGU9XCJjb2xvcjogIzE5NzZkMjtcIj5DYXJlIENpcmNsZSBJbnZpdGF0aW9uPC9oMj5cbiAgICAgICAgPHAgc3R5bGU9XCJmb250LXNpemU6IDE2cHg7XCI+XG4gICAgICAgICAgJHtwcmltYXJ5VXNlck5hbWV9IGhhcyBpbnZpdGVkIHlvdSB0byBqb2luIHRoZWlyIGNhcmUgY2lyY2xlIG9uIEhlYWx0aGNhcmUgTW9uaXRvcmluZyBBcHAuXG4gICAgICAgIDwvcD5cbiAgICAgICAgJHtpbnZpdGF0aW9uLm1lc3NhZ2UgPyBgXG4gICAgICAgICAgPGRpdiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjU7IHBhZGRpbmc6IDE1cHg7IGJvcmRlci1yYWRpdXM6IDVweDsgbWFyZ2luOiAyMHB4IDA7XCI+XG4gICAgICAgICAgICA8cCBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zdHlsZTogaXRhbGljO1wiPlwiJHtpbnZpdGF0aW9uLm1lc3NhZ2V9XCI8L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIGAgOiAnJ31cbiAgICAgICAgPHAgc3R5bGU9XCJmb250LXNpemU6IDE2cHg7XCI+XG4gICAgICAgICAgQXMgYSA8c3Ryb25nPiR7aW52aXRhdGlvbi5yZWxhdGlvbnNoaXB9PC9zdHJvbmc+LCB5b3Ugd2lsbCBiZSBhYmxlIHRvOlxuICAgICAgICA8L3A+XG4gICAgICAgIDx1bCBzdHlsZT1cImZvbnQtc2l6ZTogMTRweDtcIj5cbiAgICAgICAgICAke2ludml0YXRpb24ucGVybWlzc2lvbnMuY2FuVmlld1ZpdGFscyA/ICc8bGk+VmlldyB2aXRhbCBzaWducyBhbmQgaGVhbHRoIGRhdGE8L2xpPicgOiAnJ31cbiAgICAgICAgICAke2ludml0YXRpb24ucGVybWlzc2lvbnMuY2FuVmlld01lZGljYXRpb25zID8gJzxsaT5WaWV3IG1lZGljYXRpb24gc2NoZWR1bGVzIGFuZCBhZGhlcmVuY2U8L2xpPicgOiAnJ31cbiAgICAgICAgICAke2ludml0YXRpb24ucGVybWlzc2lvbnMuY2FuVmlld0FwcG9pbnRtZW50cyA/ICc8bGk+VmlldyBtZWRpY2FsIGFwcG9pbnRtZW50czwvbGk+JyA6ICcnfVxuICAgICAgICAgICR7aW52aXRhdGlvbi5wZXJtaXNzaW9ucy5jYW5SZWNlaXZlQWxlcnRzID8gJzxsaT5SZWNlaXZlIGhlYWx0aCBhbGVydHMgYW5kIG5vdGlmaWNhdGlvbnM8L2xpPicgOiAnJ31cbiAgICAgICAgICAke2ludml0YXRpb24ucGVybWlzc2lvbnMuY2FuU2VuZE1lc3NhZ2VzID8gJzxsaT5TZW5kIG1lc3NhZ2VzIGFuZCBjb21tdW5pY2F0ZTwvbGk+JyA6ICcnfVxuICAgICAgICA8L3VsPlxuICAgICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjogY2VudGVyOyBtYXJnaW46IDMwcHggMDtcIj5cbiAgICAgICAgICA8YSBocmVmPVwiJHtpbnZpdGF0aW9uVXJsfVwiIFxuICAgICAgICAgICAgIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogIzE5NzZkMjsgY29sb3I6IHdoaXRlOyBwYWRkaW5nOiAxNXB4IDMwcHg7IFxuICAgICAgICAgICAgICAgICAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7IGJvcmRlci1yYWRpdXM6IDVweDsgZm9udC1zaXplOiAxNnB4OyBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XCI+XG4gICAgICAgICAgICBBY2NlcHQgSW52aXRhdGlvblxuICAgICAgICAgIDwvYT5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxwIHN0eWxlPVwiZm9udC1zaXplOiAxNHB4OyBjb2xvcjogIzY2NjtcIj5cbiAgICAgICAgICBUaGlzIGludml0YXRpb24gd2lsbCBleHBpcmUgb24gJHtuZXcgRGF0ZShpbnZpdGF0aW9uLmV4cGlyZXNBdCkudG9Mb2NhbGVEYXRlU3RyaW5nKCl9LlxuICAgICAgICA8L3A+XG4gICAgICAgIDxwIHN0eWxlPVwiZm9udC1zaXplOiAxNHB4OyBjb2xvcjogIzY2NjtcIj5cbiAgICAgICAgICBJZiB5b3UgZG9uJ3Qgd2FudCB0byBqb2luIHRoaXMgY2FyZSBjaXJjbGUsIHlvdSBjYW4gc2FmZWx5IGlnbm9yZSB0aGlzIGVtYWlsLlxuICAgICAgICA8L3A+XG4gICAgICAgIDxociBzdHlsZT1cIm1hcmdpbjogMjBweCAwOyBib3JkZXI6IG5vbmU7IGJvcmRlci10b3A6IDFweCBzb2xpZCAjZGRkO1wiPlxuICAgICAgICA8cCBzdHlsZT1cImZvbnQtc2l6ZTogMTJweDsgY29sb3I6ICM5OTk7XCI+XG4gICAgICAgICAgSGVhbHRoY2FyZSBNb25pdG9yaW5nIEFwcCAtIEtlZXBpbmcgZmFtaWxpZXMgY29ubmVjdGVkXG4gICAgICAgIDwvcD5cbiAgICAgIDwvYm9keT5cbiAgICA8L2h0bWw+XG4gIGA7XG5cbiAgYXdhaXQgc2VzQ2xpZW50LnNlbmQobmV3IFNlbmRFbWFpbENvbW1hbmQoe1xuICAgIFNvdXJjZTogcHJvY2Vzcy5lbnYuU0VTX0ZST01fRU1BSUwgfHwgJ25vcmVwbHlAaGVhbHRoY2FyZS1tb25pdG9yaW5nLmNvbScsXG4gICAgRGVzdGluYXRpb246IHtcbiAgICAgIFRvQWRkcmVzc2VzOiBbaW52aXRhdGlvbi5lbWFpbF0sXG4gICAgfSxcbiAgICBNZXNzYWdlOiB7XG4gICAgICBTdWJqZWN0OiB7XG4gICAgICAgIERhdGE6IGBDYXJlIENpcmNsZSBJbnZpdGF0aW9uIGZyb20gJHtwcmltYXJ5VXNlck5hbWV9YCxcbiAgICAgIH0sXG4gICAgICBCb2R5OiB7XG4gICAgICAgIEh0bWw6IHtcbiAgICAgICAgICBEYXRhOiBlbWFpbEJvZHksXG4gICAgICAgIH0sXG4gICAgICAgIFRleHQ6IHtcbiAgICAgICAgICBEYXRhOiBgJHtwcmltYXJ5VXNlck5hbWV9IGhhcyBpbnZpdGVkIHlvdSB0byBqb2luIHRoZWlyIGNhcmUgY2lyY2xlLiBWaXNpdCAke2ludml0YXRpb25Vcmx9IHRvIGFjY2VwdC5gLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9KSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IHVzZXJJZCBmcm9tIHBhdGggcGFyYW1ldGVyc1xuICAgIGNvbnN0IHByaW1hcnlVc2VySWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8udXNlcklkO1xuICAgIGlmICghcHJpbWFyeVVzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAndXNlcklkIGlzIHJlcXVpcmVkIGluIHBhdGgnKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgcmVxdWVzdGluZyB1c2VyIGZyb20gYXV0aG9yaXplciBjb250ZXh0XG4gICAgY29uc3QgcmVxdWVzdGluZ1VzZXJJZCA9IGV2ZW50LnJlcXVlc3RDb250ZXh0LmF1dGhvcml6ZXI/LmNsYWltcz8uc3ViO1xuICAgIGlmICghcmVxdWVzdGluZ1VzZXJJZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAxLCAnVW5hdXRob3JpemVkJyk7XG4gICAgfVxuXG4gICAgLy8gT25seSB0aGUgcHJpbWFyeSB1c2VyIGNhbiBzZW5kIGludml0YXRpb25zXG4gICAgaWYgKHJlcXVlc3RpbmdVc2VySWQgIT09IHByaW1hcnlVc2VySWQpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMywgJ09ubHkgdGhlIHByaW1hcnkgdXNlciBjYW4gc2VuZCBjYXJlIGNpcmNsZSBpbnZpdGF0aW9ucycpO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxuICAgIGlmICghZXZlbnQuYm9keSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVxdWVzdDogSW52aXRlUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XG5cbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICBpZiAoIXJlcXVlc3QuZW1haWwgfHwgIXJlcXVlc3QucmVsYXRpb25zaGlwIHx8ICFyZXF1ZXN0LnBlcm1pc3Npb25zKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdlbWFpbCwgcmVsYXRpb25zaGlwLCBhbmQgcGVybWlzc2lvbnMgYXJlIHJlcXVpcmVkJyk7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgZW1haWwgZm9ybWF0XG4gICAgY29uc3QgZW1haWxSZWdleCA9IC9eW15cXHNAXStAW15cXHNAXStcXC5bXlxcc0BdKyQvO1xuICAgIGlmICghZW1haWxSZWdleC50ZXN0KHJlcXVlc3QuZW1haWwpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdJbnZhbGlkIGVtYWlsIGZvcm1hdCcpO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBpbnZpdGF0aW9uXG4gICAgY29uc3QgaW52aXRhdGlvbklkID0gZ2VuZXJhdGVJbnZpdGF0aW9uSWQoKTtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIGNvbnN0IGV4cGlyZXNBdCA9IG5ldyBEYXRlKG5vdy5nZXRUaW1lKCkgKyA3ICogMjQgKiA2MCAqIDYwICogMTAwMCk7IC8vIDcgZGF5c1xuXG4gICAgY29uc3QgaW52aXRhdGlvbjogQ2FyZUNpcmNsZUludml0YXRpb24gPSB7XG4gICAgICBpbnZpdGF0aW9uSWQsXG4gICAgICBwcmltYXJ5VXNlcklkLFxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwudG9Mb3dlckNhc2UoKSxcbiAgICAgIHJlbGF0aW9uc2hpcDogcmVxdWVzdC5yZWxhdGlvbnNoaXAsXG4gICAgICBwZXJtaXNzaW9uczogcmVxdWVzdC5wZXJtaXNzaW9ucyxcbiAgICAgIHN0YXR1czogJ3BlbmRpbmcnLFxuICAgICAgY3JlYXRlZEF0OiBub3cudG9JU09TdHJpbmcoKSxcbiAgICAgIGV4cGlyZXNBdDogZXhwaXJlc0F0LnRvSVNPU3RyaW5nKCksXG4gICAgICBtZXNzYWdlOiByZXF1ZXN0Lm1lc3NhZ2UsXG4gICAgfTtcblxuICAgIC8vIFN0b3JlIGludml0YXRpb24gaW4gRHluYW1vREJcbiAgICBhd2FpdCBwdXRJdGVtKFRBQkxFUy5DQVJFX0NJUkNMRV9JTlZJVEFUSU9OUyB8fCAnaGVhbHRoY2FyZS1jYXJlLWNpcmNsZS1pbnZpdGF0aW9ucy1kZXYnLCBpbnZpdGF0aW9uKTtcblxuICAgIC8vIEdldCBwcmltYXJ5IHVzZXIgbmFtZSBmb3IgZW1haWxcbiAgICBjb25zdCBwcmltYXJ5VXNlck5hbWUgPSBldmVudC5yZXF1ZXN0Q29udGV4dC5hdXRob3JpemVyPy5jbGFpbXM/Lm5hbWUgfHwgJ0EgZmFtaWx5IG1lbWJlcic7XG5cbiAgICAvLyBTZW5kIGludml0YXRpb24gZW1haWxcbiAgICBhd2FpdCBzZW5kSW52aXRhdGlvbkVtYWlsKGludml0YXRpb24sIHByaW1hcnlVc2VyTmFtZSk7XG5cbiAgICAvLyBMb2cgYXVkaXQgZXZlbnRcbiAgICBhd2FpdCBsb2dBdWRpdEV2ZW50KHtcbiAgICAgIHVzZXJJZDogcHJpbWFyeVVzZXJJZCxcbiAgICAgIGFjdGlvbjogJ3NlbmRfY2FyZV9jaXJjbGVfaW52aXRhdGlvbicsXG4gICAgICByZXNvdXJjZVR5cGU6ICdjYXJlX2NpcmNsZV9pbnZpdGF0aW9uJyxcbiAgICAgIHJlc291cmNlSWQ6IGludml0YXRpb25JZCxcbiAgICAgIGRldGFpbHM6IHtcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXG4gICAgICAgIHJlbGF0aW9uc2hpcDogcmVxdWVzdC5yZWxhdGlvbnNoaXAsXG4gICAgICB9LFxuICAgICAgaXBBZGRyZXNzOiBldmVudC5yZXF1ZXN0Q29udGV4dC5pZGVudGl0eT8uc291cmNlSXAsXG4gICAgICB1c2VyQWdlbnQ6IGV2ZW50LnJlcXVlc3RDb250ZXh0LmlkZW50aXR5Py51c2VyQWdlbnQsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgIG1lc3NhZ2U6ICdJbnZpdGF0aW9uIHNlbnQgc3VjY2Vzc2Z1bGx5JyxcbiAgICAgIGludml0YXRpb25JZCxcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxuICAgICAgZXhwaXJlc0F0OiBleHBpcmVzQXQudG9JU09TdHJpbmcoKSxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzZW5kaW5nIGNhcmUgY2lyY2xlIGludml0YXRpb246JywgZXJyb3IpO1xuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byBzZW5kIGludml0YXRpb24nKTtcbiAgfVxufVxuIl19