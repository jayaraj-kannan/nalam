"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const types_1 = require("../shared/types");
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({});
const dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
const PRIMARY_USER_POOL_CLIENT_ID = process.env.PRIMARY_USER_POOL_CLIENT_ID;
const SECONDARY_USER_POOL_CLIENT_ID = process.env.SECONDARY_USER_POOL_CLIENT_ID;
const USERS_TABLE = process.env.USERS_TABLE;
const handler = async (event) => {
    try {
        if (!event.body) {
            return (0, types_1.createErrorResponse)(400, 'Request body is required');
        }
        const request = JSON.parse(event.body);
        const { email, password, userType, mfaCode, session } = request;
        // Validate required fields
        if (!email || !password || !userType) {
            return (0, types_1.createErrorResponse)(400, 'Missing required fields: email, password, userType');
        }
        if (!['primary', 'secondary'].includes(userType)) {
            return (0, types_1.createErrorResponse)(400, 'userType must be either "primary" or "secondary"');
        }
        // Select appropriate user pool client based on user type
        const clientId = userType === 'primary' ? PRIMARY_USER_POOL_CLIENT_ID : SECONDARY_USER_POOL_CLIENT_ID;
        // If MFA code is provided, respond to MFA challenge
        if (mfaCode && session) {
            return await handleMfaChallenge(clientId, email, mfaCode, session);
        }
        // Initiate authentication
        const authCommand = new client_cognito_identity_provider_1.InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: clientId,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
            },
        });
        const authResult = await cognitoClient.send(authCommand);
        // Check if MFA is required
        if (authResult.ChallengeName === 'SMS_MFA' || authResult.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
            return (0, types_1.createSuccessResponse)({
                challengeName: authResult.ChallengeName,
                session: authResult.Session,
                message: 'MFA code required. Please provide the code from your authenticator app or SMS.',
                mfaRequired: true,
            });
        }
        // Successful authentication without MFA challenge
        if (authResult.AuthenticationResult) {
            const { AccessToken, IdToken, RefreshToken, ExpiresIn } = authResult.AuthenticationResult;
            // Get user details
            const getUserCommand = new client_cognito_identity_provider_1.GetUserCommand({
                AccessToken: AccessToken,
            });
            const userDetails = await cognitoClient.send(getUserCommand);
            const userId = userDetails.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;
            // Update last active timestamp in DynamoDB
            if (userId) {
                await dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: USERS_TABLE,
                    Key: { userId },
                    UpdateExpression: 'SET lastActive = :timestamp',
                    ExpressionAttributeValues: {
                        ':timestamp': new Date().toISOString(),
                    },
                }));
            }
            return (0, types_1.createSuccessResponse)({
                accessToken: AccessToken,
                idToken: IdToken,
                refreshToken: RefreshToken,
                expiresIn: ExpiresIn,
                userId,
                userType,
                message: 'Login successful',
            });
        }
        return (0, types_1.createErrorResponse)(500, 'Authentication failed unexpectedly');
    }
    catch (error) {
        console.error('Login error:', error);
        // Handle specific Cognito errors
        if (error.name === 'NotAuthorizedException') {
            return (0, types_1.createErrorResponse)(401, 'Incorrect email or password');
        }
        if (error.name === 'UserNotConfirmedException') {
            return (0, types_1.createErrorResponse)(403, 'Please verify your email address before logging in');
        }
        if (error.name === 'UserNotFoundException') {
            return (0, types_1.createErrorResponse)(401, 'Incorrect email or password');
        }
        if (error.name === 'TooManyRequestsException') {
            return (0, types_1.createErrorResponse)(429, 'Too many login attempts. Please try again later.');
        }
        if (error.name === 'PasswordResetRequiredException') {
            return (0, types_1.createErrorResponse)(403, 'Password reset required. Please reset your password.');
        }
        return (0, types_1.createErrorResponse)(500, 'Login failed. Please try again.');
    }
};
exports.handler = handler;
async function handleMfaChallenge(clientId, email, mfaCode, session) {
    try {
        const challengeCommand = new client_cognito_identity_provider_1.RespondToAuthChallengeCommand({
            ClientId: clientId,
            ChallengeName: 'SOFTWARE_TOKEN_MFA', // or SMS_MFA
            Session: session,
            ChallengeResponses: {
                USERNAME: email,
                SOFTWARE_TOKEN_MFA_CODE: mfaCode,
            },
        });
        const challengeResult = await cognitoClient.send(challengeCommand);
        if (challengeResult.AuthenticationResult) {
            const { AccessToken, IdToken, RefreshToken, ExpiresIn } = challengeResult.AuthenticationResult;
            // Get user details
            const getUserCommand = new client_cognito_identity_provider_1.GetUserCommand({
                AccessToken: AccessToken,
            });
            const userDetails = await cognitoClient.send(getUserCommand);
            const userId = userDetails.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;
            // Update last active timestamp
            if (userId) {
                await dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: USERS_TABLE,
                    Key: { userId },
                    UpdateExpression: 'SET lastActive = :timestamp',
                    ExpressionAttributeValues: {
                        ':timestamp': new Date().toISOString(),
                    },
                }));
            }
            return (0, types_1.createSuccessResponse)({
                accessToken: AccessToken,
                idToken: IdToken,
                refreshToken: RefreshToken,
                expiresIn: ExpiresIn,
                userId,
                message: 'MFA verification successful',
            });
        }
        return (0, types_1.createErrorResponse)(500, 'MFA verification failed unexpectedly');
    }
    catch (error) {
        console.error('MFA challenge error:', error);
        if (error.name === 'CodeMismatchException') {
            return (0, types_1.createErrorResponse)(401, 'Invalid MFA code. Please try again.');
        }
        if (error.name === 'ExpiredCodeException') {
            return (0, types_1.createErrorResponse)(401, 'MFA code has expired. Please request a new code.');
        }
        if (error.name === 'NotAuthorizedException') {
            return (0, types_1.createErrorResponse)(401, 'MFA verification failed. Please try again.');
        }
        return (0, types_1.createErrorResponse)(500, 'MFA verification failed. Please try again.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxnR0FBOEo7QUFDOUosOERBQTBEO0FBQzFELHdEQUE4RTtBQUM5RSwyQ0FBNkU7QUFFN0UsTUFBTSxhQUFhLEdBQUcsSUFBSSxnRUFBNkIsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1RCxNQUFNLFlBQVksR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFekUsTUFBTSwyQkFBMkIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUE0QixDQUFDO0FBQzdFLE1BQU0sNkJBQTZCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBOEIsQ0FBQztBQUNqRixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVksQ0FBQztBQVV0QyxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixJQUFJLENBQUM7UUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQWlCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFDO1FBRWhFLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckMsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxvREFBb0QsQ0FBQyxDQUFDO1FBQ3hGLENBQUM7UUFF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Q2hCLFlBQVksRUFBRSxZQUFZO2dCQUMxQixTQUFTLEVBQUUsU0FBUztnQkFDcEIsTUFBTTtnQkFDTixPQUFPLEVBQUUsNkJBQTZCO2FBQ3ZDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLHNDQUFzQyxDQUFDLENBQUM7SUFFMUUsQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDcEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU3QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssdUJBQXVCLEVBQUUsQ0FBQztZQUMzQyxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLHFDQUFxQyxDQUFDLENBQUM7UUFDekUsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxzQkFBc0IsRUFBRSxDQUFDO1lBQzFDLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsa0RBQWtELENBQUMsQ0FBQztRQUN0RixDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLHdCQUF3QixFQUFFLENBQUM7WUFDNUMsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSw0Q0FBNEMsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFFRCxPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDRDQUE0QyxDQUFDLENBQUM7SUFDaEYsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCwgSW5pdGlhdGVBdXRoQ29tbWFuZCwgUmVzcG9uZFRvQXV0aENoYWxsZW5nZUNvbW1hbmQsIEdldFVzZXJDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgVXBkYXRlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyBjcmVhdGVTdWNjZXNzUmVzcG9uc2UsIGNyZWF0ZUVycm9yUmVzcG9uc2UgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuXG5jb25zdCBjb2duaXRvQ2xpZW50ID0gbmV3IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50KHt9KTtcbmNvbnN0IGR5bmFtb0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShuZXcgRHluYW1vREJDbGllbnQoe30pKTtcblxuY29uc3QgUFJJTUFSWV9VU0VSX1BPT0xfQ0xJRU5UX0lEID0gcHJvY2Vzcy5lbnYuUFJJTUFSWV9VU0VSX1BPT0xfQ0xJRU5UX0lEITtcbmNvbnN0IFNFQ09OREFSWV9VU0VSX1BPT0xfQ0xJRU5UX0lEID0gcHJvY2Vzcy5lbnYuU0VDT05EQVJZX1VTRVJfUE9PTF9DTElFTlRfSUQhO1xuY29uc3QgVVNFUlNfVEFCTEUgPSBwcm9jZXNzLmVudi5VU0VSU19UQUJMRSE7XG5cbmludGVyZmFjZSBMb2dpblJlcXVlc3Qge1xuICBlbWFpbDogc3RyaW5nO1xuICBwYXNzd29yZDogc3RyaW5nO1xuICB1c2VyVHlwZTogJ3ByaW1hcnknIHwgJ3NlY29uZGFyeSc7XG4gIG1mYUNvZGU/OiBzdHJpbmc7XG4gIHNlc3Npb24/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIHRyeSB7XG4gICAgaWYgKCFldmVudC5ib2R5KSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXF1ZXN0OiBMb2dpblJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xuICAgIGNvbnN0IHsgZW1haWwsIHBhc3N3b3JkLCB1c2VyVHlwZSwgbWZhQ29kZSwgc2Vzc2lvbiB9ID0gcmVxdWVzdDtcblxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgIGlmICghZW1haWwgfHwgIXBhc3N3b3JkIHx8ICF1c2VyVHlwZSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnTWlzc2luZyByZXF1aXJlZCBmaWVsZHM6IGVtYWlsLCBwYXNzd29yZCwgdXNlclR5cGUnKTtcbiAgICB9XG5cbiAgICBpZiAoIVsncHJpbWFyeScsICdzZWNvbmRhcnknXS5pbmNsdWRlcyh1c2VyVHlwZSkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ3VzZXJUeXBlIG11c3QgYmUgZWl0aGVyIFwicHJpbWFyeVwiIG9yIFwic2Vjb25kYXJ5XCInKTtcbiAgICB9XG5cbiAgICAvLyBTZWxlY3QgYXBwcm9wcmlhdGUgdXNlciBwb29sIGNsaWVudCBiYXNlZCBvbiB1c2VyIHR5cGVcbiAgICBjb25zdCBjbGllbnRJZCA9IHVzZXJUeXBlID09PSAncHJpbWFyeScgPyBQUklNQVJZX1VTRVJfUE9PTF9DTElFTlRfSUQgOiBTRUNPTkRBUllfVVNFUl9QT09MX0NMSUVOVF9JRDtcblxuICAgIC8vIElmIE1GQSBjb2RlIGlzIHByb3ZpZGVkLCByZXNwb25kIHRvIE1GQSBjaGFsbGVuZ2VcbiAgICBpZiAobWZhQ29kZSAmJiBzZXNzaW9uKSB7XG4gICAgICByZXR1cm4gYXdhaXQgaGFuZGxlTWZhQ2hhbGxlbmdlKGNsaWVudElkLCBlbWFpbCwgbWZhQ29kZSwgc2Vzc2lvbik7XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhdGUgYXV0aGVudGljYXRpb25cbiAgICBjb25zdCBhdXRoQ29tbWFuZCA9IG5ldyBJbml0aWF0ZUF1dGhDb21tYW5kKHtcbiAgICAgIEF1dGhGbG93OiAnVVNFUl9QQVNTV09SRF9BVVRIJyxcbiAgICAgIENsaWVudElkOiBjbGllbnRJZCxcbiAgICAgIEF1dGhQYXJhbWV0ZXJzOiB7XG4gICAgICAgIFVTRVJOQU1FOiBlbWFpbCxcbiAgICAgICAgUEFTU1dPUkQ6IHBhc3N3b3JkLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGF1dGhSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQoYXV0aENvbW1hbmQpO1xuXG4gICAgLy8gQ2hlY2sgaWYgTUZBIGlzIHJlcXVpcmVkXG4gICAgaWYgKGF1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSA9PT0gJ1NNU19NRkEnIHx8IGF1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSA9PT0gJ1NPRlRXQVJFX1RPS0VOX01GQScpIHtcbiAgICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICBjaGFsbGVuZ2VOYW1lOiBhdXRoUmVzdWx0LkNoYWxsZW5nZU5hbWUsXG4gICAgICAgIHNlc3Npb246IGF1dGhSZXN1bHQuU2Vzc2lvbixcbiAgICAgICAgbWVzc2FnZTogJ01GQSBjb2RlIHJlcXVpcmVkLiBQbGVhc2UgcHJvdmlkZSB0aGUgY29kZSBmcm9tIHlvdXIgYXV0aGVudGljYXRvciBhcHAgb3IgU01TLicsXG4gICAgICAgIG1mYVJlcXVpcmVkOiB0cnVlLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gU3VjY2Vzc2Z1bCBhdXRoZW50aWNhdGlvbiB3aXRob3V0IE1GQSBjaGFsbGVuZ2VcbiAgICBpZiAoYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdCkge1xuICAgICAgY29uc3QgeyBBY2Nlc3NUb2tlbiwgSWRUb2tlbiwgUmVmcmVzaFRva2VuLCBFeHBpcmVzSW4gfSA9IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ7XG5cbiAgICAgIC8vIEdldCB1c2VyIGRldGFpbHNcbiAgICAgIGNvbnN0IGdldFVzZXJDb21tYW5kID0gbmV3IEdldFVzZXJDb21tYW5kKHtcbiAgICAgICAgQWNjZXNzVG9rZW46IEFjY2Vzc1Rva2VuISxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgdXNlckRldGFpbHMgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQoZ2V0VXNlckNvbW1hbmQpO1xuICAgICAgY29uc3QgdXNlcklkID0gdXNlckRldGFpbHMuVXNlckF0dHJpYnV0ZXM/LmZpbmQoYXR0ciA9PiBhdHRyLk5hbWUgPT09ICdzdWInKT8uVmFsdWU7XG5cbiAgICAgIC8vIFVwZGF0ZSBsYXN0IGFjdGl2ZSB0aW1lc3RhbXAgaW4gRHluYW1vREJcbiAgICAgIGlmICh1c2VySWQpIHtcbiAgICAgICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IFVwZGF0ZUNvbW1hbmQoe1xuICAgICAgICAgIFRhYmxlTmFtZTogVVNFUlNfVEFCTEUsXG4gICAgICAgICAgS2V5OiB7IHVzZXJJZCB9LFxuICAgICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgbGFzdEFjdGl2ZSA9IDp0aW1lc3RhbXAnLFxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgICAgICc6dGltZXN0YW1wJzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgIGFjY2Vzc1Rva2VuOiBBY2Nlc3NUb2tlbixcbiAgICAgICAgaWRUb2tlbjogSWRUb2tlbixcbiAgICAgICAgcmVmcmVzaFRva2VuOiBSZWZyZXNoVG9rZW4sXG4gICAgICAgIGV4cGlyZXNJbjogRXhwaXJlc0luLFxuICAgICAgICB1c2VySWQsXG4gICAgICAgIHVzZXJUeXBlLFxuICAgICAgICBtZXNzYWdlOiAnTG9naW4gc3VjY2Vzc2Z1bCcsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdBdXRoZW50aWNhdGlvbiBmYWlsZWQgdW5leHBlY3RlZGx5Jyk7XG5cbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0xvZ2luIGVycm9yOicsIGVycm9yKTtcblxuICAgIC8vIEhhbmRsZSBzcGVjaWZpYyBDb2duaXRvIGVycm9yc1xuICAgIGlmIChlcnJvci5uYW1lID09PSAnTm90QXV0aG9yaXplZEV4Y2VwdGlvbicpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMSwgJ0luY29ycmVjdCBlbWFpbCBvciBwYXNzd29yZCcpO1xuICAgIH1cbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1VzZXJOb3RDb25maXJtZWRFeGNlcHRpb24nKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDMsICdQbGVhc2UgdmVyaWZ5IHlvdXIgZW1haWwgYWRkcmVzcyBiZWZvcmUgbG9nZ2luZyBpbicpO1xuICAgIH1cbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbicpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMSwgJ0luY29ycmVjdCBlbWFpbCBvciBwYXNzd29yZCcpO1xuICAgIH1cbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1Rvb01hbnlSZXF1ZXN0c0V4Y2VwdGlvbicpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQyOSwgJ1RvbyBtYW55IGxvZ2luIGF0dGVtcHRzLiBQbGVhc2UgdHJ5IGFnYWluIGxhdGVyLicpO1xuICAgIH1cbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1Bhc3N3b3JkUmVzZXRSZXF1aXJlZEV4Y2VwdGlvbicpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMywgJ1Bhc3N3b3JkIHJlc2V0IHJlcXVpcmVkLiBQbGVhc2UgcmVzZXQgeW91ciBwYXNzd29yZC4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdMb2dpbiBmYWlsZWQuIFBsZWFzZSB0cnkgYWdhaW4uJyk7XG4gIH1cbn07XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZU1mYUNoYWxsZW5nZShcbiAgY2xpZW50SWQ6IHN0cmluZyxcbiAgZW1haWw6IHN0cmluZyxcbiAgbWZhQ29kZTogc3RyaW5nLFxuICBzZXNzaW9uOiBzdHJpbmdcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgY2hhbGxlbmdlQ29tbWFuZCA9IG5ldyBSZXNwb25kVG9BdXRoQ2hhbGxlbmdlQ29tbWFuZCh7XG4gICAgICBDbGllbnRJZDogY2xpZW50SWQsXG4gICAgICBDaGFsbGVuZ2VOYW1lOiAnU09GVFdBUkVfVE9LRU5fTUZBJywgLy8gb3IgU01TX01GQVxuICAgICAgU2Vzc2lvbjogc2Vzc2lvbixcbiAgICAgIENoYWxsZW5nZVJlc3BvbnNlczoge1xuICAgICAgICBVU0VSTkFNRTogZW1haWwsXG4gICAgICAgIFNPRlRXQVJFX1RPS0VOX01GQV9DT0RFOiBtZmFDb2RlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNoYWxsZW5nZVJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChjaGFsbGVuZ2VDb21tYW5kKTtcblxuICAgIGlmIChjaGFsbGVuZ2VSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQpIHtcbiAgICAgIGNvbnN0IHsgQWNjZXNzVG9rZW4sIElkVG9rZW4sIFJlZnJlc2hUb2tlbiwgRXhwaXJlc0luIH0gPSBjaGFsbGVuZ2VSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ7XG5cbiAgICAgIC8vIEdldCB1c2VyIGRldGFpbHNcbiAgICAgIGNvbnN0IGdldFVzZXJDb21tYW5kID0gbmV3IEdldFVzZXJDb21tYW5kKHtcbiAgICAgICAgQWNjZXNzVG9rZW46IEFjY2Vzc1Rva2VuISxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgdXNlckRldGFpbHMgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQoZ2V0VXNlckNvbW1hbmQpO1xuICAgICAgY29uc3QgdXNlcklkID0gdXNlckRldGFpbHMuVXNlckF0dHJpYnV0ZXM/LmZpbmQoYXR0ciA9PiBhdHRyLk5hbWUgPT09ICdzdWInKT8uVmFsdWU7XG5cbiAgICAgIC8vIFVwZGF0ZSBsYXN0IGFjdGl2ZSB0aW1lc3RhbXBcbiAgICAgIGlmICh1c2VySWQpIHtcbiAgICAgICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IFVwZGF0ZUNvbW1hbmQoe1xuICAgICAgICAgIFRhYmxlTmFtZTogVVNFUlNfVEFCTEUsXG4gICAgICAgICAgS2V5OiB7IHVzZXJJZCB9LFxuICAgICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgbGFzdEFjdGl2ZSA9IDp0aW1lc3RhbXAnLFxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgICAgICc6dGltZXN0YW1wJzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgIGFjY2Vzc1Rva2VuOiBBY2Nlc3NUb2tlbixcbiAgICAgICAgaWRUb2tlbjogSWRUb2tlbixcbiAgICAgICAgcmVmcmVzaFRva2VuOiBSZWZyZXNoVG9rZW4sXG4gICAgICAgIGV4cGlyZXNJbjogRXhwaXJlc0luLFxuICAgICAgICB1c2VySWQsXG4gICAgICAgIG1lc3NhZ2U6ICdNRkEgdmVyaWZpY2F0aW9uIHN1Y2Nlc3NmdWwnLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnTUZBIHZlcmlmaWNhdGlvbiBmYWlsZWQgdW5leHBlY3RlZGx5Jyk7XG5cbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ01GQSBjaGFsbGVuZ2UgZXJyb3I6JywgZXJyb3IpO1xuXG4gICAgaWYgKGVycm9yLm5hbWUgPT09ICdDb2RlTWlzbWF0Y2hFeGNlcHRpb24nKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdJbnZhbGlkIE1GQSBjb2RlLiBQbGVhc2UgdHJ5IGFnYWluLicpO1xuICAgIH1cbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ0V4cGlyZWRDb2RlRXhjZXB0aW9uJykge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAxLCAnTUZBIGNvZGUgaGFzIGV4cGlyZWQuIFBsZWFzZSByZXF1ZXN0IGEgbmV3IGNvZGUuJyk7XG4gICAgfVxuICAgIGlmIChlcnJvci5uYW1lID09PSAnTm90QXV0aG9yaXplZEV4Y2VwdGlvbicpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMSwgJ01GQSB2ZXJpZmljYXRpb24gZmFpbGVkLiBQbGVhc2UgdHJ5IGFnYWluLicpO1xuICAgIH1cblxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ01GQSB2ZXJpZmljYXRpb24gZmFpbGVkLiBQbGVhc2UgdHJ5IGFnYWluLicpO1xuICB9XG59XG4iXX0=