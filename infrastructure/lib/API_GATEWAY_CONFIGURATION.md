# API Gateway Configuration

## Overview

The Healthcare Monitoring API Gateway is configured with comprehensive security, validation, and rate limiting features to ensure reliable and secure access to backend services.

**Requirements:** 8.2 - API Gateway configuration with CORS, throttling, rate limiting, and API key management

## Features

### 1. CORS Configuration

The API Gateway is configured with CORS to allow secure cross-origin requests from the frontend application:

- **Allowed Origins:** All origins (configurable per environment)
- **Allowed Methods:** All HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS)
- **Allowed Headers:** Content-Type, Authorization, X-Api-Key
- **Credentials:** Enabled for authenticated requests

### 2. Request/Response Models

The API includes validation models for all major data types:

#### Vital Signs Model
Validates health metrics with appropriate ranges:
- Heart Rate: 30-250 bpm
- Blood Pressure: Systolic (70-250), Diastolic (40-150)
- Temperature: 35-42°C
- Oxygen Saturation: 70-100%
- Weight: 20-300 kg
- Source: manual, device, or wearable

#### Emergency Alert Model
Validates emergency event data:
- Location (latitude/longitude)
- Symptoms (array of strings)
- Severity: low, medium, high, critical (required)

#### Medication Model
Validates medication scheduling:
- Name (1-200 characters, required)
- Dosage (1-100 characters, required)
- Frequency (1-100 characters, required)
- Scheduled Time (ISO 8601 format)
- Instructions (max 500 characters)

#### Appointment Model
Validates appointment data:
- Scheduled Time (ISO 8601 format, required)
- Type (1-100 characters, required)
- Provider information (name, specialty, phone)
- Notes (max 1000 characters)

#### Standard Response Models
- **Success Response:** message, data, timestamp
- **Error Response:** message, code, timestamp

### 3. Throttling and Rate Limiting

Environment-specific throttling configuration:

#### Production
- **Rate Limit:** 2,000 requests/second
- **Burst Limit:** 5,000 requests
- **Monthly Quota:** 1,000,000 requests

#### Staging
- **Rate Limit:** 1,000 requests/second
- **Burst Limit:** 2,000 requests
- **Monthly Quota:** 500,000 requests

#### Development
- **Rate Limit:** 500 requests/second
- **Burst Limit:** 1,000 requests
- **Monthly Quota:** 100,000 requests

### 4. API Key Management

API keys are configured for external integrations (health devices, third-party services):

- **API Key Name:** `healthcare-external-api-key-{environment}`
- **Usage Plan:** Associated with environment-specific throttling limits
- **Authentication:** API key passed via `X-Api-Key` header
- **Quota Management:** Monthly request limits enforced

### 5. Monitoring and Logging

The API Gateway is configured with comprehensive monitoring:

- **CloudWatch Logs:** INFO level logging for all requests
- **Data Tracing:** Full request/response logging enabled
- **Metrics:** Request count, latency, error rates
- **X-Ray Tracing:** Distributed tracing for performance analysis

### 6. Security Features

- **Cognito Authorizers:** Separate authorizers for primary and secondary users
- **JWT Token Validation:** Automatic token validation for authenticated endpoints
- **CloudWatch Role:** Automatic role creation for logging
- **Regional Endpoint:** REGIONAL endpoint type for lower latency

## Usage

### For Lambda Integration (Task 16.2)

When integrating Lambda functions with the API Gateway:

1. Use the appropriate request model for validation
2. Return responses matching the success/error response models
3. Configure method-level throttling if needed
4. Add appropriate authorizers (primary or secondary)

Example:
```typescript
const resource = api.root.addResource('health');
const method = resource.addMethod('POST', lambdaIntegration, {
  authorizer: primaryAuthorizer,
  requestModels: {
    'application/json': vitalSignsModel,
  },
  requestValidator: new apigateway.RequestValidator(this, 'Validator', {
    restApi: api,
    validateRequestBody: true,
    validateRequestParameters: true,
  }),
});
```

### For External Integrations

External services (health devices, third-party APIs) should:

1. Include the API key in the `X-Api-Key` header
2. Respect rate limits and handle 429 (Too Many Requests) responses
3. Follow the request/response model schemas
4. Implement exponential backoff for retries

## Outputs

The CDK stack exports the following values:

- **ApiUrl:** Base URL for the API Gateway
- **ApiKeyId:** API Key ID for retrieving the actual key value
- **PrimaryUserPoolId:** Cognito User Pool ID for primary users
- **SecondaryUserPoolId:** Cognito User Pool ID for secondary users

## Next Steps

Task 16.2 will wire Lambda functions to API Gateway endpoints using these configurations.
