# Authentication Lambda Functions

This directory contains Lambda functions for user authentication and session management in the Healthcare Monitoring App.

## Overview

The authentication system uses Amazon Cognito for user management with multi-factor authentication (MFA) support. There are separate user pools for Primary Users (elderly users) and Secondary Users (caregivers/family members).

## Lambda Functions

### 1. Register (`register.ts`)

**Purpose:** Handle user registration with email verification

**Endpoint:** `POST /api/v1/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "userType": "primary" | "secondary",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "phone": "+1234567890",
    "dateOfBirth": "1950-01-01"
  },
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "userType": "primary",
  "message": "Registration successful. Please check your email to verify your account.",
  "emailVerificationRequired": true
}
```

**Features:**
- Creates user in appropriate Cognito user pool (primary or secondary)
- Stores user profile in DynamoDB
- Sends email verification code
- Initializes default preferences and settings
- Sets baseline vitals for primary users

### 2. Login (`login.ts`)

**Purpose:** Authenticate users with MFA support

**Endpoint:** `POST /api/v1/auth/login`

**Request Body (Initial):**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "userType": "primary" | "secondary"
}
```

**Response (MFA Required):**
```json
{
  "challengeName": "SOFTWARE_TOKEN_MFA",
  "session": "session-token",
  "message": "MFA code required. Please provide the code from your authenticator app or SMS.",
  "mfaRequired": true
}
```

**Request Body (MFA Response):**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "userType": "primary",
  "mfaCode": "123456",
  "session": "session-token"
}
```

**Response (Success):**
```json
{
  "accessToken": "jwt-access-token",
  "idToken": "jwt-id-token",
  "refreshToken": "jwt-refresh-token",
  "expiresIn": 3600,
  "userId": "uuid",
  "userType": "primary",
  "message": "Login successful"
}
```

**Features:**
- Supports USER_PASSWORD_AUTH flow
- Handles MFA challenges (SMS and TOTP)
- Updates last active timestamp
- Returns JWT tokens for API access

### 3. Verify Email (`verify-email.ts`)

**Purpose:** Verify user email address and resend verification codes

**Endpoint:** `POST /api/v1/auth/verify-email`

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "userType": "primary" | "secondary"
}
```

**Response:**
```json
{
  "message": "Email verified successfully. You can now log in.",
  "verified": true
}
```

**Resend Code Endpoint:** `POST /api/v1/auth/verify-email/resend`

**Request Body:**
```json
{
  "email": "user@example.com",
  "userType": "primary" | "secondary"
}
```

**Features:**
- Confirms user email address
- Resends verification codes
- Handles expired codes

### 4. Refresh Token (`refresh-token.ts`)

**Purpose:** Refresh access tokens using refresh token

**Endpoint:** `POST /api/v1/auth/refresh-token`

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token",
  "userType": "primary" | "secondary"
}
```

**Response:**
```json
{
  "accessToken": "new-jwt-access-token",
  "idToken": "new-jwt-id-token",
  "expiresIn": 3600,
  "userId": "uuid",
  "message": "Token refreshed successfully"
}
```

**Features:**
- Refreshes expired access tokens
- Updates last active timestamp
- Maintains user session

### 5. Session Management (`session-management.ts`)

**Purpose:** Manage user sessions and handle logout

**Endpoints:**

