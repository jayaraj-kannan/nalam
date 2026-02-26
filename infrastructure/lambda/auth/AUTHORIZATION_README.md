# Authorization and Permission System

## Overview

This authorization system implements comprehensive access control for the Healthcare Monitoring App, ensuring that care circle members can only access health data they have explicit permissions for, with full audit logging of all access events.

**Requirements Implemented:** 8.4, 8.5

## Components

### 1. API Gateway Authorizer (`authorizer.ts`)

Lambda function that validates JWT tokens from both primary and secondary user pools.

**Features:**
- Validates tokens from both Cognito user pools
- Extracts user information (ID, type, email)
- Generates IAM policies for API Gateway
- Logs all authentication attempts (successful and failed)

**Environment Variables:**
- `PRIMARY_USER_POOL_ID` - Cognito user pool ID for primary users
- `SECONDARY_USER_POOL_ID` - Cognito user pool ID for secondary users
- `PRIMARY_CLIENT_ID` - Client ID for primary user pool
- `SECONDARY_CLIENT_ID` - Client ID for secondary user pool

### 2. Audit Logger (`shared/audit-logger.ts`)

Comprehensive audit logging system that tracks all access events.

**Features:**
- Logs to both DynamoDB and CloudWatch Logs
- 7-year retention for HIPAA compliance
- Tracks authentication, data access, permission changes, and care circle access
- Non-blocking (failures don't break application flow)

**Log Types:**
- `AUTHENTICATION` - Successful logins
- `AUTHENTICATION_FAILED` - Failed login attempts
- `DATA_ACCESS` - Health data access events
- `PERMISSION_CHANGE` - Permission modifications
- `CARE_CIRCLE_ACCESS` - Care circle member access

### 3. Access Control Logic (`shared/access-control.ts`)

Core permission checking and data filtering logic.

**Permission Matrix:**
```typescript
{
  vitals: 'canViewVitals',
  medications: 'canViewMedications',
  appointments: 'canViewAppointments',
  healthRecords: 'canViewHealthRecords',
  alerts: 'canReceiveAlerts',
  messages: 'canSendMessages',
  devices: 'canManageDevices',
}
```

**Key Functions:**
- `checkPermission()` - Verify single permission
- `checkMultiplePermissions()` - Batch permission checks
- `verifyCareCircleMembership()` - Validate care circle relationships
- `getEffectivePermissions()` - Retrieve permission set
- `filterDataByPermissions()` - Filter data based on permissions
- `checkWriteAccess()` - Validate write operations

**Permission Presets:**
- `DEFAULT_PERMISSIONS` - Standard access for new members
- `FULL_ACCESS_PERMISSIONS` - Complete access for close family
- `LIMITED_ACCESS_PERMISSIONS` - Restricted access for distant relatives

### 4. API Endpoints

#### Get Health Data (`api/get-health-data.ts`)
```
GET /api/v1/health/{userId}?dataTypes=vitals,medications
```
Retrieves health data with permission filtering.

#### Update Permissions (`api/update-permissions.ts`)
```
PUT /api/v1/care-circle/{secondaryUserId}/permissions
Body: { "permissions": { "canViewVitals": true, ... } }
```
Updates care circle member permissions (primary users only).

#### Get Permissions (`api/get-permissions.ts`)
```
GET /api/v1/care-circle/{userId}/permissions
```
Retrieves permission matrix or individual permissions.

## Access Control Rules

### Primary Users
- Full access to their own data
- Cannot access other primary users' data
- Can modify permissions for their care circle members
- All write operations logged

### Secondary Users
- Read-only access based on explicit permissions
- Must be care circle members
- Cannot write data
- All access logged with permission checks

## Audit Logging

All access events are logged with:
- User ID and type
- Target user ID (for data access)
- Action performed
- Success/failure status
- Timestamp
- IP address and user agent
- Permissions checked
- Additional metadata

## Security Features

1. **Multi-Factor Authentication** - Required for all users
2. **JWT Token Validation** - Secure token verification
3. **Permission-Based Access Control** - Granular data access
4. **Audit Trail** - Complete access history
5. **HIPAA Compliance** - 7-year log retention
6. **Encryption** - All data encrypted at rest and in transit

## Usage Examples

### Check Permission
```typescript
const hasAccess = await checkPermission(
  'secondary-user-123',
  'secondary',
  'primary-user-456',
  'vitals',
  'read'
);
```

### Filter Data
```typescript
const permissions = await getEffectivePermissions(
  secondaryUserId,
  primaryUserId
);

const filteredData = filterDataByPermissions(
  userData,
  permissions,
  dataTypeMap
);
```

### Update Permissions
```typescript
await updateCareCirclePermissions(
  primaryUserId,
  secondaryUserId,
  {
    canViewVitals: true,
    canViewMedications: true,
    canViewHealthRecords: false,
  }
);
```

## Testing

Unit tests are provided for:
- Access control logic
- Audit logging
- Permission checking
- Data filtering

Run tests:
```bash
npm test -- access-control.test
npm test -- audit-logger.test
```

## Deployment

The authorization system is deployed as part of the CDK stack:

1. **Authorizer Lambda** - Attached to API Gateway
2. **Audit Log Table** - DynamoDB table for queryable logs
3. **CloudWatch Log Group** - Real-time log monitoring
4. **IAM Roles** - Appropriate permissions for Lambda functions

## Monitoring

Monitor authorization system health:
- CloudWatch Logs: `/healthcare-monitoring/audit`
- DynamoDB Table: `audit-logs`
- API Gateway metrics: Authorization failures
- Lambda metrics: Authorizer execution time

## Future Enhancements

- Time-based permissions (temporary access)
- Emergency override permissions
- Permission templates for common relationships
- Bulk permission updates
- Permission change notifications
