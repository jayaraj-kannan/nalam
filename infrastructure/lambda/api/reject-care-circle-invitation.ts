// Reject Care Circle Invitation Lambda Function
// Requirements: 4.1
// Rejects a care circle invitation

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { TABLES, getItem, updateItem } from '../shared/dynamodb-client';
import { logAuditEvent } from '../shared/audit-logger';

interface CareCircleInvitation {
  invitationId: string;
  primaryUserId: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
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

    // Update invitation status to rejected
    const now = new Date();
    await updateItem(
      TABLES.CARE_CIRCLE_INVITATIONS || 'healthcare-care-circle-invitations-dev',
      { invitationId },
      'SET #status = :status, rejectedAt = :rejectedAt, rejectedBy = :rejectedBy',
      {
        ':status': 'rejected',
        ':rejectedAt': now.toISOString(),
        ':rejectedBy': requestingUserId,
      },
      { '#status': 'status' }
    );

    // Log audit event
    await logAuditEvent({
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

    return createSuccessResponse({
      message: 'Invitation rejected successfully',
      invitationId,
    });
  } catch (error) {
    console.error('Error rejecting care circle invitation:', error);
    return createErrorResponse(500, 'Failed to reject invitation');
  }
}
