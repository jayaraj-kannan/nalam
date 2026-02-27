/**
 * API Middleware for Lambda Functions
 * Task 16.3: Request logging middleware for comprehensive audit trail
 * Requirements: 8.4 - Add request logging for audit trail
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { logApiRequest, logSecurityEvent } from './audit-logger';

export interface AuthContext {
  userId: string;
  userType: 'primary' | 'secondary';
  email: string;
  role: string;
}

/**
 * Extract auth context from API Gateway event
 */
export function extractAuthContext(event: APIGatewayProxyEvent): AuthContext | null {
  try {
    const authorizer = event.requestContext?.authorizer;
    
    if (!authorizer) {
      return null;
    }

    return {
      userId: authorizer.userId || authorizer.principalId || 'unknown',
      userType: authorizer.userType || 'unknown',
      email: authorizer.email || 'unknown',
      role: authorizer.role || 'unknown',
    };
  } catch (error) {
    console.error('Failed to extract auth context:', error);
    return null;
  }
}

/**
 * Middleware wrapper for Lambda handlers with automatic request logging
 * Requirements: 8.4 - Comprehensive request logging
 */
export function withRequestLogging<TEvent = APIGatewayProxyEvent, TResult = APIGatewayProxyResult>(
  handler: (event: TEvent, context: Context) => Promise<TResult>
) {
  return async (event: TEvent, context: Context): Promise<TResult> => {
    const startTime = Date.now();
    const requestId = context.requestId;
    
    // Extract request information
    const apiEvent = event as unknown as APIGatewayProxyEvent;
    const authContext = extractAuthContext(apiEvent);
    const method = apiEvent.httpMethod || 'UNKNOWN';
    const path = apiEvent.path || apiEvent.resource || '/';
    const ipAddress = apiEvent.requestContext?.identity?.sourceIp;
    const userAgent = apiEvent.requestContext?.identity?.userAgent;

    try {
      // Execute the handler
      const result = await handler(event, context);
      const duration = Date.now() - startTime;

      // Extract status code from result
      const apiResult = result as unknown as APIGatewayProxyResult;
      const statusCode = apiResult.statusCode || 200;
      const responseSize = apiResult.body ? apiResult.body.length : 0;

      // Log successful request
      if (authContext) {
        await logApiRequest(
          authContext.userId,
          authContext.userType,
          method,
          path,
          statusCode,
          requestId,
          duration,
          ipAddress,
          userAgent,
          apiEvent.body ? JSON.parse(apiEvent.body) : undefined,
          responseSize,
          {
            queryParams: apiEvent.queryStringParameters,
            pathParams: apiEvent.pathParameters,
          }
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failed request
      if (authContext) {
        await logApiRequest(
          authContext.userId,
          authContext.userType,
          method,
          path,
          500,
          requestId,
          duration,
          ipAddress,
          userAgent,
          apiEvent.body ? JSON.parse(apiEvent.body) : undefined,
          0,
          {
            error: errorMessage,
            queryParams: apiEvent.queryStringParameters,
            pathParams: apiEvent.pathParameters,
          }
        );
      }

      throw error;
    }
  };
}

/**
 * Rate limiting check (simple in-memory implementation)
 * For production, use DynamoDB or ElastiCache
 * Requirements: 8.4 - Security monitoring
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export async function checkRateLimit(
  userId: string,
  userType: string,
  ipAddress: string | undefined,
  limit: number = 100,
  windowMs: number = 60000
): Promise<boolean> {
  const key = `${userId}-${ipAddress}`;
  const now = Date.now();
  
  const record = requestCounts.get(key);
  
  if (!record || now > record.resetTime) {
    // Reset or create new record
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    // Rate limit exceeded
    await logSecurityEvent(
      'RATE_LIMIT_EXCEEDED',
      userId,
      userType,
      'medium',
      `Rate limit exceeded: ${record.count} requests in window`,
      ipAddress,
      { limit, windowMs, currentCount: record.count }
    );
    return false;
  }
  
  // Increment count
  record.count++;
  return true;
}

/**
 * Validate request body against schema
 * Requirements: 8.4 - Input validation
 */
export function validateRequestBody<T>(
  body: unknown,
  requiredFields: string[]
): { valid: boolean; errors: string[]; data?: T } {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body is required'] };
  }
  
  const data = body as Record<string, unknown>;
  
  for (const field of requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true, errors: [], data: data as T };
}

/**
 * Create standardized API response
 */
export function createApiResponse(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {}
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

/**
 * Create error response with proper logging
 */
export function createErrorResponse(
  statusCode: number,
  message: string,
  code?: string
): APIGatewayProxyResult {
  return createApiResponse(statusCode, {
    error: {
      message,
      code: code || `ERROR_${statusCode}`,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): APIGatewayProxyResult {
  return createApiResponse(statusCode, {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
}
