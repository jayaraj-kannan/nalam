"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const types_1 = require("../shared/types");
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({});
const dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
const USERS_TABLE = process.env.USERS_TABLE;
/**
 * Session Management Lambda
 *
 * Handles:
 * - Get current session info
 * - Validate session
 * - Logout (invalidate tokens)
 * - Global sign out (all devices)
 */
const handler = async (event) => {
    try {
        const path = event.path || event.resource;
        const httpMethod = event.httpMethod;
        // Extract access token from Authorization header
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return (0, types_1.createErrorResponse)(401, 'Missing or invalid authorization header');
        }
        const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Route to appropriate handler
        if (path.includes('/session/info') && httpMethod === 'GET') {
            return await getSessionInfo(accessToken);
        }
        else if (path.includes('/session/validate') && httpMethod === 'GET') {
            return await validateSession(accessToken);
        }
        else if (path.includes('/session/logout') && httpMethod === 'POST') {
            return await logout(accessToken);
        }
        else if (path.includes('/session/logout-all') && httpMethod === 'POST') {
            return await globalSignOut(accessToken);
        }
        return (0, types_1.createErrorResponse)(404, 'Endpoint not found');
    }
    catch (error) {
        console.error('Session management error:', error);
        return (0, types_1.createErrorResponse)(500, 'Session management failed');
    }
};
exports.handler = handler;
/**
 * Get current session information
 */
async function getSessionInfo(accessToken) {
    try {
        const getUserCommand = new client_cognito_identity_provider_1.GetUserCommand({
            AccessToken: accessToken,
        });
        const userDetails = await cognitoClient.send(getUserCommand);
        const userId = userDetails.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;
        const email = userDetails.UserAttributes?.find(attr => attr.Name === 'email')?.Value;
        const emailVerified = userDetails.UserAttributes?.find(attr => attr.Name === 'email_verified')?.Value;
        // Get additional user info from DynamoDB
        let userInfo = null;
        if (userId) {
            const userResult = await dynamoClient.send(new lib_dynamodb_1.GetCommand({
                TableName: USERS_TABLE,
                Key: { userId },
            }));
            userInfo = userResult.Item;
        }
        return (0, types_1.createSuccessResponse)({
            userId,
            email,
            emailVerified: emailVerified === 'true',
            username: userDetails.Username,
            userType: userInfo?.userType,
            profile: userInfo?.profile,
            lastActive: userInfo?.lastActive,
            mfaEnabled: userDetails.UserMFASettingList && userDetails.UserMFASettingList.length > 0,
            preferredMfaSetting: userDetails.PreferredMfaSetting,
        });
    }
    catch (error) {
        console.error('Get session info error:', error);
        if (error.name === 'NotAuthorizedException') {
            return (0, types_1.createErrorResponse)(401, 'Invalid or expired access token');
        }
        return (0, types_1.createErrorResponse)(500, 'Failed to retrieve session information');
    }
}
/**
 * Validate current session
 */
async function validateSession(accessToken) {
    try {
        const getUserCommand = new client_cognito_identity_provider_1.GetUserCommand({
            AccessToken: accessToken,
        });
        await cognitoClient.send(getUserCommand);
        return (0, types_1.createSuccessResponse)({
            valid: true,
            message: 'Session is valid',
        });
    }
    catch (error) {
        console.error('Validate session error:', error);
        if (error.name === 'NotAuthorizedException') {
            return (0, types_1.createSuccessResponse)({
                valid: false,
                message: 'Session is invalid or expired',
            });
        }
        return (0, types_1.createErrorResponse)(500, 'Failed to validate session');
    }
}
/**
 * Logout (invalidate current session)
 */
async function logout(accessToken) {
    try {
        // Get user info before logout
        const getUserCommand = new client_cognito_identity_provider_1.GetUserCommand({
            AccessToken: accessToken,
        });
        const userDetails = await cognitoClient.send(getUserCommand);
        const userId = userDetails.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;
        // Note: Cognito doesn't have a direct "logout" API for access tokens
        // Access tokens remain valid until expiration
        // The client should discard the tokens
        // For server-side tracking, we can update the user's session status
        if (userId) {
            await dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: USERS_TABLE,
                Key: { userId },
                UpdateExpression: 'SET lastLogout = :timestamp',
                ExpressionAttributeValues: {
                    ':timestamp': new Date().toISOString(),
                },
            }));
        }
        return (0, types_1.createSuccessResponse)({
            message: 'Logout successful. Please discard your tokens.',
            loggedOut: true,
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        if (error.name === 'NotAuthorizedException') {
            return (0, types_1.createErrorResponse)(401, 'Invalid or expired access token');
        }
        return (0, types_1.createErrorResponse)(500, 'Logout failed');
    }
}
/**
 * Global sign out (invalidate all sessions on all devices)
 */
