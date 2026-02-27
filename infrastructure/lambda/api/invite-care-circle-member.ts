// Invite Care Circle Member Lambda Function
// Requirements: 4.1
// Sends an invitation to join a primary user's care circle

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { createSuccessResponse, createErrorResponse, RelationshipType, PermissionSet } from '../shared/types';
import { getUserByEmail } from '../shared/data-access/users';
import { TABLES, putItem } from '../shared/dynamodb-client';
import { logAuditEvent } from '../shared/audit-logger';

const sesClient = new SESClient({});

interface InviteRequest {
  email: string;
  relationship: RelationshipType;
  permissions: PermissionSet;
  message?: string;
}

interface CareCircleInvitation {
  invitationId: string;
  primaryUserId: string;
  email: string;
  relationship: RelationshipType;
  permissions: PermissionSet;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  message?: string;
}

/**
 * Generate invitation token
 */
function generateInvitationId(): string {
  return `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Send invitation email
 */
async function sendInvitationEmail(
  invitation: CareCircleInvitation,
  primaryUserName: string
): Promise<void> {
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

  await sesClient.send(new SendEmailCommand({
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

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Get userId from path parameters
    const primaryUserId = event.pathParameters?.userId;
    if (!primaryUserId) {
      return createErrorResponse(400, 'userId is required in path');
    }

    // Get requesting user from authorizer context
    const requestingUserId = event.requestContext.authorizer?.claims?.sub;
    if (!requestingUserId) {
      return createErrorResponse(401, 'Unauthorized');
    }

    // Only the primary user can send invitations
    if (requestingUserId !== primaryUserId) {
      return createErrorResponse(403, 'Only the primary user can send care circle invitations');
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: InviteRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.email || !request.relationship || !request.permissions) {
      return createErrorResponse(400, 'email, relationship, and permissions are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.email)) {
      return createErrorResponse(400, 'Invalid email format');
    }

    // Create invitation
    const invitationId = generateInvitationId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation: CareCircleInvitation = {
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
    await putItem(TABLES.CARE_CIRCLE_INVITATIONS || 'healthcare-care-circle-invitations-dev', invitation);

    // Get primary user name for email
    const primaryUserName = event.requestContext.authorizer?.claims?.name || 'A family member';

    // Send invitation email
    await sendInvitationEmail(invitation, primaryUserName);

    // Log audit event
    await logAuditEvent({
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

    return createSuccessResponse({
      message: 'Invitation sent successfully',
      invitationId,
      email: request.email,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error sending care circle invitation:', error);
    return createErrorResponse(500, 'Failed to send invitation');
  }
}
