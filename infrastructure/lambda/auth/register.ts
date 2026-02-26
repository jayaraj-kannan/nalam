import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, SignUpCommand, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createSuccessResponse, createErrorResponse, UserProfile, PrimaryUser, SecondaryUser } from '../shared/types';

const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const PRIMARY_USER_POOL_ID = process.env.PRIMARY_USER_POOL_ID!;
const SECONDARY_USER_POOL_ID = process.env.SECONDARY_USER_POOL_ID!;
const PRIMARY_USER_POOL_CLIENT_ID = process.env.PRIMARY_USER_POOL_CLIENT_ID!;
const SECONDARY_USER_POOL_CLIENT_ID = process.env.SECONDARY_USER_POOL_CLIENT_ID!;
const USERS_TABLE = process.env.USERS_TABLE!;

interface RegisterRequest {
  email: string;
  password: string;
  userType: 'primary' | 'secondary';
  profile: UserProfile;
  phoneNumber?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const request: RegisterRequest = JSON.parse(event.body);
    const { email, password, userType, profile, phoneNumber } = request;

    // Validate required fields
    if (!email || !password || !userType || !profile) {
      return createErrorResponse(400, 'Missing required fields: email, password, userType, profile');
    }

    if (!['primary', 'secondary'].includes(userType)) {
      return createErrorResponse(400, 'userType must be either "primary" or "secondary"');
    }

    // Select appropriate user pool based on user type
    const userPoolId = userType === 'primary' ? PRIMARY_USER_POOL_ID : SECONDARY_USER_POOL_ID;
    const clientId = userType === 'primary' ? PRIMARY_USER_POOL_CLIENT_ID : SECONDARY_USER_POOL_CLIENT_ID;

    // Register user in Cognito
    const signUpCommand = new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'given_name', Value: profile.firstName },
        { Name: 'family_name', Value: profile.lastName },
        ...(phoneNumber ? [{ Name: 'phone_number', Value: phoneNumber }] : []),
      ],
    });

    const signUpResult = await cognitoClient.send(signUpCommand);
    const userId = signUpResult.UserSub!;

    // Add user to appropriate group
    const groupName = userType === 'primary' ? 'PrimaryUsers' : 'SecondaryUsers';
    try {
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: email,
        GroupName: groupName,
      }));
    } catch (error) {
      console.warn(`Group ${groupName} may not exist yet:`, error);
    }

    // Create user record in DynamoDB
    const timestamp = new Date().toISOString();
    
    if (userType === 'primary') {
      const primaryUser: PrimaryUser = {
        id: userId,
        profile: {
          ...profile,
          phone: phoneNumber || profile.phone,
        },
        healthProfile: {
          conditions: [],
          medications: [],
          allergies: [],
          emergencyContacts: [],
          healthcareProviders: [],
          baselineVitals: {
            heartRate: { min: 60, max: 100 },
            bloodPressure: {
              systolic: { min: 90, max: 140 },
              diastolic: { min: 60, max: 90 },
            },
            temperature: { min: 97.0, max: 99.5 },
            oxygenSaturation: { min: 95, max: 100 },
            weight: { min: 0, max: 500 },
          },
        },
        careCircle: [],
        preferences: {
          fontSize: 'large',
          contrast: 'high',
          voiceNavigation: false,
          screenReader: false,
          language: 'en',
          timezone: 'UTC',
          notificationChannels: ['push', 'email'],
        },
        devices: [],
        createdAt: new Date(timestamp),
        lastActive: new Date(timestamp),
      };

      await dynamoClient.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          userId,
          email,
          userType: 'primary',
          ...primaryUser,
          createdAt: timestamp,
          lastActive: timestamp,
        },
      }));
    } else {
      const secondaryUser: SecondaryUser = {
        id: userId,
        profile: {
          ...profile,
          phone: phoneNumber || profile.phone,
        },
        primaryUsers: [],
        alertPreferences: {
          channels: ['push', 'email', 'sms'],
          alertTypes: {},
        },
        permissions: {
          canViewVitals: true,
          canViewMedications: true,
          canViewAppointments: true,
          canViewHealthRecords: true,
          canReceiveAlerts: true,
          canSendMessages: true,
          canManageDevices: false,
        },
        createdAt: new Date(timestamp),
      };

      await dynamoClient.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          userId,
          email,
          userType: 'secondary',
          ...secondaryUser,
          createdAt: timestamp,
        },
      }));
    }

    return createSuccessResponse({
      userId,
      email,
      userType,
      message: 'Registration successful. Please check your email to verify your account.',
      emailVerificationRequired: true,
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle specific Cognito errors
    if (error.name === 'UsernameExistsException') {
      return createErrorResponse(409, 'An account with this email already exists');
    }
    if (error.name === 'InvalidPasswordException') {
      return createErrorResponse(400, 'Password does not meet requirements: minimum 12 characters with uppercase, lowercase, numbers, and symbols');
    }
    if (error.name === 'InvalidParameterException') {
      return createErrorResponse(400, error.message || 'Invalid parameters provided');
    }

    return createErrorResponse(500, 'Registration failed. Please try again.');
  }
};
