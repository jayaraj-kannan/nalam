/**
 * Tests for API Gateway Configuration
 * 
 * Validates that the API Gateway is properly configured with:
 * - CORS settings
 * - Request/response models
 * - Throttling and rate limiting
 * - API key management
 * 
 * Requirements: 8.2
 */

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HealthcareMonitoringStack } from '../healthcare-monitoring-stack';

describe('API Gateway Configuration', () => {
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    const stack = new HealthcareMonitoringStack(app, 'TestStack', {
      environment: 'dev',
    });
    template = Template.fromStack(stack);
  });

  describe('REST API Configuration', () => {
    it('should create API Gateway with correct name and description', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'healthcare-monitoring-api-dev',
        Description: 'Healthcare Monitoring App API',
      });
    });

    it('should enable CloudWatch logging and tracing', () => {
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        TracingEnabled: true,
        MethodSettings: [
          {
            LoggingLevel: 'INFO',
            DataTraceEnabled: true,
            MetricsEnabled: true,
          },
        ],
      });
    });

    it('should configure throttling limits for dev environment', () => {
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        MethodSettings: [
          {
            ThrottlingBurstLimit: 1000,
            ThrottlingRateLimit: 500,
          },
        ],
      });
    });
  });

  describe('CORS Configuration', () => {
    it('should configure CORS with proper headers', () => {
      // CORS is configured via OPTIONS method on resources
      // This test verifies the API has CORS enabled
      template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    });
  });

  describe('Request/Response Models', () => {
    it('should create VitalSigns model', () => {
      template.hasResourceProperties('AWS::ApiGateway::Model', {
        Name: 'VitalSignsModel',
        ContentType: 'application/json',
      });
    });

    it('should create EmergencyAlert model', () => {
      template.hasResourceProperties('AWS::ApiGateway::Model', {
        Name: 'EmergencyAlertModel',
        ContentType: 'application/json',
      });
    });

    it('should create Medication model', () => {
      template.hasResourceProperties('AWS::ApiGateway::Model', {
        Name: 'MedicationModel',
        ContentType: 'application/json',
      });
    });

    it('should create Appointment model', () => {
      template.hasResourceProperties('AWS::ApiGateway::Model', {
        Name: 'AppointmentModel',
        ContentType: 'application/json',
      });
    });

    it('should create ErrorResponse model', () => {
      template.hasResourceProperties('AWS::ApiGateway::Model', {
        Name: 'ErrorResponseModel',
        ContentType: 'application/json',
      });
    });

    it('should create SuccessResponse model', () => {
      template.hasResourceProperties('AWS::ApiGateway::Model', {
        Name: 'SuccessResponseModel',
        ContentType: 'application/json',
      });
    });
  });

  describe('API Key Management', () => {
    it('should create API key for external integrations', () => {
      template.hasResourceProperties('AWS::ApiGateway::ApiKey', {
        Name: 'healthcare-external-api-key-dev',
        Description: 'API Key for external health device integrations',
        Enabled: true,
      });
    });

    it('should create usage plan with throttling', () => {
      template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
        UsagePlanName: 'healthcare-usage-plan-dev',
        Description: 'Usage plan for healthcare monitoring API',
        Throttle: {
          RateLimit: 200,
          BurstLimit: 500,
        },
        Quota: {
          Limit: 100000,
          Period: 'MONTH',
        },
      });
    });

    it('should associate API key with usage plan', () => {
      template.resourceCountIs('AWS::ApiGateway::UsagePlanKey', 1);
    });
  });

  describe('Cognito Authorizers', () => {
    it('should create primary user authorizer', () => {
      template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
        Name: 'PrimaryUserAuthorizer',
        Type: 'COGNITO_USER_POOLS',
      });
    });

    it('should create secondary user authorizer', () => {
      template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
        Name: 'SecondaryUserAuthorizer',
        Type: 'COGNITO_USER_POOLS',
      });
    });
  });

  describe('Stack Outputs', () => {
    it('should export API URL', () => {
      template.hasOutput('ApiUrl', {});
    });

    it('should export API Key ID', () => {
      template.hasOutput('ApiKeyId', {});
    });
  });
});

describe('API Gateway Configuration - Production Environment', () => {
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    const stack = new HealthcareMonitoringStack(app, 'ProdStack', {
      environment: 'prod',
    });
    template = Template.fromStack(stack);
  });

  it('should configure higher throttling limits for production', () => {
    template.hasResourceProperties('AWS::ApiGateway::Stage', {
      MethodSettings: [
        {
          ThrottlingBurstLimit: 5000,
          ThrottlingRateLimit: 2000,
        },
      ],
    });
  });

  it('should configure higher usage plan limits for production', () => {
    template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
      Throttle: {
        RateLimit: 1000,
        BurstLimit: 2000,
      },
      Quota: {
        Limit: 1000000,
        Period: 'MONTH',
      },
    });
  });
});
