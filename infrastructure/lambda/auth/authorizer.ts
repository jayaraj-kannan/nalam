// API Gateway Authorizer Lambda Function
// Requirements: 8.4, 8.5 - Authorization and permission system with audit logging

import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { logAuditEvent } from '../shared/audit-logger';

// Environment variables
const PRIMARY_USER_POOL_ID = process.env.PRIMARY_USER_POOL_ID!;
const SECONDARY_USER_POOL_ID = process.env.SECONDARY_USER_POOL_ID!;
const PRIMARY_CLIENT_ID = process.env.PRIMARY_CLIENT_ID!;
const SECONDARY_CLIENT_ID = process.env.SECONDARY_CLIENT_ID!;

// JWT Verifiers for both user pools
const primaryVerifier = CognitoJwtVerifier.create({
  userPoolId: PRIMARY_USER_POOL_ID,
  tokenUse: 'access',
  clientId: PRIMARY_CLIENT_ID,
});

const secondaryVerifier = CognitoJwtVerifier.create({
  userPoolId: SECONDARY_USER_POOL_ID,
  tokenUse: 'access',
  clientId: SECONDARY_CLIENT_ID,
});

interface TokenPayload {
  sub: string;
  email: string;
  'cognito:groups'?: string[];
  'custom:userType'?: 'primary' | 'secondary';
}

export async function handler(
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  try {
    const token = event.authorizationToken.replace('Bearer ', '');
    
    // Try to verify with primary user pool first
    let payload: TokenPayload | null = null;
    let userType: 'primary' | 'secondary' = 'primary';
    
    try {
      payload = await primaryVerifier.verify(token) as TokenPayload;
      userType = 'primary';
    } catch (primaryError) {
      // If primary verification fails, try secondary
      try {
        payload = await secondaryVerifier.verify(token) as TokenPayload;
        userType = 'secondary';
      } catch (secondaryError) {
        console.error('Token verification failed for both user pools', {
          primaryError,
          secondaryError,
        });
        throw new Error('Unauthorized');
      }
    }

    if (!payload) {
      throw new Error('Unauthorized');
    }

    const userId = payload.sub;
    const email = payload.email;

    // Log authentication event for audit trail (Requirement 8.4)
    await logAuditEvent({
      eventType: 'AUTHENTICATION',
      userId,
      userType,
      email,
      resource: event.methodArn,
      timestamp: new Date().toISOString(),
      success: true,
      ipAddress: event.requestContext?.identity?.sourceIp,
      userAgent: event.requestContext?.identity?.userAgent,
    });

    // Generate IAM policy
    const policy = generatePolicy(userId, 'Allow', event.methodArn, {
      userType,
      email,
      groups: payload['cognito:groups'] || [],
    });

    return policy;
  } catch (error) {
    console.error('Authorization error:', error);
    
    // Log failed authentication attempt
    await logAuditEvent({
      eventType: 'AUTHENTICATION_FAILED',
      userId: 'unknown',
      userType: 'unknown',
      resource: event.methodArn,
      timestamp: new Date().toISOString(),
      success: false,
      ipAddress: event.requestContext?.identity?.sourceIp,
      userAgent: event.requestContext?.identity?.userAgent,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error('Unauthorized');
  }
}

function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context: Record<string, unknown>
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: {
      ...context,
      // Convert arrays and objects to strings for context
      userType: String(context.userType),
      email: String(context.email),
      groups: JSON.stringify(context.groups),
    },
  };
}
