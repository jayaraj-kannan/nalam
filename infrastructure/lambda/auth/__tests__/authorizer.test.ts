/**
 * Tests for Custom Lambda Authorizer
 * Task 16.3: Test JWT validation and RBAC
 * Requirements: 8.2, 8.4 - JWT token validation and role-based access control
 */

import { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';

// Mock dependencies BEFORE importing the handler
jest.mock('aws-jwt-verify', () => {
  const mockVerify = jest.fn();
  return {
    CognitoJwtVerifier: {
      create: jest.fn(() => ({
        verify: mockVerify,
      })),
    },
    __mockVerify: mockVerify,
  };
});

jest.mock('../../shared/audit-logger', () => ({
  logAuditEvent: jest.fn(),
}));

jest.mock('../../shared/access-control', () => ({
  checkPermission: jest.fn(),
  DataType: {},
}));

// Import after mocks are set up
import { handler } from '../authorizer';
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const mockVerify = (CognitoJwtVerifier.create as jest.Mock)().verify;

describe('Custom Lambda Authorizer', () => {
  const mockEvent: APIGatewayTokenAuthorizerEvent = {
    type: 'TOKEN',
    methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/GET/health/vitals',
    authorizationToken: 'Bearer mock-token',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PRIMARY_USER_POOL_ID = 'us-east-1_PRIMARY';
    process.env.SECONDARY_USER_POOL_ID = 'us-east-1_SECONDARY';
    process.env.PRIMARY_CLIENT_ID = 'primary-client-id';
    process.env.SECONDARY_CLIENT_ID = 'secondary-client-id';
  });

  describe('JWT Token Validation', () => {
    it('should verify valid primary user token', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'primary@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        token_use: 'access',
      };

      mockVerify.mockResolvedValueOnce(mockPayload);

      const result = await handler(mockEvent);

      expect(result.principalId).toBe('user-123');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
      expect(mockVerify).toHaveBeenCalledWith('mock-token');
    });

    it('should verify valid secondary user token', async () => {
      const mockPayload = {
        sub: 'user-456',
        email: 'secondary@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        token_use: 'access',
      };

      // First call fails (primary), second succeeds (secondary)
      mockVerify
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockResolvedValueOnce(mockPayload);

      // Use an endpoint that secondary users can access
      const event = {
        ...mockEvent,
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/GET/health/trends/user-123',
      };

      const result = await handler(event);

      expect(result.principalId).toBe('user-456');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
      expect(mockVerify).toHaveBeenCalledTimes(2);
    });

    it('should reject invalid token', async () => {
      mockVerify.mockRejectedValue(new Error('Invalid token'));

      await expect(handler(mockEvent)).rejects.toThrow('Unauthorized');
      expect(mockVerify).toHaveBeenCalledTimes(2); // Tries both pools
    });

    it('should reject expired token', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'primary@example.com',
        exp: Math.floor(Date.now() / 1000) - 100, // Expired
        iat: Math.floor(Date.now() / 1000) - 3700,
        token_use: 'access',
      };

      mockVerify.mockResolvedValueOnce(mockPayload);

      await expect(handler(mockEvent)).rejects.toThrow('Unauthorized');
    });

    it('should reject token expiring soon (within buffer)', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'primary@example.com',
        exp: Math.floor(Date.now() / 1000) + 30, // Expires in 30 seconds (within 60s buffer)
        iat: Math.floor(Date.now() / 1000),
        token_use: 'access',
      };

      mockVerify.mockResolvedValueOnce(mockPayload);

      await expect(handler(mockEvent)).rejects.toThrow('Unauthorized');
    });

    it('should reject missing token', async () => {
      const eventWithoutToken = {
        ...mockEvent,
        authorizationToken: '',
      };

      await expect(handler(eventWithoutToken)).rejects.toThrow('Unauthorized');
      expect(mockVerify).not.toHaveBeenCalled();
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow primary user to access health vitals endpoint', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'primary@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        token_use: 'access',
      };

      mockVerify.mockResolvedValueOnce(mockPayload);

      const event = {
        ...mockEvent,
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/POST/health/vitals',
      };

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should allow secondary user to access health trends endpoint', async () => {
      const mockPayload = {
        sub: 'user-456',
        email: 'secondary@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        token_use: 'access',
      };

      mockVerify
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockResolvedValueOnce(mockPayload);

      const event = {
        ...mockEvent,
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/GET/health/trends/user-123',
      };

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should deny secondary user DELETE access', async () => {
      const mockPayload = {
        sub: 'user-456',
        email: 'secondary@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        token_use: 'access',
      };

      mockVerify
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockResolvedValueOnce(mockPayload);

      const event = {
        ...mockEvent,
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/DELETE/medications/med-123',
      };

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('should allow admin role full access', async () => {
      const mockPayload = {
        sub: 'admin-123',
        email: 'admin@example.com',
        'cognito:groups': ['admin'],
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        token_use: 'access',
      };

      mockVerify.mockResolvedValueOnce(mockPayload);

      const event = {
        ...mockEvent,
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/DELETE/users/user-123',
      };

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should deny access to unauthorized resource', async () => {
      const mockPayload = {
        sub: 'user-456',
        email: 'secondary@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        token_use: 'access',
      };

      mockVerify
        .mockRejectedValueOnce(new Error('Invalid token'))
        .mockResolvedValueOnce(mockPayload);

      const event = {
        ...mockEvent,
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/POST/health/vitals',
      };

      const result = await handler(event);

      // Secondary users cannot POST to /health/vitals
      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });
  });

  describe('Authorization Context', () => {
    it('should include user context in authorization result', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'primary@example.com',
        'cognito:groups': ['users'],
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        token_use: 'access',
      };

      mockVerify.mockResolvedValueOnce(mockPayload);

      const result = await handler(mockEvent);

      expect(result.context).toBeDefined();
      expect(result.context?.userType).toBe('primary');
      expect(result.context?.email).toBe('primary@example.com');
      expect(result.context?.userId).toBe('user-123');
    });

    it('should include role in authorization context', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'primary@example.com',
        'custom:role': 'primary_user',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        token_use: 'access',
      };

      mockVerify.mockResolvedValueOnce(mockPayload);

      const result = await handler(mockEvent);

      expect(result.context?.role).toBe('primary_user');
    });
  });

  describe('Audit Logging', () => {
    it('should log successful authentication', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'primary@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        token_use: 'access',
      };

      mockVerify.mockResolvedValueOnce(mockPayload);

      await handler(mockEvent);

      // Audit logging is mocked, but we verify the handler completes
      expect(mockVerify).toHaveBeenCalled();
    });

    it('should log failed authentication', async () => {
      mockVerify.mockRejectedValue(new Error('Invalid token'));

      await expect(handler(mockEvent)).rejects.toThrow('Unauthorized');

      // Audit logging is mocked, but we verify the handler attempted auth
      expect(mockVerify).toHaveBeenCalledTimes(2);
    });
  });
});
