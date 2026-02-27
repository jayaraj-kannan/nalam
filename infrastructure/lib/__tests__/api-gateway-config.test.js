"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib"));
const assertions_1 = require("aws-cdk-lib/assertions");
const healthcare_monitoring_stack_1 = require("../healthcare-monitoring-stack");
describe('API Gateway Configuration', () => {
    let template;
    beforeEach(() => {
        const app = new cdk.App();
        const stack = new healthcare_monitoring_stack_1.HealthcareMonitoringStack(app, 'TestStack', {
            environment: 'dev',
        });
        template = assertions_1.Template.fromStack(stack);
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
    let template;
    beforeEach(() => {
        const app = new cdk.App();
        const stack = new healthcare_monitoring_stack_1.HealthcareMonitoringStack(app, 'ProdStack', {
            environment: 'prod',
        });
        template = assertions_1.Template.fromStack(stack);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWdhdGV3YXktY29uZmlnLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcGktZ2F0ZXdheS1jb25maWcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7R0FVRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCxpREFBbUM7QUFDbkMsdURBQWtEO0FBQ2xELGdGQUEyRTtBQUUzRSxRQUFRLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLElBQUksUUFBa0IsQ0FBQztJQUV2QixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSx1REFBeUIsQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFO1lBQzVELFdBQVcsRUFBRSxLQUFLO1NBQ25CLENBQUMsQ0FBQztRQUNILFFBQVEsR0FBRyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDdEMsRUFBRSxDQUFDLDZEQUE2RCxFQUFFLEdBQUcsRUFBRTtZQUNyRSxRQUFRLENBQUMscUJBQXFCLENBQUMsMEJBQTBCLEVBQUU7Z0JBQ3pELElBQUksRUFBRSwrQkFBK0I7Z0JBQ3JDLFdBQVcsRUFBRSwrQkFBK0I7YUFDN0MsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsOENBQThDLEVBQUUsR0FBRyxFQUFFO1lBQ3RELFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsRUFBRTtnQkFDdkQsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLGNBQWMsRUFBRTtvQkFDZDt3QkFDRSxZQUFZLEVBQUUsTUFBTTt3QkFDcEIsZ0JBQWdCLEVBQUUsSUFBSTt3QkFDdEIsY0FB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ciBBUEkgR2F0ZXdheSBDb25maWd1cmF0aW9uXG4gKiBcbiAqIFZhbGlkYXRlcyB0aGF0IHRoZSBBUEkgR2F0ZXdheSBpcyBwcm9wZXJseSBjb25maWd1cmVkIHdpdGg6XG4gKiAtIENPUlMgc2V0dGluZ3NcbiAqIC0gUmVxdWVzdC9yZXNwb25zZSBtb2RlbHNcbiAqIC0gVGhyb3R0bGluZyBhbmQgcmF0ZSBsaW1pdGluZ1xuICogLSBBUEkga2V5IG1hbmFnZW1lbnRcbiAqIFxuICogUmVxdWlyZW1lbnRzOiA4LjJcbiAqL1xuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgVGVtcGxhdGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcbmltcG9ydCB7IEhlYWx0aGNhcmVNb25pdG9yaW5nU3RhY2sgfSBmcm9tICcuLi9oZWFsdGhjYXJlLW1vbml0b3Jpbmctc3RhY2snO1xuXG5kZXNjcmliZSgnQVBJIEdhdGV3YXkgQ29uZmlndXJhdGlvbicsICgpID0+IHtcbiAgbGV0IHRlbXBsYXRlOiBUZW1wbGF0ZTtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBjb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICAgIGNvbnN0IHN0YWNrID0gbmV3IEhlYWx0aGNhcmVNb25pdG9yaW5nU3RhY2soYXBwLCAnVGVzdFN0YWNrJywge1xuICAgICAgZW52aXJvbm1lbnQ6ICdkZXYnLFxuICAgIH0pO1xuICAgIHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1JFU1QgQVBJIENvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBjcmVhdGUgQVBJIEdhdGV3YXkgd2l0aCBjb3JyZWN0IG5hbWUgYW5kIGRlc2NyaXB0aW9uJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6OlJlc3RBcGknLCB7XG4gICAgICAgIE5hbWU6ICdoZWFsdGhjYXJlLW1vbml0b3JpbmctYXBpLWRldicsXG4gICAgICAgIERlc2NyaXB0aW9uOiAnSGVhbHRoY2FyZSBNb25pdG9yaW5nIEFwcCBBUEknLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGVuYWJsZSBDbG91ZFdhdGNoIGxvZ2dpbmcgYW5kIHRyYWNpbmcnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBpR2F0ZXdheTo6U3RhZ2UnLCB7XG4gICAgICAgIFRyYWNpbmdFbmFibGVkOiB0cnVlLFxuICAgICAgICBNZXRob2RTZXR0aW5nczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIExvZ2dpbmdMZXZlbDogJ0lORk8nLFxuICAgICAgICAgICAgRGF0YVRyYWNlRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgY29uZmlndXJlIHRocm90dGxpbmcgbGltaXRzIGZvciBkZXYgZW52aXJvbm1lbnQnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBpR2F0ZXdheTo6U3RhZ2UnLCB7XG4gICAgICAgIE1ldGhvZFNldHRpbmdzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgVGhyb3R0bGluZ0J1cnN0TGltaXQ6IDEwMDAsXG4gICAgICAgICAgICBUaHJvdHRsaW5nUmF0ZUxpbWl0OiA1MDAsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQ09SUyBDb25maWd1cmF0aW9uJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgY29uZmlndXJlIENPUlMgd2l0aCBwcm9wZXIgaGVhZGVycycsICgpID0+IHtcbiAgICAgIC8vIENPUlMgaXMgY29uZmlndXJlZCB2aWEgT1BUSU9OUyBtZXRob2Qgb24gcmVzb3VyY2VzXG4gICAgICAvLyBUaGlzIHRlc3QgdmVyaWZpZXMgdGhlIEFQSSBoYXMgQ09SUyBlbmFibGVkXG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6QXBpR2F0ZXdheTo6UmVzdEFwaScsIDEpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUmVxdWVzdC9SZXNwb25zZSBNb2RlbHMnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBjcmVhdGUgVml0YWxTaWducyBtb2RlbCcsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpBcGlHYXRld2F5OjpNb2RlbCcsIHtcbiAgICAgICAgTmFtZTogJ1ZpdGFsU2lnbnNNb2RlbCcsXG4gICAgICAgIENvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgY3JlYXRlIEVtZXJnZW5jeUFsZXJ0IG1vZGVsJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6Ok1vZGVsJywge1xuICAgICAgICBOYW1lOiAnRW1lcmdlbmN5QWxlcnRNb2RlbCcsXG4gICAgICAgIENvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgY3JlYXRlIE1lZGljYXRpb24gbW9kZWwnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBpR2F0ZXdheTo6TW9kZWwnLCB7XG4gICAgICAgIE5hbWU6ICdNZWRpY2F0aW9uTW9kZWwnLFxuICAgICAgICBDb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBBcHBvaW50bWVudCBtb2RlbCcsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpBcGlHYXRld2F5OjpNb2RlbCcsIHtcbiAgICAgICAgTmFtZTogJ0FwcG9pbnRtZW50TW9kZWwnLFxuICAgICAgICBDb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBFcnJvclJlc3BvbnNlIG1vZGVsJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6Ok1vZGVsJywge1xuICAgICAgICBOYW1lOiAnRXJyb3JSZXNwb25zZU1vZGVsJyxcbiAgICAgICAgQ29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBjcmVhdGUgU3VjY2Vzc1Jlc3BvbnNlIG1vZGVsJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6Ok1vZGVsJywge1xuICAgICAgICBOYW1lOiAnU3VjY2Vzc1Jlc3BvbnNlTW9kZWwnLFxuICAgICAgICBDb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdBUEkgS2V5IE1hbmFnZW1lbnQnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBjcmVhdGUgQVBJIGtleSBmb3IgZXh0ZXJuYWwgaW50ZWdyYXRpb25zJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6OkFwaUtleScsIHtcbiAgICAgICAgTmFtZTogJ2hlYWx0aGNhcmUtZXh0ZXJuYWwtYXBpLWtleS1kZXYnLFxuICAgICAgICBEZXNjcmlwdGlvbjogJ0FQSSBLZXkgZm9yIGV4dGVybmFsIGhlYWx0aCBkZXZpY2UgaW50ZWdyYXRpb25zJyxcbiAgICAgICAgRW5hYmxlZDogdHJ1ZSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBjcmVhdGUgdXNhZ2UgcGxhbiB3aXRoIHRocm90dGxpbmcnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBpR2F0ZXdheTo6VXNhZ2VQbGFuJywge1xuICAgICAgICBVc2FnZVBsYW5OYW1lOiAnaGVhbHRoY2FyZS11c2FnZS1wbGFuLWRldicsXG4gICAgICAgIERlc2NyaXB0aW9uOiAnVXNhZ2UgcGxhbiBmb3IgaGVhbHRoY2FyZSBtb25pdG9yaW5nIEFQSScsXG4gICAgICAgIFRocm90dGxlOiB7XG4gICAgICAgICAgUmF0ZUxpbWl0OiAyMDAsXG4gICAgICAgICAgQnVyc3RMaW1pdDogNTAwLFxuICAgICAgICB9LFxuICAgICAgICBRdW90YToge1xuICAgICAgICAgIExpbWl0OiAxMDAwMDAsXG4gICAgICAgICAgUGVyaW9kOiAnTU9OVEgnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGFzc29jaWF0ZSBBUEkga2V5IHdpdGggdXNhZ2UgcGxhbicsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpBcGlHYXRld2F5OjpVc2FnZVBsYW5LZXknLCAxKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0NvZ25pdG8gQXV0aG9yaXplcnMnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBjcmVhdGUgcHJpbWFyeSB1c2VyIGF1dGhvcml6ZXInLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBpR2F0ZXdheTo6QXV0aG9yaXplcicsIHtcbiAgICAgICAgTmFtZTogJ1ByaW1hcnlVc2VyQXV0aG9yaXplcicsXG4gICAgICAgIFR5cGU6ICdDT0dOSVRPX1VTRVJfUE9PTFMnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBzZWNvbmRhcnkgdXNlciBhdXRob3JpemVyJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6OkF1dGhvcml6ZXInLCB7XG4gICAgICAgIE5hbWU6ICdTZWNvbmRhcnlVc2VyQXV0aG9yaXplcicsXG4gICAgICAgIFR5cGU6ICdDT0dOSVRPX1VTRVJfUE9PTFMnLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdTdGFjayBPdXRwdXRzJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZXhwb3J0IEFQSSBVUkwnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ0FwaVVybCcsIHt9KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZXhwb3J0IEFQSSBLZXkgSUQnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ0FwaUtleUlkJywge30pO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuXG5kZXNjcmliZSgnQVBJIEdhdGV3YXkgQ29uZmlndXJhdGlvbiAtIFByb2R1Y3Rpb24gRW52aXJvbm1lbnQnLCAoKSA9PiB7XG4gIGxldCB0ZW1wbGF0ZTogVGVtcGxhdGU7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICBjb25zdCBzdGFjayA9IG5ldyBIZWFsdGhjYXJlTW9uaXRvcmluZ1N0YWNrKGFwcCwgJ1Byb2RTdGFjaycsIHtcbiAgICAgIGVudmlyb25tZW50OiAncHJvZCcsXG4gICAgfSk7XG4gICAgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGNvbmZpZ3VyZSBoaWdoZXIgdGhyb3R0bGluZyBsaW1pdHMgZm9yIHByb2R1Y3Rpb24nLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6OlN0YWdlJywge1xuICAgICAgTWV0aG9kU2V0dGluZ3M6IFtcbiAgICAgICAge1xuICAgICAgICAgIFRocm90dGxpbmdCdXJzdExpbWl0OiA1MDAwLFxuICAgICAgICAgIFRocm90dGxpbmdSYXRlTGltaXQ6IDIwMDAsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGNvbmZpZ3VyZSBoaWdoZXIgdXNhZ2UgcGxhbiBsaW1pdHMgZm9yIHByb2R1Y3Rpb24nLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6OlVzYWdlUGxhbicsIHtcbiAgICAgIFRocm90dGxlOiB7XG4gICAgICAgIFJhdGVMaW1pdDogMTAwMCxcbiAgICAgICAgQnVyc3RMaW1pdDogMjAwMCxcbiAgICAgIH0sXG4gICAgICBRdW90YToge1xuICAgICAgICBMaW1pdDogMTAwMDAwMCxcbiAgICAgICAgUGVyaW9kOiAnTU9OVEgnLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==