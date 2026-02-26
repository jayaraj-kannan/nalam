"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const types_1 = require("../shared/types");
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({});
const dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
const PRIMARY_USER_POOL_ID = process.env.PRIMARY_USER_POOL_ID;
const SECONDARY_USER_POOL_ID = process.env.SECONDARY_USER_POOL_ID;
const PRIMARY_USER_POOL_CLIENT_ID = process.env.PRIMARY_USER_POOL_CLIENT_ID;
const SECONDARY_USER_POOL_CLIENT_ID = process.env.SECONDARY_USER_POOL_CLIENT_ID;
const USERS_TABLE = process.env.USERS_TABLE;
const handler = async (event) => {
    try {
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        const { email, password, userType, profile, phoneNumber } = request;
        // Validate required fields
        if (!email || !password || !userType || !profile) {
            return (0, types_1.createErrorResponse)(400, 'Missing required fields: email, password, userType, profile');
        }
        if (!['primary', 'secondary'].includes(userType)) {
            return (0, types_1.createErrorResponse)(400, 'userType must be either "primary" or "secondary"');
        }
        // Select appropriate user pool based on user type
        const userPoolId = userType === 'primary' ? PRIMARY_USER_POOL_ID : SECONDARY_USER_POOL_ID;
        const clientId = userType === 'primary' ? PRIMARY_USER_POOL_CLIENT_ID : SECONDARY_USER_POOL_CLIENT_ID;
        // Register user in Cognito
        const signUpCommand = new client_cognito_identity_provider_1.SignUpCommand({
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
        const userId = signUpResult.UserSub;
        // Add user to appropriate group
        const groupName = userType === 'primary' ? 'PrimaryUsers' : 'SecondaryUsers';
        try {
            await cognitoClient.send(new client_cognito_identity_provider_1.AdminAddUserToGroupCommand({
                UserPoolId: userPoolId,
                Username: email,
                GroupName: groupName,
            }));
        }
        catch (error) {
            console.warn(`Group ${groupName} may not exist yet:`, error);
        }
        // Create user record in DynamoDB
        const timestamp = new Date().toISOString();
        if (userType === 'primary') {
            const primaryUser = {
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
            await dynamoClient.send(new lib_dynamodb_1.PutCommand({
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
        }
        else {
            const secondaryUser = {
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
            await dynamoClient.send(new lib_dynamodb_1.PutCommand({
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
        return (0, types_1.createSuccessResponse)({
            userId,
            email,
            userType,
            message: 'Registration successful. Please check your email to verify your account.',
            emailVerificationRequired: true,
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        // Handle specific Cognito errors
        if (error.name === 'UsernameExistsException') {
            return (0, types_1.createErrorResponse)(409, 'An account with this email already exists');
        }
        if (error.name === 'InvalidPasswordException') {
            return (0, types_1.createErrorResponse)(400, 'Password does not meet requirements: minimum 12 characters with uppercase, lowercase, numbers, and symbols');
        }
        if (error.name === 'InvalidParameterException') {
            return (0, types_1.createErrorResponse)(400, error.message || 'Invalid parameters provided');
        }
        return (0, types_1.createErrorResponse)(500, 'Registration failed. Please try again.');
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWdpc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxnR0FBcUk7QUFDckksOERBQTBEO0FBQzFELHdEQUEyRTtBQUMzRSwyQ0FBc0g7QUFFdEgsTUFBTSxhQUFhLEdBQUcsSUFBSSxnRUFBNkIsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1RCxNQUFNLFlBQVksR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFekUsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFxQixDQUFDO0FBQy9ELE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBdUIsQ0FBQztBQUNuRSxNQUFNLDJCQUEyQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTRCLENBQUM7QUFDN0UsTUFBTSw2QkFBNkIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE4QixDQUFDO0FBQ2pGLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBWSxDQUFDO0FBVXRDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQzlELENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBb0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEQsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsR0FBRyxPQUFPLENBQUM7UUFFcEUsMkJBQTJCO1FBQzNCLElBQUksQ0FB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akMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLHlCQUF5QixFQUFFLENBQUM7WUFDN0MsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDO1FBQy9FLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssMEJBQTBCLEVBQUUsQ0FBQztZQUM5QyxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDRHQUE0RyxDQUFDLENBQUM7UUFDaEosQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLElBQUksS0FBSywyQkFBMkIsRUFBRSxDQUFDO1lBQy9DLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLE9BQU8sSUFBSSw2QkFBNkIsQ0FBQyxDQUFDO1FBQ2xGLENBQUM7UUFFRCxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLHdDQUF3QyxDQUFDLENBQUM7SUFDNUUsQ0FBQztBQUNILENBQUMsQ0FBQztBQW5LVyxRQUFBLE9BQU8sV0FtS2xCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsIFNpZ25VcENvbW1hbmQsIEFkbWluQWRkVXNlclRvR3JvdXBDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgUHV0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyBjcmVhdGVTdWNjZXNzUmVzcG9uc2UsIGNyZWF0ZUVycm9yUmVzcG9uc2UsIFVzZXJQcm9maWxlLCBQcmltYXJ5VXNlciwgU2Vjb25kYXJ5VXNlciB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5cbmNvbnN0IGNvZ25pdG9DbGllbnQgPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoe30pO1xuY29uc3QgZHluYW1vQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKG5ldyBEeW5hbW9EQkNsaWVudCh7fSkpO1xuXG5jb25zdCBQUklNQVJZX1VTRVJfUE9PTF9JRCA9IHByb2Nlc3MuZW52LlBSSU1BUllfVVNFUl9QT09MX0lEITtcbmNvbnN0IFNFQ09OREFSWV9VU0VSX1BPT0xfSUQgPSBwcm9jZXNzLmVudi5TRUNPTkRBUllfVVNFUl9QT09MX0lEITtcbmNvbnN0IFBSSU1BUllfVVNFUl9QT09MX0NMSUVOVF9JRCA9IHByb2Nlc3MuZW52LlBSSU1BUllfVVNFUl9QT09MX0NMSUVOVF9JRCE7XG5jb25zdCBTRUNPTkRBUllfVVNFUl9QT09MX0NMSUVOVF9JRCA9IHByb2Nlc3MuZW52LlNFQ09OREFSWV9VU0VSX1BPT0xfQ0xJRU5UX0lEITtcbmNvbnN0IFVTRVJTX1RBQkxFID0gcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEUhO1xuXG5pbnRlcmZhY2UgUmVnaXN0ZXJSZXF1ZXN0IHtcbiAgZW1haWw6IHN0cmluZztcbiAgcGFzc3dvcmQ6IHN0cmluZztcbiAgdXNlclR5cGU6ICdwcmltYXJ5JyB8ICdzZWNvbmRhcnknO1xuICBwcm9maWxlOiBVc2VyUHJvZmlsZTtcbiAgcGhvbmVOdW1iZXI/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIHRyeSB7XG4gICAgaWYgKCFldmVudC5ib2R5KSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXF1ZXN0OiBSZWdpc3RlclJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xuICAgIGNvbnN0IHsgZW1haWwsIHBhc3N3b3JkLCB1c2VyVHlwZSwgcHJvZmlsZSwgcGhvbmVOdW1iZXIgfSA9IHJlcXVlc3Q7XG5cbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICBpZiAoIWVtYWlsIHx8ICFwYXNzd29yZCB8fCAhdXNlclR5cGUgfHwgIXByb2ZpbGUpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBlbWFpbCwgcGFzc3dvcmQsIHVzZXJUeXBlLCBwcm9maWxlJyk7XG4gICAgfVxuXG4gICAgaWYgKCFbJ3ByaW1hcnknLCAnc2Vjb25kYXJ5J10uaW5jbHVkZXModXNlclR5cGUpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICd1c2VyVHlwZSBtdXN0IGJlIGVpdGhlciBcInByaW1hcnlcIiBvciBcInNlY29uZGFyeVwiJyk7XG4gICAgfVxuXG4gICAgLy8gU2VsZWN0IGFwcHJvcHJpYXRlIHVzZXIgcG9vbCBiYXNlZCBvbiB1c2VyIHR5cGVcbiAgICBjb25zdCB1c2VyUG9vbElkID0gdXNlclR5cGUgPT09ICdwcmltYXJ5JyA/IFBSSU1BUllfVVNFUl9QT09MX0lEIDogU0VDT05EQVJZX1VTRVJfUE9PTF9JRDtcbiAgICBjb25zdCBjbGllbnRJZCA9IHVzZXJUeXBlID09PSAncHJpbWFyeScgPyBQUklNQVJZX1VTRVJfUE9PTF9DTElFTlRfSUQgOiBTRUNPTkRBUllfVVNFUl9QT09MX0NMSUVOVF9JRDtcblxuICAgIC8vIFJlZ2lzdGVyIHVzZXIgaW4gQ29nbml0b1xuICAgIGNvbnN0IHNpZ25VcENvbW1hbmQgPSBuZXcgU2lnblVwQ29tbWFuZCh7XG4gICAgICBDbGllbnRJZDogY2xpZW50SWQsXG4gICAgICBVc2VybmFtZTogZW1haWwsXG4gICAgICBQYXNzd29yZDogcGFzc3dvcmQsXG4gICAgICBVc2VyQXR0cmlidXRlczogW1xuICAgICAgICB7IE5hbWU6ICdlbWFpbCcsIFZhbHVlOiBlbWFpbCB9LFxuICAgICAgICB7IE5hbWU6ICdnaXZlbl9uYW1lJywgVmFsdWU6IHByb2ZpbGUuZmlyc3ROYW1lIH0sXG4gICAgICAgIHsgTmFtZTogJ2ZhbWlseV9uYW1lJywgVmFsdWU6IHByb2ZpbGUubGFzdE5hbWUgfSxcbiAgICAgICAgLi4uKHBob25lTnVtYmVyID8gW3sgTmFtZTogJ3Bob25lX251bWJlcicsIFZhbHVlOiBwaG9uZU51bWJlciB9XSA6IFtdKSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBzaWduVXBSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQoc2lnblVwQ29tbWFuZCk7XG4gICAgY29uc3QgdXNlcklkID0gc2lnblVwUmVzdWx0LlVzZXJTdWIhO1xuXG4gICAgLy8gQWRkIHVzZXIgdG8gYXBwcm9wcmlhdGUgZ3JvdXBcbiAgICBjb25zdCBncm91cE5hbWUgPSB1c2VyVHlwZSA9PT0gJ3ByaW1hcnknID8gJ1ByaW1hcnlVc2VycycgOiAnU2Vjb25kYXJ5VXNlcnMnO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluQWRkVXNlclRvR3JvdXBDb21tYW5kKHtcbiAgICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxuICAgICAgICBHcm91cE5hbWU6IGdyb3VwTmFtZSxcbiAgICAgIH0pKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS53YXJuKGBHcm91cCAke2dyb3VwTmFtZX0gbWF5IG5vdCBleGlzdCB5ZXQ6YCwgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSB1c2VyIHJlY29yZCBpbiBEeW5hbW9EQlxuICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICBcbiAgICBpZiAodXNlclR5cGUgPT09ICdwcmltYXJ5Jykge1xuICAgICAgY29uc3QgcHJpbWFyeVVzZXI6IFByaW1hcnlVc2VyID0ge1xuICAgICAgICBpZDogdXNlcklkLFxuICAgICAgICBwcm9maWxlOiB7XG4gICAgICAgICAgLi4ucHJvZmlsZSxcbiAgICAgICAgICBwaG9uZTogcGhvbmVOdW1iZXIgfHwgcHJvZmlsZS5waG9uZSxcbiAgICAgICAgfSxcbiAgICAgICAgaGVhbHRoUHJvZmlsZToge1xuICAgICAgICAgIGNvbmRpdGlvbnM6IFtdLFxuICAgICAgICAgIG1lZGljYXRpb25zOiBbXSxcbiAgICAgICAgICBhbGxlcmdpZXM6IFtdLFxuICAgICAgICAgIGVtZXJnZW5jeUNvbnRhY3RzOiBbXSxcbiAgICAgICAgICBoZWFsdGhjYXJlUHJvdmlkZXJzOiBbXSxcbiAgICAgICAgICBiYXNlbGluZVZpdGFsczoge1xuICAgICAgICAgICAgaGVhcnRSYXRlOiB7IG1pbjogNjAsIG1heDogMTAwIH0sXG4gICAgICAgICAgICBibG9vZFByZXNzdXJlOiB7XG4gICAgICAgICAgICAgIHN5c3RvbGljOiB7IG1pbjogOTAsIG1heDogMTQwIH0sXG4gICAgICAgICAgICAgIGRpYXN0b2xpYzogeyBtaW46IDYwLCBtYXg6IDkwIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGVyYXR1cmU6IHsgbWluOiA5Ny4wLCBtYXg6IDk5LjUgfSxcbiAgICAgICAgICAgIG94eWdlblNhdHVyYXRpb246IHsgbWluOiA5NSwgbWF4OiAxMDAgfSxcbiAgICAgICAgICAgIHdlaWdodDogeyBtaW46IDAsIG1heDogNTAwIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgY2FyZUNpcmNsZTogW10sXG4gICAgICAgIHByZWZlcmVuY2VzOiB7XG4gICAgICAgICAgZm9udFNpemU6ICdsYXJnZScsXG4gICAgICAgICAgY29udHJhc3Q6ICdoaWdoJyxcbiAgICAgICAgICB2b2ljZU5hdmlnYXRpb246IGZhbHNlLFxuICAgICAgICAgIHNjcmVlblJlYWRlcjogZmFsc2UsXG4gICAgICAgICAgbGFuZ3VhZ2U6ICdlbicsXG4gICAgICAgICAgdGltZXpvbmU6ICdVVEMnLFxuICAgICAgICAgIG5vdGlmaWNhdGlvbkNoYW5uZWxzOiBbJ3B1c2gnLCAnZW1haWwnXSxcbiAgICAgICAgfSxcbiAgICAgICAgZGV2aWNlczogW10sXG4gICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUodGltZXN0YW1wKSxcbiAgICAgICAgbGFzdEFjdGl2ZTogbmV3IERhdGUodGltZXN0YW1wKSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiBVU0VSU19UQUJMRSxcbiAgICAgICAgSXRlbToge1xuICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICBlbWFpbCxcbiAgICAgICAgICB1c2VyVHlwZTogJ3ByaW1hcnknLFxuICAgICAgICAgIC4uLnByaW1hcnlVc2VyLFxuICAgICAgICAgIGNyZWF0ZWRBdDogdGltZXN0YW1wLFxuICAgICAgICAgIGxhc3RBY3RpdmU6IHRpbWVzdGFtcCxcbiAgICAgICAgfSxcbiAgICAgIH0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc2Vjb25kYXJ5VXNlcjogU2Vjb25kYXJ5VXNlciA9IHtcbiAgICAgICAgaWQ6IHVzZXJJZCxcbiAgICAgICAgcHJvZmlsZToge1xuICAgICAgICAgIC4uLnByb2ZpbGUsXG4gICAgICAgICAgcGhvbmU6IHBob25lTnVtYmVyIHx8IHByb2ZpbGUucGhvbmUsXG4gICAgICAgIH0sXG4gICAgICAgIHByaW1hcnlVc2VyczogW10sXG4gICAgICAgIGFsZXJ0UHJlZmVyZW5jZXM6IHtcbiAgICAgICAgICBjaGFubmVsczogWydwdXNoJywgJ2VtYWlsJywgJ3NtcyddLFxuICAgICAgICAgIGFsZXJ0VHlwZXM6IHt9LFxuICAgICAgICB9LFxuICAgICAgICBwZXJtaXNzaW9uczoge1xuICAgICAgICAgIGNhblZpZXdWaXRhbHM6IHRydWUsXG4gICAgICAgICAgY2FuVmlld01lZGljYXRpb25zOiB0cnVlLFxuICAgICAgICAgIGNhblZpZXdBcHBvaW50bWVudHM6IHRydWUsXG4gICAgICAgICAgY2FuVmlld0hlYWx0aFJlY29yZHM6IHRydWUsXG4gICAgICAgICAgY2FuUmVjZWl2ZUFsZXJ0czogdHJ1ZSxcbiAgICAgICAgICBjYW5TZW5kTWVzc2FnZXM6IHRydWUsXG4gICAgICAgICAgY2FuTWFuYWdlRGV2aWNlczogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUodGltZXN0YW1wKSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiBVU0VSU19UQUJMRSxcbiAgICAgICAgSXRlbToge1xuICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICBlbWFpbCxcbiAgICAgICAgICB1c2VyVHlwZTogJ3NlY29uZGFyeScsXG4gICAgICAgICAgLi4uc2Vjb25kYXJ5VXNlcixcbiAgICAgICAgICBjcmVhdGVkQXQ6IHRpbWVzdGFtcCxcbiAgICAgICAgfSxcbiAgICAgIH0pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgIHVzZXJJZCxcbiAgICAgIGVtYWlsLFxuICAgICAgdXNlclR5cGUsXG4gICAgICBtZXNzYWdlOiAnUmVnaXN0cmF0aW9uIHN1Y2Nlc3NmdWwuIFBsZWFzZSBjaGVjayB5b3VyIGVtYWlsIHRvIHZlcmlmeSB5b3VyIGFjY291bnQuJyxcbiAgICAgIGVtYWlsVmVyaWZpY2F0aW9uUmVxdWlyZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1JlZ2lzdHJhdGlvbiBlcnJvcjonLCBlcnJvcik7XG4gICAgXG4gICAgLy8gSGFuZGxlIHNwZWNpZmljIENvZ25pdG8gZXJyb3JzXG4gICAgaWYgKGVycm9yLm5hbWUgPT09ICdVc2VybmFtZUV4aXN0c0V4Y2VwdGlvbicpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwOSwgJ0FuIGFjY291bnQgd2l0aCB0aGlzIGVtYWlsIGFscmVhZHkgZXhpc3RzJyk7XG4gICAgfVxuICAgIGlmIChlcnJvci5uYW1lID09PSAnSW52YWxpZFBhc3N3b3JkRXhjZXB0aW9uJykge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUGFzc3dvcmQgZG9lcyBub3QgbWVldCByZXF1aXJlbWVudHM6IG1pbmltdW0gMTIgY2hhcmFjdGVycyB3aXRoIHVwcGVyY2FzZSwgbG93ZXJjYXNlLCBudW1iZXJzLCBhbmQgc3ltYm9scycpO1xuICAgIH1cbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ0ludmFsaWRQYXJhbWV0ZXJFeGNlcHRpb24nKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsIGVycm9yLm1lc3NhZ2UgfHwgJ0ludmFsaWQgcGFyYW1ldGVycyBwcm92aWRlZCcpO1xuICAgIH1cblxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ1JlZ2lzdHJhdGlvbiBmYWlsZWQuIFBsZWFzZSB0cnkgYWdhaW4uJyk7XG4gIH1cbn07XG4iXX0=