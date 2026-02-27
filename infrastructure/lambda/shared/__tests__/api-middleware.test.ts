/**
 * Tests for API Middleware
 * Task 16.3: Test request logging middleware
 * Requirements: 8.4 - Request logging for audit trail
 */

import {
  withRequestLogging,
  extractAuthContext,
  checkRateLimit,
  validateRequestBody,
  createApiResponse,
  createErrorResponse,
  createSuccessResponse,
} from '../api-middleware';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Mock audit logger
jest.mock('../audit-logger');

describe('API Middleware', () => {
  const mockContext: Context = {
    requestId: 'test-request-id',
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
    memoryLimitInMB: '512',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test',
    logStreamName: '2024/01/01/test',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
    callbackWaitsForEmptyEventLoop: true,
  };

  const mockEvent: APIGatewayProxyEvent = {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/health/vitals',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      authorizer: {
        userId: 'user-123',
        userType: 'primary',
        email: 'test@example.com',
        role: 'primary_user',
      },
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      path: '/health/vitals',
      stage: 'prod',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'resource-id',
      resourcePath: '/health/vitals',
      identity: {
        sourceIp: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        user: null,
        userArn: null,
        clientCert: null,
      },
    },
    resource: '/health/vitals',
  };

  describe('extractAuthContext', () => {
    it('should extract auth context from event', () => {
      const context = extractAuthContext(mockEvent);

      expect(context).toEqual({
        userId: 'user-123',
        userType: 'primary',
        email: 'test@example.com',
        role: 'primary_user',
      });
    });

    it('should return null when no authorizer context', () => {
      const eventWithoutAuth = {
        ...mockEvent,
        requestContext: {
          ...mockEvent.requestContext,
          authorizer: undefined,
        },
      };

      const context = extractAuthContext(eventWithoutAuth);

      expect(context).toBeNull();
    });

    it('should handle missing authorizer gracefully', () => {
      const eventWithoutContext = {
        ...mockEvent,
        requestContext: undefined as any,
      };

      const context = extractAuthContext(eventWithoutContext);

      expect(context).toBeNull();
    });
  });

  describe('withRequestLogging', () => {
    it('should log successful request', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      });

      const wrappedHandler = withRequestLogging(mockHandler);
      const result = await wrappedHandler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(mockHandler).toHaveBeenCalledWith(mockEvent, mockContext);
    });

    it('should log failed request', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Test error'));

      const wrappedHandler = withRequestLogging(mockHandler);

      await expect(wrappedHandler(mockEvent, mockContext)).rejects.toThrow('Test error');
      expect(mockHandler).toHaveBeenCalledWith(mockEvent, mockContext);
    });

    it('should measure request duration', async () => {
      const mockHandler = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { statusCode: 200, body: '{}' };
      });

      const wrappedHandler = withRequestLogging(mockHandler);
      const startTime = Date.now();
      await wrappedHandler(mockEvent, mockContext);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Clear rate limit cache between tests
      jest.clearAllMocks();
    });

    it('should allow requests within rate limit', async () => {
      const allowed = await checkRateLimit('user-123', 'primary', '192.168.1.1', 10, 60000);

      expect(allowed).toBe(true);
    });

    it('should block requests exceeding rate limit', async () => {
      const userId = 'user-456';
      const ipAddress = '192.168.1.2';

      // Make requests up to the limit
      for (let i = 0; i < 10; i++) {
        const allowed = await checkRateLimit(userId, 'primary', ipAddress, 10, 60000);
        expect(allowed).toBe(true);
      }

      // Next request should be blocked
      const blocked = await checkRateLimit(userId, 'primary', ipAddress, 10, 60000);
      expect(blocked).toBe(false);
    });

    it('should reset rate limit after window expires', async () => {
      const userId = 'user-789';
      const ipAddress = '192.168.1.3';

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(userId, 'primary', ipAddress, 5, 100);
      }

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow new requests
      const allowed = await checkRateLimit(userId, 'primary', ipAddress, 5, 100);
      expect(allowed).toBe(true);
    });
  });

  describe('validateRequestBody', () => {
    it('should validate valid request body', () => {
      const body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      const result = validateRequestBody(body, ['name', 'email']);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.data).toEqual(body);
    });

    it('should reject missing required fields', () => {
      const body = {
        name: 'John Doe',
      };

      const result = validateRequestBody(body, ['name', 'email', 'age']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: email');
      expect(result.errors).toContain('Missing required field: age');
    });

    it('should reject null body', () => {
      const result = validateRequestBody(null, ['name']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Request body is required');
    });

    it('should reject non-object body', () => {
      const result = validateRequestBody('invalid', ['name']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Request body is required');
    });

    it('should reject fields with null values', () => {
      const body = {
        name: 'John Doe',
        email: null,
      };

      const result = validateRequestBody(body, ['name', 'email']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: email');
    });
  });

  describe('createApiResponse', () => {
    it('should create response with default headers', () => {
      const response = createApiResponse(200, { success: true });

      expect(response.statusCode).toBe(200);
      expect(response.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      });
      expect(JSON.parse(response.body)).toEqual({ success: true });
    });

    it('should merge custom headers', () => {
      const response = createApiResponse(200, { data: 'test' }, {
        'X-Custom-Header': 'custom-value',
      });

      expect(response.headers?.['X-Custom-Header']).toBe('custom-value');
      expect(response.headers?.['Content-Type']).toBe('application/json');
    });

    it('should include security headers', () => {
      const response = createApiResponse(200, {});

      expect(response.headers?.['X-Content-Type-Options']).toBe('nosniff');
      expect(response.headers?.['X-Frame-Options']).toBe('DENY');
      expect(response.headers?.['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with message', () => {
      const response = createErrorResponse(400, 'Invalid request');

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toBe('Invalid request');
      expect(body.error.code).toBe('ERROR_400');
      expect(body.error.timestamp).toBeDefined();
    });

    it('should include custom error code', () => {
      const response = createErrorResponse(404, 'Not found', 'RESOURCE_NOT_FOUND');

      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body.timestamp).toBeDefined();
    });

    it('should include optional message', () => {
      const response = createSuccessResponse({ id: '123' }, 'Created successfully', 201);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Created successfully');
    });

    it('should use custom status code', () => {
      const response = createSuccessResponse({ id: '123' }, undefined, 201);

      expect(response.statusCode).toBe(201);
    });
  });
});