async function globalSignOut(accessToken) {
    try {
        // Get user info before sign out
        const getUserCommand = new client_cognito_identity_provider_1.GetUserCommand({
            AccessToken: accessToken,
        });
        const userDetails = await cognitoClient.send(getUserCommand);
        const userId = userDetails.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;
        // Global sign out - invalidates all tokens for the user
        const signOutCommand = new client_cognito_identity_provider_1.GlobalSignOutCommand({
            AccessToken: accessToken,
        });
        await cognitoClient.send(signOutCommand);
        // Update user record
        if (userId) {
            await dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: USERS_TABLE,
                Key: { userId },
                UpdateExpression: 'SET lastLogout = :timestamp, globalSignOutAt = :timestamp',
                ExpressionAttributeValues: {
                    ':timestamp': new Date().toISOString(),
                },
            }));
        }
        return (0, types_1.createSuccessResponse)({
            message: 'Global sign out successful. All sessions have been invalidated.',
            signedOut: true,
        });
    }
    catch (error) {
        console.error('Global sign out error:', error);
        if (error.name === 'NotAuthorizedException') {
            return (0, types_1.createErrorResponse)(401, 'Invalid or expired access token');
        }
        return (0, types_1.createErrorResponse)(500, 'Global sign out failed');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Vzc2lvbi1tYW5hZ2VtZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2Vzc2lvbi1tYW5hZ2VtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGdHQUFnSTtBQUNoSSw4REFBMEQ7QUFDMUQsd0RBQTBGO0FBQzFGLDJDQUE2RTtBQUU3RSxNQUFNLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzVELE1BQU0sWUFBWSxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUV6RSxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVksQ0FBQztBQUU3Qzs7Ozs7Ozs7R0FRRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLElBQUksQ0FBQztRQUNILE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQztRQUMxQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDO1FBRXBDLGlEQUFpRDtRQUNqRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUM5RSxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3JELE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUseUNBQXlDLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDBCQUEwQjtRQUV2RSwrQkFBK0I7UUFDL0IsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLFVBQVUs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LENBQUMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRS9DLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyx3QkFBd0IsRUFBRSxDQUFDO1lBQzVDLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0lBQzVELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsIEdldFVzZXJDb21tYW5kLCBHbG9iYWxTaWduT3V0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jb2duaXRvLWlkZW50aXR5LXByb3ZpZGVyJztcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIEdldENvbW1hbmQsIFVwZGF0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLCBjcmVhdGVFcnJvclJlc3BvbnNlIH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcblxuY29uc3QgY29nbml0b0NsaWVudCA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7fSk7XG5jb25zdCBkeW5hbW9DbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20obmV3IER5bmFtb0RCQ2xpZW50KHt9KSk7XG5cbmNvbnN0IFVTRVJTX1RBQkxFID0gcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEUhO1xuXG4vKipcbiAqIFNlc3Npb24gTWFuYWdlbWVudCBMYW1iZGFcbiAqIFxuICogSGFuZGxlczpcbiAqIC0gR2V0IGN1cnJlbnQgc2Vzc2lvbiBpbmZvXG4gKiAtIFZhbGlkYXRlIHNlc3Npb25cbiAqIC0gTG9nb3V0IChpbnZhbGlkYXRlIHRva2VucylcbiAqIC0gR2xvYmFsIHNpZ24gb3V0IChhbGwgZGV2aWNlcylcbiAqL1xuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBwYXRoID0gZXZlbnQucGF0aCB8fCBldmVudC5yZXNvdXJjZTtcbiAgICBjb25zdCBodHRwTWV0aG9kID0gZXZlbnQuaHR0cE1ldGhvZDtcblxuICAgIC8vIEV4dHJhY3QgYWNjZXNzIHRva2VuIGZyb20gQXV0aG9yaXphdGlvbiBoZWFkZXJcbiAgICBjb25zdCBhdXRoSGVhZGVyID0gZXZlbnQuaGVhZGVycy5BdXRob3JpemF0aW9uIHx8IGV2ZW50LmhlYWRlcnMuYXV0aG9yaXphdGlvbjtcbiAgICBpZiAoIWF1dGhIZWFkZXIgfHwgIWF1dGhIZWFkZXIuc3RhcnRzV2l0aCgnQmVhcmVyICcpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdNaXNzaW5nIG9yIGludmFsaWQgYXV0aG9yaXphdGlvbiBoZWFkZXInKTtcbiAgICB9XG5cbiAgICBjb25zdCBhY2Nlc3NUb2tlbiA9IGF1dGhIZWFkZXIuc3Vic3RyaW5nKDcpOyAvLyBSZW1vdmUgJ0JlYXJlciAnIHByZWZpeFxuXG4gICAgLy8gUm91dGUgdG8gYXBwcm9wcmlhdGUgaGFuZGxlclxuICAgIGlmIChwYXRoLmluY2x1ZGVzKCcvc2Vzc2lvbi9pbmZvJykgJiYgaHR0cE1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgIHJldHVybiBhd2FpdCBnZXRTZXNzaW9uSW5mbyhhY2Nlc3NUb2tlbik7XG4gICAgfSBlbHNlIGlmIChwYXRoLmluY2x1ZGVzKCcvc2Vzc2lvbi92YWxpZGF0ZScpICYmIGh0dHBNZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICByZXR1cm4gYXdhaXQgdmFsaWRhdGVTZXNzaW9uKGFjY2Vzc1Rva2VuKTtcbiAgICB9IGVsc2UgaWYgKHBhdGguaW5jbHVkZXMoJy9zZXNzaW9uL2xvZ291dCcpICYmIGh0dHBNZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgcmV0dXJuIGF3YWl0IGxvZ291dChhY2Nlc3NUb2tlbik7XG4gICAgfSBlbHNlIGlmIChwYXRoLmluY2x1ZGVzKCcvc2Vzc2lvbi9sb2dvdXQtYWxsJykgJiYgaHR0cE1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICByZXR1cm4gYXdhaXQgZ2xvYmFsU2lnbk91dChhY2Nlc3NUb2tlbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA0LCAnRW5kcG9pbnQgbm90IGZvdW5kJyk7XG5cbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1Nlc3Npb24gbWFuYWdlbWVudCBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnU2Vzc2lvbiBtYW5hZ2VtZW50IGZhaWxlZCcpO1xuICB9XG59O1xuXG4vKipcbiAqIEdldCBjdXJyZW50IHNlc3Npb24gaW5mb3JtYXRpb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0U2Vzc2lvbkluZm8oYWNjZXNzVG9rZW46IHN0cmluZyk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgZ2V0VXNlckNvbW1hbmQgPSBuZXcgR2V0VXNlckNvbW1hbmQoe1xuICAgICAgQWNjZXNzVG9rZW46IGFjY2Vzc1Rva2VuLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNlckRldGFpbHMgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQoZ2V0VXNlckNvbW1hbmQpO1xuICAgIGNvbnN0IHVzZXJJZCA9IHVzZXJEZXRhaWxzLlVzZXJBdHRyaWJ1dGVzPy5maW5kKGF0dHIgPT4gYXR0ci5OYW1lID09PSAnc3ViJyk/LlZhbHVlO1xuICAgIGNvbnN0IGVtYWlsID0gdXNlckRldGFpbHMuVXNlckF0dHJpYnV0ZXM/LmZpbmQoYXR0ciA9PiBhdHRyLk5hbWUgPT09ICdlbWFpbCcpPy5WYWx1ZTtcbiAgICBjb25zdCBlbWFpbFZlcmlmaWVkID0gdXNlckRldGFpbHMuVXNlckF0dHJpYnV0ZXM/LmZpbmQoYXR0ciA9PiBhdHRyLk5hbWUgPT09ICdlbWFpbF92ZXJpZmllZCcpPy5WYWx1ZTtcblxuICAgIC8vIEdldCBhZGRpdGlvbmFsIHVzZXIgaW5mbyBmcm9tIER5bmFtb0RCXG4gICAgbGV0IHVzZXJJbmZvID0gbnVsbDtcbiAgICBpZiAodXNlcklkKSB7XG4gICAgICBjb25zdCB1c2VyUmVzdWx0ID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IEdldENvbW1hbmQoe1xuICAgICAgICBUYWJsZU5hbWU6IFVTRVJTX1RBQkxFLFxuICAgICAgICBLZXk6IHsgdXNlcklkIH0sXG4gICAgICB9KSk7XG4gICAgICB1c2VySW5mbyA9IHVzZXJSZXN1bHQuSXRlbTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgIHVzZXJJZCxcbiAgICAgIGVtYWlsLFxuICAgICAgZW1haWxWZXJpZmllZDogZW1haWxWZXJpZmllZCA9PT0gJ3RydWUnLFxuICAgICAgdXNlcm5hbWU6IHVzZXJEZXRhaWxzLlVzZXJuYW1lLFxuICAgICAgdXNlclR5cGU6IHVzZXJJbmZvPy51c2VyVHlwZSxcbiAgICAgIHByb2ZpbGU6IHVzZXJJbmZvPy5wcm9maWxlLFxuICAgICAgbGFzdEFjdGl2ZTogdXNlckluZm8/Lmxhc3RBY3RpdmUsXG4gICAgICBtZmFFbmFibGVkOiB1c2VyRGV0YWlscy5Vc2VyTUZBU2V0dGluZ0xpc3QgJiYgdXNlckRldGFpbHMuVXNlck1GQVNldHRpbmdMaXN0Lmxlbmd0aCA+IDAsXG4gICAgICBwcmVmZXJyZWRNZmFTZXR0aW5nOiB1c2VyRGV0YWlscy5QcmVmZXJyZWRNZmFTZXR0aW5nLFxuICAgIH0pO1xuXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICBjb25zb2xlLmVycm9yKCdHZXQgc2Vzc2lvbiBpbmZvIGVycm9yOicsIGVycm9yKTtcblxuICAgIGlmIChlcnJvci5uYW1lID09PSAnTm90QXV0aG9yaXplZEV4Y2VwdGlvbicpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMSwgJ0ludmFsaWQgb3IgZXhwaXJlZCBhY2Nlc3MgdG9rZW4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdGYWlsZWQgdG8gcmV0cmlldmUgc2Vzc2lvbiBpbmZvcm1hdGlvbicpO1xuICB9XG59XG5cbi8qKlxuICogVmFsaWRhdGUgY3VycmVudCBzZXNzaW9uXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlU2Vzc2lvbihhY2Nlc3NUb2tlbjogc3RyaW5nKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBnZXRVc2VyQ29tbWFuZCA9IG5ldyBHZXRVc2VyQ29tbWFuZCh7XG4gICAgICBBY2Nlc3NUb2tlbjogYWNjZXNzVG9rZW4sXG4gICAgfSk7XG5cbiAgICBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQoZ2V0VXNlckNvbW1hbmQpO1xuXG4gICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICB2YWxpZDogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdTZXNzaW9uIGlzIHZhbGlkJyxcbiAgICB9KTtcblxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgY29uc29sZS5lcnJvcignVmFsaWRhdGUgc2Vzc2lvbiBlcnJvcjonLCBlcnJvcik7XG5cbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ05vdEF1dGhvcml6ZWRFeGNlcHRpb24nKSB7XG4gICAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgICBtZXNzYWdlOiAnU2Vzc2lvbiBpcyBpbnZhbGlkIG9yIGV4cGlyZWQnLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIHZhbGlkYXRlIHNlc3Npb24nKTtcbiAgfVxufVxuXG4vKipcbiAqIExvZ291dCAoaW52YWxpZGF0ZSBjdXJyZW50IHNlc3Npb24pXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGxvZ291dChhY2Nlc3NUb2tlbjogc3RyaW5nKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgdXNlciBpbmZvIGJlZm9yZSBsb2dvdXRcbiAgICBjb25zdCBnZXRVc2VyQ29tbWFuZCA9IG5ldyBHZXRVc2VyQ29tbWFuZCh7XG4gICAgICBBY2Nlc3NUb2tlbjogYWNjZXNzVG9rZW4sXG4gICAgfSk7XG4gICAgY29uc3QgdXNlckRldGFpbHMgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQoZ2V0VXNlckNvbW1hbmQpO1xuICAgIGNvbnN0IHVzZXJJZCA9IHVzZXJEZXRhaWxzLlVzZXJBdHRyaWJ1dGVzPy5maW5kKGF0dHIgPT4gYXR0ci5OYW1lID09PSAnc3ViJyk/LlZhbHVlO1xuXG4gICAgLy8gTm90ZTogQ29nbml0byBkb2Vzbid0IGhhdmUgYSBkaXJlY3QgXCJsb2dvdXRcIiBBUEkgZm9yIGFjY2VzcyB0b2tlbnNcbiAgICAvLyBBY2Nlc3MgdG9rZW5zIHJlbWFpbiB2YWxpZCB1bnRpbCBleHBpcmF0aW9uXG4gICAgLy8gVGhlIGNsaWVudCBzaG91bGQgZGlzY2FyZCB0aGUgdG9rZW5zXG4gICAgLy8gRm9yIHNlcnZlci1zaWRlIHRyYWNraW5nLCB3ZSBjYW4gdXBkYXRlIHRoZSB1c2VyJ3Mgc2Vzc2lvbiBzdGF0dXNcblxuICAgIGlmICh1c2VySWQpIHtcbiAgICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBVcGRhdGVDb21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiBVU0VSU19UQUJMRSxcbiAgICAgICAgS2V5OiB7IHVzZXJJZCB9LFxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIGxhc3RMb2dvdXQgPSA6dGltZXN0YW1wJyxcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAgICc6dGltZXN0YW1wJzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9LFxuICAgICAgfSkpO1xuICAgIH1cblxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgbWVzc2FnZTogJ0xvZ291dCBzdWNjZXNzZnVsLiBQbGVhc2UgZGlzY2FyZCB5b3VyIHRva2Vucy4nLFxuICAgICAgbG9nZ2VkT3V0OiB0cnVlLFxuICAgIH0pO1xuXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICBjb25zb2xlLmVycm9yKCdMb2dvdXQgZXJyb3I6JywgZXJyb3IpO1xuXG4gICAgaWYgKGVycm9yLm5hbWUgPT09ICdOb3RBdXRob3JpemVkRXhjZXB0aW9uJykge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAxLCAnSW52YWxpZCBvciBleHBpcmVkIGFjY2VzcyB0b2tlbicpO1xuICAgIH1cblxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0xvZ291dCBmYWlsZWQnKTtcbiAgfVxufVxuXG4vKipcbiAqIEdsb2JhbCBzaWduIG91dCAoaW52YWxpZGF0ZSBhbGwgc2Vzc2lvbnMgb24gYWxsIGRldmljZXMpXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdsb2JhbFNpZ25PdXQoYWNjZXNzVG9rZW46IHN0cmluZyk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IHVzZXIgaW5mbyBiZWZvcmUgc2lnbiBvdXRcbiAgICBjb25zdCBnZXRVc2VyQ29tbWFuZCA9IG5ldyBHZXRVc2VyQ29tbWFuZCh7XG4gICAgICBBY2Nlc3NUb2tlbjogYWNjZXNzVG9rZW4sXG4gICAgfSk7XG4gICAgY29uc3QgdXNlckRldGFpbHMgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQoZ2V0VXNlckNvbW1hbmQpO1xuICAgIGNvbnN0IHVzZXJJZCA9IHVzZXJEZXRhaWxzLlVzZXJBdHRyaWJ1dGVzPy5maW5kKGF0dHIgPT4gYXR0ci5OYW1lID09PSAnc3ViJyk/LlZhbHVlO1xuXG4gICAgLy8gR2xvYmFsIHNpZ24gb3V0IC0gaW52YWxpZGF0ZXMgYWxsIHRva2VucyBmb3IgdGhlIHVzZXJcbiAgICBjb25zdCBzaWduT3V0Q29tbWFuZCA9IG5ldyBHbG9iYWxTaWduT3V0Q29tbWFuZCh7XG4gICAgICBBY2Nlc3NUb2tlbjogYWNjZXNzVG9rZW4sXG4gICAgfSk7XG5cbiAgICBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQoc2lnbk91dENvbW1hbmQpO1xuXG4gICAgLy8gVXBkYXRlIHVzZXIgcmVjb3JkXG4gICAgaWYgKHVzZXJJZCkge1xuICAgICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IFVwZGF0ZUNvbW1hbmQoe1xuICAgICAgICBUYWJsZU5hbWU6IFVTRVJTX1RBQkxFLFxuICAgICAgICBLZXk6IHsgdXNlcklkIH0sXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgbGFzdExvZ291dCA9IDp0aW1lc3RhbXAsIGdsb2JhbFNpZ25PdXRBdCA9IDp0aW1lc3RhbXAnLFxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICAgJzp0aW1lc3RhbXAnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIH0sXG4gICAgICB9KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICBtZXNzYWdlOiAnR2xvYmFsIHNpZ24gb3V0IHN1Y2Nlc3NmdWwuIEFsbCBzZXNzaW9ucyBoYXZlIGJlZW4gaW52YWxpZGF0ZWQuJyxcbiAgICAgIHNpZ25lZE91dDogdHJ1ZSxcbiAgICB9KTtcblxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgY29uc29sZS5lcnJvcignR2xvYmFsIHNpZ24gb3V0IGVycm9yOicsIGVycm9yKTtcblxuICAgIGlmIChlcnJvci5uYW1lID09PSAnTm90QXV0aG9yaXplZEV4Y2VwdGlvbicpIHtcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMSwgJ0ludmFsaWQgb3IgZXhwaXJlZCBhY2Nlc3MgdG9rZW4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdHbG9iYWwgc2lnbiBvdXQgZmFpbGVkJyk7XG4gIH1cbn1cbiJdfQ==