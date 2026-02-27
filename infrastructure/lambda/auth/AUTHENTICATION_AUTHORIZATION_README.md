# API Authentication and Authorization Implementation

**Task 16.3: Implement API authentication and authorization**  
**Requirements: 8.2, 8.4**

## Overview

This implementation provides comprehensive API authentication and authorization for the Healthcare Monitoring App with:

- **JWT Token Validation**: Secure token verification using AWS Cognito JWT verifier
- **Role-Based Access Control (RBAC)**: Fine-grained access control based on user roles
- **Comprehensive Audit Logging**: Complete request logging for HIPAA compliance
- **Multi-User Pool Support**: Separate authentication for primary and secondary users

## Components

### 1. Custom Lambda Authorizer (`authorizer.ts`)

The custom Lambda authorizer provides enhanced JWT validation and RBAC for API Gateway.

#### Features

- **Dual User Pool Verification**: Validates tokens from both primary and secondary user pools
- **Token Expiration Validation**: Checks token expiration with 60-second buffer
- **Role-Based Access Control**: Enforces resource and method restrictions based on user roles
- **Comprehensive Audit Logging**: Logs all authentication attempts with detailed context

#### Role Permissions

**Primary User Role** (`primary_user`):
- Full access to own health data
- Can POST, PUT, DELETE own records
- Access to: `/health/*`, `/medications/*`, `/appointments/*`, `/alerts/*`, `/care-circle/*`, `/devices/*`

**Secondary User Role** (`secondary_user`):
- Read-only access to monitored users' data
- Limited write access (messages, preferences)
- Access to: `/health/trends/*`, `/health/data/*`, `/medications/adherence`, `/appointments`, `/alerts`, `/care-circle/*`
- Cannot DELETE or modify primary user data

**Admin Role** (`admin`):
- Full access to all resources
- All HTTP methods allowed
- Used for system administration

#### Usage

The authorizer is automatically invoked by API Gateway for all protected endpoints:

```typescript
// API Gateway configuration
const customAuthorizer = new apigateway.TokenAuthorizer(this, 'LambdaAuthorizer', {
  handler: authorizerLambda,
  identitySource: 'method.request.header.Authorization',
  resultsCacheTtl: cdk.Duration.minutes(5),
});
```

#### Authorization Context

The authorizer adds the following context to requests:

```typescript
{
  userId: string;        // Cognito user ID (sub claim)
  userType: string;      // 'primary' or 'secondary'
  email: string;         // User email
  role: string;          // User role (primary_user, secondary_user, admin)
  groups: string[];      // Cognito groups
}
```

### 2. API Middleware (`api-middleware.ts`)

Provides middleware functions for Lambda handlers to automatically log requests and handle common operations.

#### Features

- **Automatic Request Logging**: Logs all API requests with timing and context
- **Rate Limiting**: Simple in-memory rate limiting (production should use DynamoDB)
- **Request Validation**: Validates request bodies against required fields
- **Standardized Responses**: Helper functions for consistent API responses
- **Security Headers**: Automatically adds security headers to all responses

#### Usage

Wrap Lambda handlers with request logging:

```typescript
import { withRequestLogging, createSuccessResponse, createErrorResponse } from '../shared/api-middleware';

export const handler = withRequestLogging(async (event, context) => {
  try {
    // Your handler logic
    const result = await processRequest(event);
    return createSuccessResponse(result, 'Request processed successfully');
  } catch (error) {
    return createErrorResponse(500, error.message);
  }
});
```

#### Rate Limiting

```typescript
import { checkRateLimit } from '../shared/api-middleware';

const allowed = await checkRateLimit(
  userId,
  userType,
  ipAddress,
  100,    // 100 requests
  60000   // per 60 seconds
);

if (!allowed) {
  return createErrorResponse(429, 'Rate limit exceeded');
}
```

#### Request Validation

```typescript
import { validateRequestBody } from '../shared/api-middleware';

const { valid, errors, data } = validateRequestBody(
  JSON.parse(event.body),
  ['name', 'email', 'age']
);

if (!valid) {
  return createErrorResponse(400, errors.join(', '));
}
```

### 3. Enhanced Audit Logger (`audit-logger.ts`)

Provides comprehensive audit logging for HIPAA compliance.

#### New Functions

**`logApiRequest`**: Logs API requests with full context
```typescript
await logApiRequest(
  userId,
  userType,
  method,
  path,
  statusCode,
  requestId,
  duration,
  ipAddress,
  userAgent,
  requestBody,
  responseSize,
  metadata
);
```

**`logSecurityEvent`**: Logs security-related events
```typescript
await logSecurityEvent(
  'RATE_LIMIT_EXCEEDED',
  userId,
  userType,
  'medium',
  'Rate limit exceeded',
  ipAddress,
  { limit: 100, currentCount: 150 }
);
```

#### Audit Log Storage

- **DynamoDB**: Queryable audit trail with 7-year retention (HIPAA requirement)
- **CloudWatch Logs**: Real-time monitoring and alerting
- **Encryption**: All logs encrypted with KMS

### 4. API Gateway Configuration

The API Gateway is configured with:

