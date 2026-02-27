// API Gateway Authorizer Lambda Function
// Requirements: 8.2, 8.4, 8.5 - JWT validation, authorization, and permission system with audit logging
// Task 16.3: Enhanced JWT token validation with role-based access control

import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent, APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { logAuditEvent } from '../shared/audit-logger';
import { checkPermission, DataType } from '../shared/access-control';

// Environment variables
const PRIMARY_USER_POOL_ID = process.env.PRIMARY_USER_POOL_ID!;
const SECONDARY_USER_POOL_ID = process.env.SECONDARY_USER_POOL_ID!;
const PRIMARY_CLIENT_ID = process.env.PRIMARY_CLIENT_ID!;
const SECONDARY_CLIENT_ID = process.env.SECONDARY_CLIENT_ID!;

// JWT Verifiers for both user pools with enhanced validation
const primaryVerifier = CognitoJwtVerifier.create({
  userPoolId: PRIMARY_USER_POOL_ID,
  tokenUse: 'access',
  clientId: PRIMARY_CLIENT_ID,
  // Additional JWT validation
  includeRawJwtInErrors: false, // Security: Don't expose raw JWT in errors
});

const secondaryVerifier = CognitoJwtVerifier.create({
  userPoolId: SECONDARY_USER_POOL_ID,
  tokenUse: 'access',
  clientId: SECONDARY_CLIENT_ID,
  includeRawJwtInErrors: false,
});

interface TokenPayload {
  sub: string;
  email: string;
  'cognito:groups'?: string[];
  'custom:userType'?: 'primary' | 'secondary';
  'custom:role'?: string;
  exp: number; // Token expiration
  iat: number; // Token issued at
  token_use: string;
}