#### Get Session Info
`GET /api/v1/auth/session/info`

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "emailVerified": true,
  "username": "user@example.com",
  "userType": "primary",
  "profile": { ... },
  "lastActive": "2024-01-01T00:00:00Z",
  "mfaEnabled": true,
  "preferredMfaSetting": "SOFTWARE_TOKEN_MFA"
}
```

#### Validate Session
`GET /api/v1/auth/session/validate`

**Response:**
```json
{
  "valid": true,
  "message": "Session is valid"
}
```

#### Logout
`POST /api/v1/auth/session/logout`

**Response:**
```json
{
  "message": "Logout successful. Please discard your tokens.",
  "loggedOut": true
}
```

#### Global Sign Out (All Devices)
`POST /api/v1/auth/session/logout-all`

**Response:**
```json
{
  "message": "Global sign out successful. All sessions have been invalidated.",
  "signedOut": true
}
```

### 6. Pre-Authentication Trigger (`pre-authentication.ts`)

**Purpose:** Cognito trigger executed before authentication

**Trigger Type:** Pre-Authentication Lambda Trigger

**Features:**
- Validates user account status
- Checks for suspended accounts
- Logs authentication attempts
- Monitors suspicious activity
- Can block authentication if needed

**Configuration:**
- Automatically invoked by Cognito
- No direct API endpoint
- Configured in Cognito User Pool settings

### 7. Post-Authentication Trigger (`post-authentication.ts`)

**Purpose:** Cognito trigger executed after successful authentication

**Trigger Type:** Post-Authentication Lambda Trigger

**Features:**
- Updates last login timestamp
- Tracks login count
- Notifies care circle of primary user login (optional)
- Logs authentication patterns for security
- Detects first-time logins

**Configuration:**
- Automatically invoked by Cognito
- No direct API endpoint
- Configured in Cognito User Pool settings

## Environment Variables

All Lambda functions require the following environment variables:

```bash
PRIMARY_USER_POOL_ID=<cognito-user-pool-id>
SECONDARY_USER_POOL_ID=<cognito-user-pool-id>
PRIMARY_USER_POOL_CLIENT_ID=<cognito-client-id>
SECONDARY_USER_POOL_CLIENT_ID=<cognito-client-id>
USERS_TABLE=<dynamodb-table-name>
ALERT_TOPIC_ARN=<sns-topic-arn> # For post-auth trigger only
```

## Security Features

### Multi-Factor Authentication (MFA)
- Required for all users (HIPAA compliance)
- Supports SMS and TOTP (authenticator apps)
- Configured at user pool level

### Password Policy
- Minimum 12 characters
- Requires uppercase, lowercase, numbers, and symbols
- Enforced by Cognito

### Token Management
- Access tokens expire after 1 hour
- Refresh tokens valid for 30 days
- ID tokens contain user claims
- Global sign out invalidates all tokens

### Audit Logging
- All authentication events logged to CloudWatch
- Login attempts tracked in DynamoDB
- Failed authentication attempts monitored
- IP addresses and user agents logged

## Error Handling

All functions return standardized error responses:

```json
{
  "error": "Error message"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid credentials or token)
- `403` - Forbidden (account not verified or suspended)
- `404` - Not Found (user doesn't exist)
- `409` - Conflict (user already exists)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

## Integration with CDK

These Lambda functions should be deployed using AWS CDK. Example configuration:

```typescript
const registerFunction = new lambda.Function(this, 'RegisterFunction', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'register.handler',
  code: lambda.Code.fromAsset('infrastructure/lambda/auth'),
  environment: {
    PRIMARY_USER_POOL_ID: primaryUserPool.userPoolId,
    SECONDARY_USER_POOL_ID: secondaryUserPool.userPoolId,
    PRIMARY_USER_POOL_CLIENT_ID: primaryUserPoolClient.userPoolClientId,
    SECONDARY_USER_POOL_CLIENT_ID: secondaryUserPoolClient.userPoolClientId,
    USERS_TABLE: usersTable.tableName,
  },
});
```

## Testing

Unit tests should cover:
- Valid registration and login flows
- MFA challenge handling
- Token refresh logic
- Email verification
- Session management
- Error cases and edge conditions
- Cognito trigger behavior

## HIPAA Compliance

These functions support HIPAA compliance through:
- Encrypted data in transit (TLS)
- Encrypted data at rest (KMS)
- Audit logging (CloudTrail)
- MFA requirement
- Strong password policies
- Session management and timeout
- Access control and authorization

## Related Documentation

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Lambda Triggers for Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html)
- [Healthcare Monitoring App Design Document](../../../.kiro/specs/healthcare-monitoring-app/design.md)