- **Custom Lambda Authorizer**: JWT validation and RBAC
- **Request Validators**: Body and parameter validation
- **CloudWatch Logging**: Full request/response logging
- **Throttling**: Rate limiting at API Gateway level
- **CORS**: Configured for cross-origin requests

#### Audit Log Groups

- `/healthcare-monitoring/audit-{environment}`: Main audit log group
  - `authorizer-events`: Authentication and authorization events
  - `api-requests`: API request logs

## Security Features

### 1. JWT Token Validation

- Verifies token signature using Cognito public keys
- Validates token expiration with buffer
- Checks token use (must be 'access')
- Validates client ID matches expected value

### 2. Role-Based Access Control

- Resource-level access control
- Method-level restrictions (GET, POST, PUT, DELETE)
- Wildcard pattern matching for resource paths
- Deny-by-default security model

### 3. Audit Logging

All authentication and authorization events are logged with:
- User ID and email
- IP address and user agent
- Resource and action attempted
- Success/failure status
- Timestamp and request ID
- Detailed metadata

### 4. Security Headers

All API responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Access-Control-Allow-Credentials: true`

## Testing

### Unit Tests

**Authorizer Tests** (`auth/__tests__/authorizer.test.ts`):
- JWT token validation (valid, invalid, expired)
- Role-based access control
- Authorization context
- Audit logging

**Middleware Tests** (`shared/__tests__/api-middleware.test.ts`):
- Request logging
- Rate limiting
- Request validation
- Response helpers

### Running Tests

```bash
npm test --workspace=infrastructure -- lambda/auth/__tests__/authorizer.test.ts
npm test --workspace=infrastructure -- lambda/shared/__tests__/api-middleware.test.ts
```

## Deployment

The authentication and authorization components are automatically deployed as part of the CDK stack:

```bash
cd infrastructure
npm run deploy
```

### Environment Variables

The authorizer Lambda requires:
- `PRIMARY_USER_POOL_ID`: Cognito user pool ID for primary users
- `SECONDARY_USER_POOL_ID`: Cognito user pool ID for secondary users
- `PRIMARY_CLIENT_ID`: Cognito client ID for primary users
- `SECONDARY_CLIENT_ID`: Cognito client ID for secondary users
- `USERS_TABLE`: DynamoDB users table name
- `CARE_CIRCLE_TABLE`: DynamoDB care circle table name
- `AUDIT_LOG_GROUP`: CloudWatch log group for audit logs
- `ENVIRONMENT`: Deployment environment (dev, staging, prod)

## Monitoring

### CloudWatch Metrics

Monitor the following metrics:
- `AuthorizerLatency`: Time taken for authorization
- `AuthorizerErrors`: Failed authorization attempts
- `4XXError`: Client errors (unauthorized, forbidden)
- `5XXError`: Server errors

### CloudWatch Alarms

Set up alarms for:
- High authorization failure rate
- Increased latency
- Unusual access patterns
- Rate limit violations

### Audit Log Queries

Query audit logs for security analysis:

```sql
-- Failed authentication attempts
fields @timestamp, userId, ipAddress, errorMessage
| filter eventType = "AUTHENTICATION_FAILED"
| sort @timestamp desc

-- Access denied events
fields @timestamp, userId, resource, action
| filter eventType = "ACCESS_DENIED"
| sort @timestamp desc

-- Rate limit violations
fields @timestamp, userId, ipAddress, metadata.currentCount
| filter eventType = "SECURITY_RATE_LIMIT_EXCEEDED"
| sort @timestamp desc
```

## HIPAA Compliance

This implementation supports HIPAA compliance through:

1. **Audit Logging**: All access events logged with 7-year retention
2. **Encryption**: All data encrypted in transit (TLS) and at rest (KMS)
3. **Access Control**: Fine-grained permissions and role-based access
4. **Authentication**: Multi-factor authentication required (Cognito)
5. **Monitoring**: Real-time security monitoring and alerting

## Best Practices

1. **Token Caching**: Authorization results cached for 5 minutes to reduce latency
2. **Least Privilege**: Users granted minimum necessary permissions
3. **Defense in Depth**: Multiple layers of security (API Gateway, Lambda, DynamoDB)
4. **Fail Secure**: Deny access by default, explicit allow required
5. **Comprehensive Logging**: All security events logged for audit trail

## Troubleshooting

### Common Issues

**"Unauthorized" Error**:
- Check token is valid and not expired
- Verify token is from correct user pool
- Ensure Authorization header format: `Bearer <token>`

**"Access Denied" Error**:
- Check user role has permission for resource
- Verify HTTP method is allowed for role
- Review RBAC configuration in authorizer

**High Latency**:
- Check authorizer cache TTL (default 5 minutes)
- Monitor DynamoDB and Cognito performance
- Review CloudWatch logs for bottlenecks

## Future Enhancements

1. **Distributed Rate Limiting**: Use DynamoDB or ElastiCache for rate limiting
2. **IP Whitelisting**: Restrict access by IP address
3. **Anomaly Detection**: ML-based detection of unusual access patterns
4. **Fine-Grained Permissions**: Per-resource permission management
5. **OAuth 2.0 Scopes**: Implement OAuth scopes for third-party integrations

## References

- [AWS API Gateway Lambda Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html)
- [AWS JWT Verify Library](https://github.com/awslabs/aws-jwt-verify)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
