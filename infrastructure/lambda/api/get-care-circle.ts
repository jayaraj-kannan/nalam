// Get Care Circle Lambda Function
// Requirements: 4.1, 4.5
// Retrieves care circle members and their permissions for a primary user

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, CareCircleMember } from '../shared/types';
import { getCareCircleMembers } from '../shared/data-access/care-circle';
import { getUser } from '../shared/data-access/users';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Get userId from path parameters
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return createErrorResponse(400, 'userId is required in path');
    }

    // Get requesting user from authorizer context
    const requestingUserId = event.requestContext.authorizer?.claims?.sub;
    if (!requestingUserId) {
      return createErrorResponse(401, 'Unauthorized');
    }

    // Check if requesting user is the primary user or a care circle member
    if (requestingUserId !== userId) {
      const member = await getCareCircleMembers(userId);
      const isMember = member.some(m => m.secondaryUserId === requestingUserId);
      
      if (!isMember) {
        return createErrorResponse(403, 'You do not have permission to view this care circle');
      }
    }

    // Get care circle members
    const relationships = await getCareCircleMembers(userId);

    // Enrich with user profile information
    const members: CareCircleMember[] = await Promise.all(
      relationships.map(async (rel) => {
        const user = await getUser(rel.secondaryUserId);
        return {
          userId: rel.secondaryUserId,
          profile: user?.profile || {
            firstName: 'Unknown',
            lastName: 'User',
            email: '',
            phone: '',
            dateOfBirth: '',
          },
          relationship: rel.relationship,
          permissions: rel.permissions,
          joinedAt: new Date(rel.joinedAt),
          lastActive: new Date(rel.lastActive),
        };
      })
    );

    return createSuccessResponse({
      primaryUserId: userId,
      members,
      memberCount: members.length,
    });
  } catch (error) {
    console.error('Error getting care circle:', error);
    return createErrorResponse(500, 'Failed to retrieve care circle');
  }
}
