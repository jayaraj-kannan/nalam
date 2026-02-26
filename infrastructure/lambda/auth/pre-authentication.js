"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({}));
const USERS_TABLE = process.env.USERS_TABLE;
/**
 * Pre-Authentication Trigger
 *
 * This Lambda function is triggered before a user is authenticated.
 * It can be used to:
 * - Perform custom validation
 * - Check if user account is active
 * - Implement custom authentication logic
 * - Log authentication attempts
 * - Block suspicious login attempts
 */
const handler = async (event) => {
    console.log('Pre-authentication trigger invoked:', JSON.stringify(event, null, 2));
    try {
        const { userPoolId, userName, request } = event;
        const userId = event.request.userAttributes.sub;
        // Log authentication attempt
        console.log(`Authentication attempt for user: ${userName} (${userId}) in pool: ${userPoolId}`);
        // Check if user exists in DynamoDB
        const userResult = await dynamoClient.send(new lib_dynamodb_1.GetCommand({
            TableName: USERS_TABLE,
            Key: { userId },
        }));
        if (!userResult.Item) {
            console.warn(`User ${userId} not found in DynamoDB`);
            // Allow authentication to proceed - user record will be created if needed
        }
        else {
            console.log(`User ${userId} found in DynamoDB`);
            // Check if user account is active (custom logic)
            // You can add custom checks here, for example:
            // - Check if account is suspended
            // - Check if user has completed onboarding
            // - Verify user's subscription status
            const userStatus = userResult.Item.status;
            if (userStatus === 'suspended') {
                throw new Error('Account has been suspended. Please contact support.');
            }
        }
        // Check for suspicious activity (example: too many failed attempts)
        const clientMetadata = request.clientMetadata || {};
        const ipAddress = clientMetadata.ipAddress;
        if (ipAddress) {
            console.log(`Authentication attempt from IP: ${ipAddress}`);
            // You could implement rate limiting or IP blocking here
        }
        // Validate user attributes
        const email = event.request.userAttributes.email;
        const emailVerified = event.request.userAttributes.email_verified;
        if (!emailVerified || emailVerified === 'false') {
            console.warn(`User ${userName} attempting to login with unverified email: ${email}`);
            // Cognito will handle this, but we log it for monitoring
        }
        // Return the event to allow authentication to proceed
        return event;
    }
    catch (error) {
        console.error('Pre-authentication error:', error);
        // Throw error to prevent authentication
        throw new Error(error.message || 'Authentication failed due to security check');
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlLWF1dGhlbnRpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJlLWF1dGhlbnRpY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDhEQUEwRDtBQUMxRCx3REFBMkU7QUFFM0UsTUFBTSxZQUFZLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBWSxDQUFDO0FBRTdDOzs7Ozs7Ozs7O0dBVUc7QUFDSSxNQUFNLE9BQU8sR0FBb0MsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO0lBQ3RFLE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkYsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQ2hELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQztRQUVoRCw2QkFBNkI7UUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsUUFBUSxLQUFLLE1BQU0sY0FBYyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRS9GLG1DQUFtQztRQUNuQyxNQUFNLFVBQVUsR0FBRyxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSx5QkFBVSxDQUFDO1lBQ3hELFNBQVMsRUFBRSxXQUFXO1lBQ3RCLEdBQUcsRUFBRSxFQUFFLE1BQU0sRUFBRTtTQUNoQixDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDckIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLE1BQU0sd0JBQXdCLENBQUMsQ0FBQztZQUNyRCwwRUFBMEU7UUFDNUUsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsTUFBTSxvQkFBb0IsQ0FBQyxDQUFDO1lBRWhELGlEQUFpRDtZQUNqRCwrQ0FBK0M7WUFDL0Msa0NBQWtDO1lBQ2xDLDJDQUEyQztZQUMzQyxzQ0FBc0M7WUFFdEMsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDMUMsSUFBSSxVQUFVLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMscURBQXFELENBQUMsQ0FBQztZQUN6RSxDQUFDO1FBQ0gsQ0FBQztRQUVELG9FQUFvRTtRQUNwRSxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQztRQUNwRCxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDO1FBRTNDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBQzVELHdEQUF3RDtRQUMxRCxDQUFDO1FBRUQsMkJBQTJCO1FBQzNCLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQztRQUNqRCxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUM7UUFFbEUsSUFBSSxDQUFDLGFBQWEsSUFBSSxhQUFhLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLFFBQVEsK0NBQStDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDckYseURBQXlEO1FBQzNELENBQUM7UUFFRCxzREFBc0Q7UUFDdEQsT0FBTyxLQUFLLENBQUM7SUFFZixDQUFDO0lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztRQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxELHdDQUF3QztRQUN4QyxNQUFNLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksNkNBQTZDLENBQUMsQ0FBQztJQUNsRixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBN0RXLFFBQUEsT0FBTyxXQTZEbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQcmVBdXRoZW50aWNhdGlvblRyaWdnZXJFdmVudCwgUHJlQXV0aGVudGljYXRpb25UcmlnZ2VySGFuZGxlciB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgR2V0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5cbmNvbnN0IGR5bmFtb0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShuZXcgRHluYW1vREJDbGllbnQoe30pKTtcbmNvbnN0IFVTRVJTX1RBQkxFID0gcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEUhO1xuXG4vKipcbiAqIFByZS1BdXRoZW50aWNhdGlvbiBUcmlnZ2VyXG4gKiBcbiAqIFRoaXMgTGFtYmRhIGZ1bmN0aW9uIGlzIHRyaWdnZXJlZCBiZWZvcmUgYSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gKiBJdCBjYW4gYmUgdXNlZCB0bzpcbiAqIC0gUGVyZm9ybSBjdXN0b20gdmFsaWRhdGlvblxuICogLSBDaGVjayBpZiB1c2VyIGFjY291bnQgaXMgYWN0aXZlXG4gKiAtIEltcGxlbWVudCBjdXN0b20gYXV0aGVudGljYXRpb24gbG9naWNcbiAqIC0gTG9nIGF1dGhlbnRpY2F0aW9uIGF0dGVtcHRzXG4gKiAtIEJsb2NrIHN1c3BpY2lvdXMgbG9naW4gYXR0ZW1wdHNcbiAqL1xuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IFByZUF1dGhlbnRpY2F0aW9uVHJpZ2dlckhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcbiAgY29uc29sZS5sb2coJ1ByZS1hdXRoZW50aWNhdGlvbiB0cmlnZ2VyIGludm9rZWQ6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcblxuICB0cnkge1xuICAgIGNvbnN0IHsgdXNlclBvb2xJZCwgdXNlck5hbWUsIHJlcXVlc3QgfSA9IGV2ZW50O1xuICAgIGNvbnN0IHVzZXJJZCA9IGV2ZW50LnJlcXVlc3QudXNlckF0dHJpYnV0ZXMuc3ViO1xuXG4gICAgLy8gTG9nIGF1dGhlbnRpY2F0aW9uIGF0dGVtcHRcbiAgICBjb25zb2xlLmxvZyhgQXV0aGVudGljYXRpb24gYXR0ZW1wdCBmb3IgdXNlcjogJHt1c2VyTmFtZX0gKCR7dXNlcklkfSkgaW4gcG9vbDogJHt1c2VyUG9vbElkfWApO1xuXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBleGlzdHMgaW4gRHluYW1vREJcbiAgICBjb25zdCB1c2VyUmVzdWx0ID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IEdldENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBVU0VSU19UQUJMRSxcbiAgICAgIEtleTogeyB1c2VySWQgfSxcbiAgICB9KSk7XG5cbiAgICBpZiAoIXVzZXJSZXN1bHQuSXRlbSkge1xuICAgICAgY29uc29sZS53YXJuKGBVc2VyICR7dXNlcklkfSBub3QgZm91bmQgaW4gRHluYW1vREJgKTtcbiAgICAgIC8vIEFsbG93IGF1dGhlbnRpY2F0aW9uIHRvIHByb2NlZWQgLSB1c2VyIHJlY29yZCB3aWxsIGJlIGNyZWF0ZWQgaWYgbmVlZGVkXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKGBVc2VyICR7dXNlcklkfSBmb3VuZCBpbiBEeW5hbW9EQmApO1xuICAgICAgXG4gICAgICAvLyBDaGVjayBpZiB1c2VyIGFjY291bnQgaXMgYWN0aXZlIChjdXN0b20gbG9naWMpXG4gICAgICAvLyBZb3UgY2FuIGFkZCBjdXN0b20gY2hlY2tzIGhlcmUsIGZvciBleGFtcGxlOlxuICAgICAgLy8gLSBDaGVjayBpZiBhY2NvdW50IGlzIHN1c3BlbmRlZFxuICAgICAgLy8gLSBDaGVjayBpZiB1c2VyIGhhcyBjb21wbGV0ZWQgb25ib2FyZGluZ1xuICAgICAgLy8gLSBWZXJpZnkgdXNlcidzIHN1YnNjcmlwdGlvbiBzdGF0dXNcbiAgICAgIFxuICAgICAgY29uc3QgdXNlclN0YXR1cyA9IHVzZXJSZXN1bHQuSXRlbS5zdGF0dXM7XG4gICAgICBpZiAodXNlclN0YXR1cyA9PT0gJ3N1c3BlbmRlZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBY2NvdW50IGhhcyBiZWVuIHN1c3BlbmRlZC4gUGxlYXNlIGNvbnRhY3Qgc3VwcG9ydC4nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3Igc3VzcGljaW91cyBhY3Rpdml0eSAoZXhhbXBsZTogdG9vIG1hbnkgZmFpbGVkIGF0dGVtcHRzKVxuICAgIGNvbnN0IGNsaWVudE1ldGFkYXRhID0gcmVxdWVzdC5jbGllbnRNZXRhZGF0YSB8fCB7fTtcbiAgICBjb25zdCBpcEFkZHJlc3MgPSBjbGllbnRNZXRhZGF0YS5pcEFkZHJlc3M7XG4gICAgXG4gICAgaWYgKGlwQWRkcmVzcykge1xuICAgICAgY29uc29sZS5sb2coYEF1dGhlbnRpY2F0aW9uIGF0dGVtcHQgZnJvbSBJUDogJHtpcEFkZHJlc3N9YCk7XG4gICAgICAvLyBZb3UgY291bGQgaW1wbGVtZW50IHJhdGUgbGltaXRpbmcgb3IgSVAgYmxvY2tpbmcgaGVyZVxuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIHVzZXIgYXR0cmlidXRlc1xuICAgIGNvbnN0IGVtYWlsID0gZXZlbnQucmVxdWVzdC51c2VyQXR0cmlidXRlcy5lbWFpbDtcbiAgICBjb25zdCBlbWFpbFZlcmlmaWVkID0gZXZlbnQucmVxdWVzdC51c2VyQXR0cmlidXRlcy5lbWFpbF92ZXJpZmllZDtcblxuICAgIGlmICghZW1haWxWZXJpZmllZCB8fCBlbWFpbFZlcmlmaWVkID09PSAnZmFsc2UnKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFVzZXIgJHt1c2VyTmFtZX0gYXR0ZW1wdGluZyB0byBsb2dpbiB3aXRoIHVudmVyaWZpZWQgZW1haWw6ICR7ZW1haWx9YCk7XG4gICAgICAvLyBDb2duaXRvIHdpbGwgaGFuZGxlIHRoaXMsIGJ1dCB3ZSBsb2cgaXQgZm9yIG1vbml0b3JpbmdcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIGV2ZW50IHRvIGFsbG93IGF1dGhlbnRpY2F0aW9uIHRvIHByb2NlZWRcbiAgICByZXR1cm4gZXZlbnQ7XG5cbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1ByZS1hdXRoZW50aWNhdGlvbiBlcnJvcjonLCBlcnJvcik7XG4gICAgXG4gICAgLy8gVGhyb3cgZXJyb3IgdG8gcHJldmVudCBhdXRoZW50aWNhdGlvblxuICAgIHRocm93IG5ldyBFcnJvcihlcnJvci5tZXNzYWdlIHx8ICdBdXRoZW50aWNhdGlvbiBmYWlsZWQgZHVlIHRvIHNlY3VyaXR5IGNoZWNrJyk7XG4gIH1cbn07XG4iXX0=