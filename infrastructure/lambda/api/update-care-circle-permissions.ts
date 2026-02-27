// Update Care Circle Permissions Lambda Function
// Requirements: 4.5, 8.5
// Updates permissions for a care circle member

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, PermissionSet } from '../shared/types';
import { updateCareCirclePermissions } from '../shared/data-access/care-circle';
import { logAuditEvent } from '../shared/audit-logger';

interface UpdatePermissionsRequest {
  permissions: PermissionSet;
}

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

    // Only the primary user can update permissions
    if (requestingUserId !== primaryUserId) {
      return createErrorResponse(403, 'Only the primary user can update care circle permissions');
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: UpdatePermissionsRequest = JSON.parse(event.body);

    // Validate permissions object
    if (!request.permissions) {
      return createErrorResponse(400, 'permissions object is required');
    }

    // Update permissions
    await updateCareCirclePermissions(primaryUserId, secondaryUserId, request.permissions);

    // Log audit event
    await logAuditEvent({
      userId: primaryUserId,
      action: 'update_care_circle_permissions',
      resourceType: 'care_circle',
      resourceId: `${primaryUserId}:${secondaryUserId}`,
      details: {
        secondaryUserId,
        newPermissions: request.permissions,
      },
      ipAddress: event.requestContext.identity?.sourceIp,
      userAgent: event.requestContext.identity?.userAgent,
    });

    return createSuccessResponse({
      message: 'Care circle permissions updated successfully',
      primaryUserId,
      secondaryUserId,
      permissions: request.permissions,
    });
  } catch (error) {
    console.error('Error updating care circle permissions:', error);
    return createErrorResponse(500, 'Failed to update care circle permissions');
  }
}
