// Add Care Circle Member Lambda Function
// Requirements: 4.1, 4.5
// Adds a new member to a primary user's care circle

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, RelationshipType, PermissionSet } from '../shared/types';
import { addCareCircleMember } from '../shared/data-access/care-circle';
import { getUser } from '../shared/data-access/users';
import { logAuditEvent } from '../shared/audit-logger';

interface AddMemberRequest {
  secondaryUserId: string;
  relationship: RelationshipType;
  permissions: PermissionSet;
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

    // Only the primary user can add members to their care circle
    if (requestingUserId !== primaryUserId) {
      return createErrorResponse(403, 'Only the primary user can add care circle members');
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: AddMemberRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.secondaryUserId || !request.relationship || !request.permissions) {
      return createErrorResponse(400, 'secondaryUserId, relationship, and permissions are required');
    }

    // Verify secondary user exists
    const secondaryUser = await getUser(request.secondaryUserId);
    if (!secondaryUser) {
      return createErrorResponse(404, 'Secondary user not found');
    }

    // Add member to care circle
    await addCareCircleMember(
      primaryUserId,
      request.secondaryUserId,
      request.relationship,
      request.permissions
    );

    // Log audit event
    await logAuditEvent({
      userId: primaryUserId,
      action: 'add_care_circle_member',
      resourceType: 'care_circle',
      resourceId: `${primaryUserId}:${request.secondaryUserId}`,
      details: {
        secondaryUserId: request.secondaryUserId,
        relationship: request.relationship,
        permissions: request.permissions,
      },
      ipAddress: event.requestContext.identity?.sourceIp,
      userAgent: event.requestContext.identity?.userAgent,
    });

    return createSuccessResponse({
      message: 'Care circle member added successfully',
      primaryUserId,
      secondaryUserId: request.secondaryUserId,
      relationship: request.relationship,
    });
  } catch (error) {
    console.error('Error adding care circle member:', error);
    return createErrorResponse(500, 'Failed to add care circle member');
  }
}
