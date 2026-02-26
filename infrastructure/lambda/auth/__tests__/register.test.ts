import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock AWS SDK clients before importing handler
jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

import { CognitoIdentityProviderClient, SignUpCommand, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../register';

const mockCognitoSend = jest.fn();
const mockDynamoSend = jest.fn();

(CognitoIdentityProviderClient as jest.Mock).mockImplementation(() => ({
  send: mockCognitoSend,
}));

(DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({
  send: mockDynamoSend,
});

describe('Register Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PRIMARY_USER_POOL_ID = 'test-primary-pool';
    process.env.SECONDARY_USER_POOL_ID = 'test-secondary-pool';
    process.env.PRIMARY_USER_POOL_CLIENT_ID = 'test-primary-client';
    process.env.SECONDARY_USER_POOL_CLIENT_ID = 'test-secondary-client';
    process.env.USERS_TABLE = 'test-users-table';
  });

  const createEvent = (body: any): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/auth/register',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  });

  test('should successfully register a primary user', async () => {
    const requestBody = {
      email: 'primary@example.com',
      password: 'SecurePass123!',
      userType: 'primary',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'primary@example.com',
        phone: '+1234567890',
        dateOfBirth: '1950-01-01',
      },
      phoneNumber: '+1234567890',
    };

    mockCognitoSend.mockResolvedValueOnce({
      UserSub: 'test-user-id-123',
    });
    mockCognitoSend.mockResolvedValueOnce({}); // AdminAddUserToGroupCommand
    mockDynamoSend.mockResolvedValueOnce({});

    const event = createEvent(requestBody);
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.userId).toBe('test-user-id-123');
    expect(body.userType).toBe('primary');
    expect(body.emailVerificationRequired).toBe(true);
    expect(mockCognitoSend).toHaveBeenCalledWith(expect.any(SignUpCommand));
    expect(mockDynamoSend).toHaveBeenCalledWith(expect.any(PutCommand));
  });

  test('should successfully register a secondary user', async () => {
    const requestBody = {
      email: 'secondary@example.com',
      password: 'SecurePass123!',
      userType: 'secondary',
      profile: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'secondary@example.com',
        phone: '+1234567890',
        dateOfBirth: '1980-01-01',
      },
    };

    mockCognitoSend.mockResolvedValueOnce({
      UserSub: 'test-user-id-456',
    });
    mockCognitoSend.mockResolvedValueOnce({});
    mockDynamoSend.mockResolvedValueOnce({});

    const event = createEvent(requestBody);
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.userId).toBe('test-user-id-456');
    expect(body.userType).toBe('secondary');
  });

  test('should return 400 when request body is missing', async () => {
    const event = createEvent(null);
    event.body = null;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Request body is required');
  });

  test('should return 400 when required fields are missing', async () => {
    const requestBody = {
      email: 'test@example.com',
      // Missing password, userType, profile
    };

    const event = createEvent(requestBody);
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('Missing required fields');
  });

  test('should return 400 when userType is invalid', async () => {
    const requestBody = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      userType: 'invalid',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        dateOfBirth: '1990-01-01',
      },
    };

    const event = createEvent(requestBody);
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('userType must be either "primary" or "secondary"');
  });

  test('should return 409 when user already exists', async () => {
    const requestBody = {
      email: 'existing@example.com',
      password: 'SecurePass123!',
      userType: 'primary',
      profile: {
        firstName: 'Existing',
        lastName: 'User',
        email: 'existing@example.com',
        phone: '+1234567890',
        dateOfBirth: '1950-01-01',
      },
    };

    const error = new Error('User already exists');
    error.name = 'UsernameExistsException';
    mockCognitoSend.mockRejectedValueOnce(error);

    const event = createEvent(requestBody);
    const result = await handler(event);

    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('already exists');
  });

  test('should return 400 when password is invalid', async () => {
    const requestBody = {
      email: 'test@example.com',
      password: 'weak',
      userType: 'primary',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        dateOfBirth: '1950-01-01',
      },
    };

    const error = new Error('Password does not meet requirements');
    error.name = 'InvalidPasswordException';
    mockCognitoSend.mockRejectedValueOnce(error);

    const event = createEvent(requestBody);
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('Password does not meet requirements');
  });

  test('should handle DynamoDB errors gracefully', async () => {
    const requestBody = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      userType: 'primary',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        dateOfBirth: '1950-01-01',
      },
    };

    mockCognitoSend.mockResolvedValueOnce({
      UserSub: 'test-user-id-789',
    });
    mockCognitoSend.mockResolvedValueOnce({});
    mockDynamoSend.mockRejectedValueOnce(new Error('DynamoDB error'));

    const event = createEvent(requestBody);
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('Registration failed');
  });

  test('should create primary user with default baseline vitals', async () => {
    const requestBody = {
      email: 'primary@example.com',
      password: 'SecurePass123!',
      userType: 'primary',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'primary@example.com',
        phone: '+1234567890',
        dateOfBirth: '1950-01-01',
      },
    };

    mockCognitoSend.mockResolvedValueOnce({
      UserSub: 'test-user-id-123',
    });
    mockCognitoSend.mockResolvedValueOnce({});
    mockDynamoSend.mockResolvedValueOnce({});

    const event = createEvent(requestBody);
    await handler(event);

    expect(mockDynamoSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Item: expect.objectContaining({
            healthProfile: expect.objectContaining({
              baselineVitals: expect.objectContaining({
                heartRate: { min: 60, max: 100 },
                bloodPressure: {
                  systolic: { min: 90, max: 140 },
                  diastolic: { min: 60, max: 90 },
                },
              }),
            }),
          }),
        }),
      })
    );
  });
});