// Role-based access control mapping
// Requirements: 8.4 - Implement role-based access control
const ROLE_PERMISSIONS = {
  primary_user: {
    allowedResources: [
      '/health/vitals',
      '/health/data/*',
      '/health/report',
      '/medications/*',
      '/appointments/*',
      '/alerts/*',
      '/care-circle/*',
      '/devices/*',
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
  secondary_user: {
    allowedResources: [
      '/health/trends/*',
      '/health/data/*',
      '/health/report',
      '/medications/adherence',
      '/medications/care-circle-summary',
      '/appointments',
      '/alerts',
      '/alerts/preferences',
      '/care-circle/*',
    ],
    allowedMethods: ['GET', 'POST'], // Read-only with limited write (messages, preferences)
  },
  admin: {
    allowedResources: ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
};

/**
 * Main authorizer handler with JWT validation and RBAC
 * Requirements: 8.2, 8.4 - JWT token validation and role-based access control
 * Task 16.3: Enhanced authentication and authorization
 */
export async function handler(
  event: APIGatewayTokenAuthorizerEvent | APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  const startTime = Date.now();
  
  try {
    // Extract token from event
    const token = extractToken(event);
    
    if (!token) {
      await logFailedAuth(event, 'No token provided');
      throw new Error('Unauthorized');
    }

    // Verify JWT token and extract payload
    const { payload, userType } = await verifyToken(token);

    // Validate token expiration (additional check beyond JWT library)
    validateTokenExpiration(payload);

    const userId = payload.sub;
    const email = payload.email;
    const role = determineRole(userType, payload);

    // Extract resource and method from event
    const { resource, method } = extractResourceInfo(event);

    // Check role-based access control
    const hasAccess = checkRoleBasedAccess(role, resource, method);
    
    if (!hasAccess) {
      await logAccessDenied(userId, userType, email, resource, method, event);
      return generatePolicy(userId, 'Deny', event.methodArn, {
        userType,
        email,
        role,
        reason: 'Insufficient permissions',
      });
    }

    // Log successful authentication with comprehensive audit trail
    // Requirements: 8.4 - Add request logging for audit trail
    await logAuditEvent({
      eventType: 'AUTHENTICATION_SUCCESS',
      userId,
      userType,
      email,
      resource: event.methodArn,
      action: method,
      timestamp: new Date().toISOString(),
      success: true,
      ipAddress: extractIpAddress(event),
      userAgent: extractUserAgent(event),
      dataAccessed: [resource],
      permissionsChecked: [role],
      metadata: {
        tokenIssuedAt: new Date(payload.iat * 1000).toISOString(),
        tokenExpires: new Date(payload.exp * 1000).toISOString(),
        authDuration: Date.now() - startTime,
      },
    });

    // Generate allow policy with context
    const policy = generatePolicy(userId, 'Allow', event.methodArn, {
      userType,
      email,
      role,
      groups: payload['cognito:groups'] || [],
      userId,
    });

    return policy;
  } catch (error) {
    console.error('Authorization error:', error);
    
    // Log failed authentication attempt with details
    await logFailedAuth(event, error instanceof Error ? error.message : 'Unknown error');

    throw new Error('Unauthorized');
  }
}

/**
 * Extract token from authorization header
 */
function extractToken(event: APIGatewayTokenAuthorizerEvent | APIGatewayRequestAuthorizerEvent): string | null {
  if ('authorizationToken' in event) {
    // Token authorizer event
    return event.authorizationToken?.replace('Bearer ', '') || null;
  } else if ('headers' in event) {
    // Request authorizer event
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    return authHeader?.replace('Bearer ', '') || null;
  }
  return null;
}

/**
 * Verify JWT token with both user pools
 * Requirements: 8.2 - JWT token validation
 */
async function verifyToken(token: string): Promise<{ payload: TokenPayload; userType: 'primary' | 'secondary' }> {
  // Try to verify with primary user pool first
  try {
    const payload = await primaryVerifier.verify(token) as TokenPayload;
    return { payload, userType: 'primary' };
  } catch (primaryError) {
    // If primary verification fails, try secondary
    try {
      const payload = await secondaryVerifier.verify(token) as TokenPayload;
      return { payload, userType: 'secondary' };
    } catch (secondaryError) {
      console.error('Token verification failed for both user pools', {
        primaryError: primaryError instanceof Error ? primaryError.message : 'Unknown',
        secondaryError: secondaryError instanceof Error ? secondaryError.message : 'Unknown',
      });
      throw new Error('Invalid token');
    }
  }
}

/**
 * Validate token expiration with buffer
 * Requirements: 8.2 - Enhanced JWT validation
 */
function validateTokenExpiration(payload: TokenPayload): void {
  const now = Math.floor(Date.now() / 1000);
  const expirationBuffer = 60; // 60 seconds buffer
  
  if (payload.exp < now + expirationBuffer) {
    throw new Error('Token expired or expiring soon');
  }
}

/**
 * Determine user role from user type and payload
 * Requirements: 8.4 - Role-based access control
 */
function determineRole(userType: 'primary' | 'secondary', payload: TokenPayload): string {
  // Check for custom role attribute
  if (payload['custom:role']) {
    return payload['custom:role'];
  }
  
  // Check for admin group
  const groups = payload['cognito:groups'] || [];
  if (groups.includes('admin') || groups.includes('Admin')) {
    return 'admin';
  }
  
  // Default role based on user type
  return userType === 'primary' ? 'primary_user' : 'secondary_user';
}

/**
 * Extract resource and method information from event
 */
function extractResourceInfo(event: APIGatewayTokenAuthorizerEvent | APIGatewayRequestAuthorizerEvent): { resource: string; method: string } {
  if ('methodArn' in event) {
    // Parse ARN: arn:aws:execute-api:region:account:api-id/stage/method/resource
    const arnParts = event.methodArn.split(':');
    const apiParts = arnParts[5]?.split('/') || [];
    const method = apiParts[2] || 'UNKNOWN';
    const resource = '/' + (apiParts.slice(3).join('/') || '');
    return { resource, method };
  }
  
  if ('requestContext' in event) {
    return {
      resource: event.requestContext?.resourcePath || '/',
      method: event.requestContext?.httpMethod || 'UNKNOWN',
    };
  }
  
  return { resource: '/', method: 'UNKNOWN' };
}

/**
 * Check role-based access control
 * Requirements: 8.4 - Implement role-based access control
 */
function checkRoleBasedAccess(role: string, resource: string, method: string): boolean {
  const roleConfig = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  
  if (!roleConfig) {
    console.warn(`Unknown role: ${role}`);
    return false;
  }

  // Check if method is allowed for this role
  if (!roleConfig.allowedMethods.includes(method)) {
    return false;
  }

  // Check if resource is allowed for this role
  const allowedResources = roleConfig.allowedResources;
  
  // Check for wildcard permission
  if (allowedResources.includes('*')) {
    return true;
  }

  // Check for exact match
  if (allowedResources.includes(resource)) {
    return true;
  }

  // Check for wildcard pattern match
  for (const allowedResource of allowedResources) {
    if (allowedResource.endsWith('/*')) {
      const prefix = allowedResource.slice(0, -2);
      if (resource.startsWith(prefix)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract IP address from event
 */
function extractIpAddress(event: APIGatewayTokenAuthorizerEvent | APIGatewayRequestAuthorizerEvent): string | undefined {
  if ('requestContext' in event) {
    return event.requestContext?.identity?.sourceIp;
  }
  return undefined;
}

/**
 * Extract user agent from event
 */
function extractUserAgent(event: APIGatewayTokenAuthorizerEvent | APIGatewayRequestAuthorizerEvent): string | undefined {
  if ('requestContext' in event) {
    return event.requestContext?.identity?.userAgent;
  }
  return undefined;
}

/**
 * Log access denied event
 * Requirements: 8.4 - Add request logging for audit trail
 */
async function logAccessDenied(
  userId: string,
  userType: string,
  email: string,
  resource: string,
  method: string,
  event: APIGatewayTokenAuthorizerEvent | APIGatewayRequestAuthorizerEvent
): Promise<void> {
  await logAuditEvent({
    eventType: 'ACCESS_DENIED',
    userId,
    userType,
    email,
    resource: event.methodArn,
    action: method,
    timestamp: new Date().toISOString(),
    success: false,
    ipAddress: extractIpAddress(event),
    userAgent: extractUserAgent(event),
    dataAccessed: [resource],
    errorMessage: 'Insufficient permissions for requested resource',
  });
}

/**
 * Log failed authentication
 * Requirements: 8.4 - Add request logging for audit trail
 */
async function logFailedAuth(
  event: APIGatewayTokenAuthorizerEvent | APIGatewayRequestAuthorizerEvent,
  errorMessage: string
): Promise<void> {
  await logAuditEvent({
    eventType: 'AUTHENTICATION_FAILED',
    userId: 'unknown',
    userType: 'unknown',
    resource: event.methodArn,
    timestamp: new Date().toISOString(),
    success: false,
    ipAddress: extractIpAddress(event),
    userAgent: extractUserAgent(event),
    errorMessage,
  });
}

/**
 * Generate IAM policy for API Gateway
 * Requirements: 8.4 - Authorization policy generation
 */
function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context: Record<string, unknown>
): APIGatewayAuthorizerResult {
  // For Allow policies, grant access to all resources in the API
  // This allows the Lambda to authorize once and let the API handle routing
  const resourceArn = effect === 'Allow' 
    ? resource.split('/').slice(0, -2).join('/') + '/*'
    : resource;

  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resourceArn,
        },
      ],
    },
    context: {
      // Convert all context values to strings for API Gateway
      ...Object.entries(context).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
        return acc;
      }, {} as Record<string, string>),
    },
  };
}

/**
 * Validate request context for additional security checks
 * Requirements: 8.2, 8.4 - Enhanced security validation
 */
export function validateRequestContext(
  userId: string,
  userType: 'primary' | 'secondary',
  targetUserId: string,
  dataType: DataType
): Promise<boolean> {
  // Delegate to access control module for permission checking
  return checkPermission(userId, userType, targetUserId, dataType, 'read');
}
