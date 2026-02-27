// Accept Care Circle Invitation Lambda Function
// Requirements: 4.1
// Accepts a care circle invitation and adds the user to the care circle

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { TABLES, getItem, updateItem } from '../shared/dynamodb-client';
import { addCareCircleMember } from '../shared/data-access/care-circle';
import { getUser } from '../shared/data-access/users';
import { logAuditEvent } from '../shared/audit-logger';

interface CareCircleInvitation {
  invitationId: string;
  primaryUserId: string;
  email: string;
  relationship: string;
  permissions: any;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Get invitationId from path parameters
    const invitationId = event.pathParameters?.invitationId;
    if (!invitationId) {
      return createErrorResponse(400, 'invitationId is required in path');
    }

    // Get requesting user from authorizer context
    const requestingUserId = event.requestContext.authorizer?.claims?.sub;
    const requestingUserEmail = event.requestContext.authorizer?.claims?.email;
    
    if (!requestingUserId || !requestingUserEmail) {
      return createErrorResponse(401, 'Unauthorized');
    }

    // Get invitation from DynamoDB
    const invitation = await getItem<CareCircleInvitation>(
      TABLES.CARE_CIRCLE_INVITATIONS || 'healthcare-care-circle-invitations-dev',
      { invitationId }
    );

    if (!invitation) {
      return createErrorResponse(404, 'Invitation not found');
    }

    // Check if invitation is for the requesting user
    if (invitation.email.toLowerCase() !== requestingUserEmail.toLowerCase()) {
      return createErrorResponse(403, 'This invitation is not for you');
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return createErrorResponse(400, `Invitation has already been ${invitation.status}`);
    }

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    if (now > expiresAt) {
      // Update invitation status to expired
      await updateItem(
        TABLES.CARE_CIRCLE_INVITATIONS || 'healthcare-care-circle-invitations-dev',
        { invitationId },
        'SET #status = :status',
        { ':status': 'expired' },
        { '#status': 'status' }
      );
      return createErrorResponse(400, 'Invitation has expired');
    }

    // Verify primary user still exists
    const primaryUser = await getUser(invitation.primaryUserId);
    if (!primaryUser) {
      return createErrorResponse(404, 'Primary user not found');
    }

    // Add user to care circle
    await addCareCircleMember(
      invitation.primaryUserId,
      requestingUserId,
      invitation.relationship as any,
      invitation.permissions
    );

    // Update invitation status to accepted
    await updateItem(
      TABLES.CARE_CIRCLE_INVITATIONS || 'healthcare-care-circle-invitations-dev',
      { invitationId },
      'SET #status = :status, acceptedAt = :acceptedAt, acceptedBy = :acceptedBy',
      {
        ':status': 'accepted',
        ':acceptedAt': now.toISOString(),
        ':acceptedBy': requestingUserId,
      },
      { '#status': 'status' }
    );

    // Log audit event
    await logAuditEvent({
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

    return createSuccessResponse({
      message: 'Invitation accepted successfully',
      primaryUserId: invitation.primaryUserId,
      relationship: invitation.relationship,
      permissions: invitation.permissions,
    });
  } catch (error) {
    console.error('Error accepting care circle invitation:', error);
    return createErrorResponse(500, 'Failed to accept invitation');
  }
}
