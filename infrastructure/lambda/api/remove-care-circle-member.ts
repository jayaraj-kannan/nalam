// Remove Care Circle Member Lambda Function
// Requirements: 4.1, 8.5
// Removes a member from a primary user's care circle

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { removeCareCircleMember } from '../shared/data-access/care-circle';
import { logAuditEvent } from '../shared/audit-logger';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Get userId and memberId from path parameters
    const primaryUserId = event.pathParameters?.userId;
    const secondaryUserId = event.pathParameters?.memberId;
    
    if (!primaryUserId || !secondaryUserId) {
      return createErrorResponse(400, 'userId and memberId are required in path');
    }

    // Get requesting user from authorizer context
    const requestingUserId = event.requestContext.authorizer?.claims?.sub;
    if (!requestingUserId) {
      return createErrorResponse(401, 'Unauthorized');
    }

    // Only the primary user can remove members from their care circle
    if (requestingUserId !== primaryUserId) {
      return createErrorResponse(403, 'Only the primary user can remove care circle members');
    }

    // Remove member from care circle
    await removeCareCircleMember(primaryUserId, secondaryUserId);

    // Log audit event
    await logAuditEvent({
      userId: primaryUserId,
      action: 'remove_care_circle_member',
      resourceType: 'care_circle',
      resourceId: `${primaryUserId}:${secondaryUserId}`,
      details: {
        secondaryUserId,
      },
      ipAddress: event.requestContext.identity?.sourceIp,
      userAgent: event.requestContext.identity?.userAgent,
    });

    return createSuccessResponse({
      message: 'Care circle member removed successfully',
      primaryUserId,
      secondaryUserId,
    });
  } catch (error) {
    console.error('Error removing care circle member:', error);
    return createErrorResponse(500, 'Failed to remove care circle member');
  }
}
