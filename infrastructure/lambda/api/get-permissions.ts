// Get Care Circle Permissions API Endpoint
// Requirements: 8.4, 8.5 - View permission matrix

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { getEffectivePermissions } from '../shared/access-control';
import { getCareCircleMembers } from '../shared/data-access/care-circle';
import { logCareCircleAccess } from '../shared/audit-logger';

/**
 * Get permissions for care circle members
 * Requirements: 8.4, 8.5 - View permission matrix
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract user info from authorizer context
    const requestingUserId = event.requestContext.authorizer?.principalId;
    const requestingUserType = event.requestContext.authorizer?.userType as 'primary' | 'secondary';
    
    if (!requestingUserId || !requestingUserType) {
      return createErrorResponse(401, 'Unauthorized: Missing user context');
    }

    // Get target user ID from path parameters
    const targetUserId = event.pathParameters?.userId;
    
    if (!targetUserId) {
      return createErrorResponse(400, 'Missing userId parameter');
    }

    // Primary users can view their own care circle permissions
    if (requestingUserType === 'primary' && requestingUserId === targetUserId) {
      const members = await getCareCircleMembers(requestingUserId);
      
      const permissionMatrix = members.reduce((matrix, member) => {
        matrix[member.secondaryUserId] = {
          permissions: member.permissions,
          relationship: member.relationship,
          joinedAt: member.joinedAt,
          lastActive: member.lastActive,
        };
        return matrix;
      }, {} as Record<string, any>);

      await logCareCircleAccess(
        requestingUserId,
        requestingUserId,
        'view-permission-matrix',
        true,
        ['self-access'],
        { memberCount: members.length }
      );

      return createSuccessResponse({
        userId: requestingUserId,
        permissionMatrix,
        memberCount: members.length,
      });
    }

    // Secondary users can view their own permissions for a primary user
    if (requestingUserType === 'secondary') {
      const permissions = await getEffectivePermissions(requestingUserId, targetUserId);
      
      if (!permissions) {
        return createErrorResponse(403, 'Forbidden: Not a care circle member');
      }

      return createSuccessResponse({
        primaryUserId: targetUserId,
        secondaryUserId: requestingUserId,
        permissions,
      });
    }

    return createErrorResponse(403, 'Forbidden: Cannot view other users\' permissions');
  } catch (error) {
    console.error('Get permissions error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}
