// Get Health Data API Endpoint with Authorization
// Requirements: 8.4, 8.5 - Authorized health data access with audit logging

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { checkPermission, filterDataByPermissions, getEffectivePermissions } from '../shared/access-control';
import { getUser } from '../shared/data-access/users';
import { logDataAccess } from '../shared/audit-logger';

/**
 * Get health data for a user with permission checks
 * Requirements: 8.4, 8.5 - Secure data access with permissions
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

    // Get data types requested (query parameter)
    const requestedDataTypes = event.queryStringParameters?.dataTypes?.split(',') || [
      'vitals',
      'medications',
      'appointments',
      'healthRecords',
    ];

    // Check permissions for each data type
    const permissionChecks = await Promise.all(
      requestedDataTypes.map(async (dataType) => {
        const hasPermission = await checkPermission(
          requestingUserId,
          requestingUserType,
          targetUserId,
          dataType as any,
          'read'
        );
        return { dataType, hasPermission };
      })
    );

    // Filter to only allowed data types
    const allowedDataTypes = permissionChecks
      .filter((check) => check.hasPermission)
      .map((check) => check.dataType);

    if (allowedDataTypes.length === 0) {
      await logDataAccess(
        requestingUserId,
        requestingUserType,
        targetUserId,
        'all',
        'read',
        false,
        requestedDataTypes,
        { reason: 'No permissions for any requested data types' }
      );
      return createErrorResponse(403, 'Forbidden: Insufficient permissions');
    }

    // Get user data
    const user = await getUser(targetUserId);
    
    if (!user) {
      return createErrorResponse(404, 'User not found');
    }

    // Get effective permissions for filtering
    let permissions;
    if (requestingUserType === 'secondary') {
      permissions = await getEffectivePermissions(requestingUserId, targetUserId);
      if (!permissions) {
        return createErrorResponse(403, 'Forbidden: Not a care circle member');
      }
    } else {
      // Primary user accessing own data - full permissions
      permissions = {
        canViewVitals: true,
        canViewMedications: true,
        canViewAppointments: true,
        canViewHealthRecords: true,
        canReceiveAlerts: true,
        canSendMessages: true,
        canManageDevices: true,
      };
    }

    // Filter user data based on permissions
    const filteredData = filterDataByPermissions(
      user,
      permissions,
      {
        healthProfile: 'healthRecords',
        devices: 'devices',
        preferences: 'healthRecords',
      }
    );

    // Log successful access
    await logDataAccess(
      requestingUserId,
      requestingUserType,
      targetUserId,
      'user-data',
      'read',
      true,
      allowedDataTypes,
      {
        dataTypesAccessed: allowedDataTypes,
        dataTypesRequested: requestedDataTypes,
      }
    );

    return createSuccessResponse({
      userId: targetUserId,
      data: filteredData,
      allowedDataTypes,
      requestedDataTypes,
    });
  } catch (error) {
    console.error('Get health data error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}
