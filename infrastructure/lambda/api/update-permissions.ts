// Update Care Circle Permissions API Endpoint
// Requirements: 8.4, 8.5 - Permission management with audit logging

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, PermissionSet } from '../shared/types';
import { getCareCircleMember, updateCareCirclePermissions } from '../shared/data-access/care-circle';
import { logPermissionChange } from '../shared/audit-logger';

/**
 * Update permissions for a care circle member
 * Requirements: 8.5 - Allow primary users to control data sharing
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract user info from authorizer context
    const requestingUserId = event.requestContext.authorizer?.principalId;
    const requestingUserType = event.requestContext.authorizer?.userType as 'primary' | 'secondary';
    
    if (!requestingUserId || !requestingUserType) {
      return createErrorResponse(401, 'Unauthorized: Missing user context');
    }

    // Only primary users can update permissions for their care circle
    if (requestingUserType !== 'primary') {
      return createErrorResponse(403, 'Forbidden: Only primary users can update permissions');
    }

    // Get target secondary user ID from path parameters
    const secondaryUserId = event.pathParameters?.secondaryUserId;
    
    if (!secondaryUserId) {
      return createErrorResponse(400, 'Missing secondaryUserId parameter');
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const newPermissions: Partial<PermissionSet> = body.permissions;

    if (!newPermissions || typeof newPermissions !== 'object') {
      return createErrorResponse(400, 'Invalid permissions object');
    }

    // Validate permission keys
    const validPermissionKeys: (keyof PermissionSet)[] = [
      'canViewVitals',
      'canViewMedications',
      'canViewAppointments',
      'canViewHealthRecords',
      'canReceiveAlerts',
      'canSendMessages',
      'canManageDevices',
    ];

    const invalidKeys = Object.keys(newPermissions).filter(
      (key) => !validPermissionKeys.includes(key as keyof PermissionSet)
    );

    if (invalidKeys.length > 0) {
      return createErrorResponse(400, `Invalid permission keys: ${invalidKeys.join(', ')}`);
    }

    // Validate permission values (must be boolean)
    const invalidValues = Object.entries(newPermissions).filter(
      ([_, value]) => typeof value !== 'boolean'
    );

    if (invalidValues.length > 0) {
      return createErrorResponse(400, 'Permission values must be boolean');
    }

    // Get current care circle member
    const member = await getCareCircleMember(requestingUserId, secondaryUserId);
    
    if (!member) {
      return createErrorResponse(404, 'Care circle member not found');
    }

    // Store old permissions for audit log
    const oldPermissions = { ...member.permissions };

    // Merge new permissions with existing ones
    const updatedPermissions: PermissionSet = {
      ...member.permissions,
      ...newPermissions,
    };

    // Update permissions in database
    await updateCareCirclePermissions(
      requestingUserId,
      secondaryUserId,
      updatedPermissions
    );

    // Log permission change for audit trail
    await logPermissionChange(
      requestingUserId,
      requestingUserType,
      secondaryUserId,
      requestingUserId,
      oldPermissions,
      updatedPermissions,
      {
        relationship: member.relationship,
        changedFields: Object.keys(newPermissions),
      }
    );

    return createSuccessResponse({
      message: 'Permissions updated successfully',
      primaryUserId: requestingUserId,
      secondaryUserId,
      oldPermissions,
      newPermissions: updatedPermissions,
      changedFields: Object.keys(newPermissions),
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}
