/**
 * API Gateway Lambda Integrations
 * Task 16.2: Wire all Lambda functions to API Gateway endpoints
 * 
 * This module creates Lambda functions and integrates them with API Gateway,
 * implementing request/response transformations, error handling, and proper
 * Lambda configuration (timeout, memory, environment variables).
 * 
 * Requirements: All (comprehensive API integration)
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export interface ApiLambdaIntegrationsProps {
  api: apigateway.RestApi;
  environment: 'dev' | 'staging' | 'prod';
  primaryAuthorizer: apigateway.CognitoUserPoolsAuthorizer;
  secondaryAuthorizer: apigateway.CognitoUserPoolsAuthorizer;
  primaryUserPool: cognito.UserPool;
  secondaryUserPool: cognito.UserPool;
  primaryUserPoolClientId: string;
  secondaryUserPoolClientId: string;
  
  // DynamoDB Tables
  usersTable: dynamodb.Table;
  healthRecordsTable: dynamodb.Table;
  medicationsTable: dynamodb.Table;
  appointmentsTable: dynamodb.Table;
  alertsTable: dynamodb.Table;
  careCircleTable: dynamodb.Table;
  devicesTable: dynamodb.Table;
  
  // Other resources
  reportsBucket: s3.Bucket;
  encryptionKey: kms.Key;
  alertTopic: sns.Topic;
  medicationReminderTopic: sns.Topic;
  appointmentReminderTopic: sns.Topic;
  
  // Timestream
  timestreamDatabaseName: string;
  vitalSignsTableName: string;
  deviceReadingsTableName: string;
}

export class ApiLambdaIntegrations extends Construct {
  constructor(scope: Construct, id: string, props: ApiLambdaIntegrationsProps) {
    super(scope, id);

    const {
      api,
      environment,
      primaryAuthorizer,
      secondaryAuthorizer,
      primaryUserPool,
      secondaryUserPool,
      primaryUserPoolClientId,
      secondaryUserPoolClientId,
      usersTable,
      healthRecordsTable,
      medicationsTable,
      appointmentsTable,
      alertsTable,
      careCircleTable,
      devicesTable,
      reportsBucket,
      encryptionKey,
      alertTopic,
      medicationReminderTopic,
      appointmentReminderTopic,
      timestreamDatabaseName,
      vitalSignsTableName,
      deviceReadingsTableName,
    } = props;

    // Common Lambda configuration
    const lambdaTimeout = cdk.Duration.seconds(30);
    const lambdaMemory = 512;
    const lambdaRuntime = lambda.Runtime.NODEJS_18_X;
    
    // Common environment variables for all Lambda functions
    const commonEnv = {
      ENVIRONMENT: environment,
      USERS_TABLE: usersTable.tableName,
      HEALTH_RECORDS_TABLE: healthRecordsTable.tableName,
      MEDICATIONS_TABLE: medicationsTable.tableName,
      APPOINTMENTS_TABLE: appointmentsTable.tableName,
      ALERTS_TABLE: alertsTable.tableName,
      CARE_CIRCLE_TABLE: careCircleTable.tableName,
      DEVICES_TABLE: devicesTable.tableName,
      REPORTS_BUCKET: reportsBucket.bucketName,
      ALERT_TOPIC_ARN: alertTopic.topicArn,
      MEDICATION_REMINDER_TOPIC_ARN: medicationReminderTopic.topicArn,
      APPOINTMENT_REMINDER_TOPIC_ARN: appointmentReminderTopic.topicArn,
      TIMESTREAM_DATABASE: timestreamDatabaseName,
      VITAL_SIGNS_TABLE: vitalSignsTableName,
      DEVICE_READINGS_TABLE: deviceReadingsTableName,
      PRIMARY_USER_POOL_ID: primaryUserPool.userPoolId,
      SECONDARY_USER_POOL_ID: secondaryUserPool.userPoolId,
      KMS_KEY_ID: encryptionKey.keyId,
    };

    // Helper function to create Lambda with standard configuration
    const createLambda = (
      name: string,
      handler: string,
      description: string,
      additionalEnv: Record<string, string> = {}
    ): lambda.Function => {
      const fn = new lambda.Function(this, name, {
        functionName: `healthcare-${name.toLowerCase()}-${environment}`,
        runtime: lambdaRuntime,
        handler,
        code: lambda.Code.fromAsset('infrastructure/lambda'),
        timeout: lambdaTimeout,
        memorySize: lambdaMemory,
        description,
        environment: { ...commonEnv, ...additionalEnv },
        logRetention: logs.RetentionDays.ONE_WEEK,
        tracing: lambda.Tracing.ACTIVE,
      });

      // Grant permissions to all tables
      usersTable.grantReadWriteData(fn);
      healthRecordsTable.grantReadWriteData(fn);
      medicationsTable.grantReadWriteData(fn);
      appointmentsTable.grantReadWriteData(fn);
      alertsTable.grantReadWriteData(fn);
      careCircleTable.grantReadWriteData(fn);
      devicesTable.grantReadWriteData(fn);

      // Grant S3 permissions
      reportsBucket.grantReadWrite(fn);

      // Grant SNS permissions
      alertTopic.grantPublish(fn);
      medicationReminderTopic.grantPublish(fn);
      appointmentReminderTopic.grantPublish(fn);

      // Grant KMS permissions
      encryptionKey.grantEncryptDecrypt(fn);

      // Grant Timestream permissions
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          'timestream:WriteRecords',
          'timestream:DescribeEndpoints',
          'timestream:Select',
        ],
        resources: ['*'],
      }));

      return fn;
    };

    // Helper function to add method with error responses
    const addMethodWithErrorHandling = (
      resource: apigateway.Resource,
      httpMethod: string,
      integration: apigateway.LambdaIntegration,
      authorizer?: apigateway.IAuthorizer,
      requestValidator?: apigateway.RequestValidator,
      requestModels?: { [contentType: string]: apigateway.IModel }
    ) => {
      // Use custom authorizer by default if no authorizer specified
      const effectiveAuthorizer = authorizer !== undefined ? authorizer : customAuthorizer;
      
      const method = resource.addMethod(httpMethod, integration, {
        authorizer: effectiveAuthorizer,
        authorizationType: effectiveAuthorizer ? apigateway.AuthorizationType.CUSTOM : apigateway.AuthorizationType.NONE,
        requestValidator,
        requestModels,
      });

      // Add standard error responses
      method.addMethodResponse({
        statusCode: '200',
        responseModels: {
          'application/json': apigateway.Model.EMPTY_MODEL,
        },
      });

      method.addMethodResponse({
        statusCode: '400',
        responseModels: {
          'application/json': apigateway.Model.ERROR_MODEL,
        },
      });

      method.addMethodResponse({
        statusCode: '401',
        responseModels: {
          'application/json': apigateway.Model.ERROR_MODEL,
        },
      });

      method.addMethodResponse({
        statusCode: '403',
        responseModels: {
          'application/json': apigateway.Model.ERROR_MODEL,
        },
      });

      method.addMethodResponse({
        statusCode: '500',
        responseModels: {
          'application/json': apigateway.Model.ERROR_MODEL,
        },
      });

      return method;
    };

    // Create request validators
    const bodyValidator = new apigateway.RequestValidator(this, 'BodyValidator', {
      restApi: api,
      requestValidatorName: 'body-validator',
      validateRequestBody: true,
      validateRequestParameters: false,
    });

    const paramsValidator = new apigateway.RequestValidator(this, 'ParamsValidator', {
      restApi: api,
      requestValidatorName: 'params-validator',
      validateRequestBody: false,
      validateRequestParameters: true,
    });

    const fullValidator = new apigateway.RequestValidator(this, 'FullValidator', {
      restApi: api,
      requestValidatorName: 'full-validator',
      validateRequestBody: true,
      validateRequestParameters: true,
    });

    // ========================================
    // CUSTOM LAMBDA AUTHORIZER
    // Task 16.3: Configure Lambda authorizer with JWT validation and RBAC
    // Requirements: 8.2, 8.4 - JWT token validation and role-based access control
    // ========================================
    
    const authorizerLambda = new lambda.Function(this, 'CustomAuthorizer', {
      functionName: `healthcare-custom-authorizer-${environment}`,
      runtime: lambdaRuntime,
      handler: 'auth/authorizer.handler',
      code: lambda.Code.fromAsset('infrastructure/lambda'),
      timeout: cdk.Duration.seconds(10), // Shorter timeout for authorizer
      memorySize: 256, // Less memory needed for authorizer
      description: 'Custom Lambda authorizer with JWT validation and RBAC',
      environment: {
        PRIMARY_USER_POOL_ID: primaryUserPool.userPoolId,
        SECONDARY_USER_POOL_ID: secondaryUserPool.userPoolId,
        PRIMARY_CLIENT_ID: primaryUserPoolClientId,
        SECONDARY_CLIENT_ID: secondaryUserPoolClientId,
        USERS_TABLE: usersTable.tableName,
        CARE_CIRCLE_TABLE: careCircleTable.tableName,
        AUDIT_LOG_GROUP: `/healthcare-monitoring/audit-${environment}`,
        AUDIT_LOG_STREAM: 'authorizer-events',
        ENVIRONMENT: environment,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant permissions to authorizer Lambda
    usersTable.grantReadData(authorizerLambda);
    careCircleTable.grantReadData(authorizerLambda);
    encryptionKey.grantDecrypt(authorizerLambda);

    // Grant CloudWatch Logs permissions for audit logging
    authorizerLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [`arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/healthcare-monitoring/audit-${environment}:*`],
    }));

    // Create custom Lambda authorizer for API Gateway
    const customAuthorizer = new apigateway.TokenAuthorizer(this, 'LambdaAuthorizer', {
      handler: authorizerLambda,
      identitySource: 'method.request.header.Authorization',
      authorizerName: 'CustomJWTAuthorizer',
      resultsCacheTtl: cdk.Duration.minutes(5), // Cache authorization results for 5 minutes
      validationRegex: '^Bearer [-0-9a-zA-Z\\._]*$', // Validate Bearer token format
    });

    // Create CloudWatch Log Group for audit logs
    const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
      logGroupName: `/healthcare-monitoring/audit-${environment}`,
      retention: logs.RetentionDays.TEN_YEARS, // 10 years for HIPAA compliance
      encryptionKey,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // Create log stream for authorizer events
    new logs.LogStream(this, 'AuthorizerLogStream', {
      logGroup: auditLogGroup,
      logStreamName: 'authorizer-events',
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // Create log stream for API request events
    new logs.LogStream(this, 'ApiRequestLogStream', {
      logGroup: auditLogGroup,
      logStreamName: 'api-requests',
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // ========================================
    // HEALTH MONITORING API ENDPOINTS
    // ========================================
    const healthResource = api.root.addResource('health');

    // POST /health/vitals - Record vital signs
    const recordVitalsLambda = createLambda(
      'RecordVitalSigns',
      'api/record-vital-signs.handler',
      'Record vital signs for a user'
    );
    const vitalsResource = healthResource.addResource('vitals');
    addMethodWithErrorHandling(
      vitalsResource,
      'POST',
      new apigateway.LambdaIntegration(recordVitalsLambda),
      primaryAuthorizer,
      bodyValidator
    );

    // GET /health/trends/{userId} - Get health trends
    const analyzeTrendsLambda = createLambda(
      'AnalyzeHealthTrends',
      'api/analyze-health-trends.handler',
      'Analyze health trends for a user'
    );
    const trendsResource = healthResource.addResource('trends');
    const trendsUserResource = trendsResource.addResource('{userId}');
    addMethodWithErrorHandling(
      trendsUserResource,
      'GET',
      new apigateway.LambdaIntegration(analyzeTrendsLambda),
      secondaryAuthorizer
    );

    // GET /health/data/{userId} - Get health data
    const getHealthDataLambda = createLambda(
      'GetHealthData',
      'api/get-health-data.handler',
      'Get health data for a user'
    );
    const dataResource = healthResource.addResource('data');
    const dataUserResource = dataResource.addResource('{userId}');
    addMethodWithErrorHandling(
      dataUserResource,
      'GET',
      new apigateway.LambdaIntegration(getHealthDataLambda),
      secondaryAuthorizer
    );

    // POST /health/report - Generate health report
    const generateReportLambda = createLambda(
      'GenerateHealthReport',
      'api/generate-health-report.handler',
      'Generate health report for a user'
    );
    const reportResource = healthResource.addResource('report');
    addMethodWithErrorHandling(
      reportResource,
      'POST',
      new apigateway.LambdaIntegration(generateReportLambda),
      secondaryAuthorizer,
      bodyValidator
    );

    // ========================================
    // ALERT MANAGEMENT API ENDPOINTS
    // ========================================
    const alertsResource = api.root.addResource('alerts');

    // POST /alerts - Create alert
    const createAlertLambda = createLambda(
      'CreateAlert',
      'api/create-alert.handler',
      'Create a new health alert'
    );
    addMethodWithErrorHandling(
      alertsResource,
      'POST',
      new apigateway.LambdaIntegration(createAlertLambda),
      primaryAuthorizer,
      bodyValidator
    );

    // GET /alerts - Get alerts
    const getAlertsLambda = createLambda(
      'GetAlerts',
      'api/get-alerts.handler',
      'Get alerts for a user'
    );
    addMethodWithErrorHandling(
      alertsResource,
      'GET',
      new apigateway.LambdaIntegration(getAlertsLambda),
      secondaryAuthorizer
    );

    // POST /alerts/{alertId}/acknowledge - Acknowledge alert
    const acknowledgeAlertLambda = createLambda(
      'AcknowledgeAlert',
      'api/acknowledge-alert.handler',
      'Acknowledge an alert'
    );
    const alertIdResource = alertsResource.addResource('{alertId}');
    const acknowledgeResource = alertIdResource.addResource('acknowledge');
    addMethodWithErrorHandling(
      acknowledgeResource,
      'POST',
      new apigateway.LambdaIntegration(acknowledgeAlertLambda),
      secondaryAuthorizer
    );

    // POST /alerts/{alertId}/escalate - Escalate alert
    const escalateAlertLambda = createLambda(
      'EscalateAlert',
      'api/escalate-alert.handler',
      'Escalate an alert'
    );
    const escalateResource = alertIdResource.addResource('escalate');
    addMethodWithErrorHandling(
      escalateResource,
      'POST',
      new apigateway.LambdaIntegration(escalateAlertLambda),
      secondaryAuthorizer
    );

    // POST /alerts/emergency - Trigger emergency
    const triggerEmergencyLambda = createLambda(
      'TriggerEmergency',
      'api/trigger-emergency.handler',
      'Trigger emergency alert'
    );
    const emergencyResource = alertsResource.addResource('emergency');
    addMethodWithErrorHandling(
      emergencyResource,
      'POST',
      new apigateway.LambdaIntegration(triggerEmergencyLambda),
      primaryAuthorizer,
      bodyValidator
    );

    // GET /alerts/preferences - Get alert preferences
    const getAlertPreferencesLambda = createLambda(
      'GetAlertPreferences',
      'api/get-alert-preferences.handler',
      'Get alert preferences for a user'
    );
    const preferencesResource = alertsResource.addResource('preferences');
    addMethodWithErrorHandling(
      preferencesResource,
      'GET',
      new apigateway.LambdaIntegration(getAlertPreferencesLambda),
      secondaryAuthorizer
    );

    // PUT /alerts/preferences - Update alert preferences
    const updateAlertPreferencesLambda = createLambda(
      'UpdateAlertPreferences',
      'api/update-alert-preferences.handler',
      'Update alert preferences for a user'
    );
    addMethodWithErrorHandling(
      preferencesResource,
      'PUT',
      new apigateway.LambdaIntegration(updateAlertPreferencesLambda),
      secondaryAuthorizer,
      bodyValidator
    );

    // ========================================
    // MEDICATION MANAGEMENT API ENDPOINTS
    // ========================================
    const medicationsResource = api.root.addResource('medications');

    // POST /medications - Schedule medication
    const scheduleMedicationLambda = createLambda(
      'ScheduleMedication',
      'api/schedule-medication.handler',
      'Schedule a new medication'
    );
    addMethodWithErrorHandling(
      medicationsResource,
      'POST',
      new apigateway.LambdaIntegration(scheduleMedicationLambda),
      primaryAuthorizer,
      bodyValidator
    );

    // GET /medications - Get medications
    const getMedicationsLambda = createLambda(
      'GetMedications',
      'api/get-medications.handler',
      'Get medications for a user'
    );
    addMethodWithErrorHandling(
      medicationsResource,
      'GET',
      new apigateway.LambdaIntegration(getMedicationsLambda),
      primaryAuthorizer
    );

    // POST /medications/{medicationId}/confirm - Confirm medication taken
    const confirmMedicationLambda = createLambda(
      'ConfirmMedication',
      'api/confirm-medication.handler',
      'Confirm medication taken'
    );
    const medicationIdResource = medicationsResource.addResource('{medicationId}');
    const confirmResource = medicationIdResource.addResource('confirm');
    addMethodWithErrorHandling(
      confirmResource,
      'POST',
      new apigateway.LambdaIntegration(confirmMedicationLambda),
      primaryAuthorizer
    );

    // GET /medications/adherence - Get medication adherence
    const getMedicationAdherenceLambda = createLambda(
      'GetMedicationAdherence',
      'api/get-medication-adherence.handler',
      'Get medication adherence for a user'
    );
    const adherenceResource = medicationsResource.addResource('adherence');
    addMethodWithErrorHandling(
      adherenceResource,
      'GET',
      new apigateway.LambdaIntegration(getMedicationAdherenceLambda),
      secondaryAuthorizer
    );

    // GET /medications/care-circle-summary - Get care circle medication summary
    const getCareCircleMedicationSummaryLambda = createLambda(
      'GetCareCircleMedicationSummary',
      'api/get-care-circle-medication-summary.handler',
      'Get medication summary for care circle'
    );
    const careCircleSummaryResource = medicationsResource.addResource('care-circle-summary');
    addMethodWithErrorHandling(
      careCircleSummaryResource,
      'GET',
      new apigateway.LambdaIntegration(getCareCircleMedicationSummaryLambda),
      secondaryAuthorizer
    );

    // ========================================
    // APPOINTMENT MANAGEMENT API ENDPOINTS
    // ========================================
    const appointmentsResource = api.root.addResource('appointments');

    // POST /appointments - Create appointment
    const createAppointmentLambda = createLambda(
      'CreateAppointment',
      'api/create-appointment.handler',
      'Create a new appointment'
    );
    addMethodWithErrorHandling(
      appointmentsResource,
      'POST',
      new apigateway.LambdaIntegration(createAppointmentLambda),
      primaryAuthorizer,
      bodyValidator
    );

    // GET /appointments - Get appointments
    const getAppointmentsLambda = createLambda(
      'GetAppointments',
      'api/get-appointments.handler',
      'Get appointments for a user'
    );
    addMethodWithErrorHandling(
      appointmentsResource,
      'GET',
      new apigateway.LambdaIntegration(getAppointmentsLambda),
      primaryAuthorizer
    );

    // PUT /appointments/{appointmentId} - Update appointment
    const updateAppointmentLambda = createLambda(
      'UpdateAppointment',
      'api/update-appointment.handler',
      'Update an appointment'
    );
    const appointmentIdResource = appointmentsResource.addResource('{appointmentId}');
    addMethodWithErrorHandling(
      appointmentIdResource,
      'PUT',
      new apigateway.LambdaIntegration(updateAppointmentLambda),
      primaryAuthorizer,
      bodyValidator
    );

    // DELETE /appointments/{appointmentId} - Delete appointment
    const deleteAppointmentLambda = createLambda(
      'DeleteAppointment',
      'api/delete-appointment.handler',
      'Delete an appointment'
    );
    addMethodWithErrorHandling(
      appointmentIdResource,
      'DELETE',
      new apigateway.LambdaIntegration(deleteAppointmentLambda),
      primaryAuthorizer
    );

    // GET /appointments/{appointmentId}/ical - Get appointment iCal
    const getAppointmentIcalLambda = createLambda(
      'GetAppointmentIcal',
      'api/get-appointment-ical.handler',
      'Get appointment in iCal format'
    );
    const icalResource = appointmentIdResource.addResource('ical');
    addMethodWithErrorHandling(
      icalResource,
      'GET',
      new apigateway.LambdaIntegration(getAppointmentIcalLambda),
      primaryAuthorizer
    );

    // ========================================
    // CARE CIRCLE MANAGEMENT API ENDPOINTS
    // ========================================
    const careCircleResource = api.root.addResource('care-circle');

    // GET /care-circle/{userId} - Get care circle
    const getCareCircleLambda = createLambda(
      'GetCareCircle',
      'api/get-care-circle.handler',
      'Get care circle for a user'
    );
    const careCircleUserResource = careCircleResource.addResource('{userId}');
    addMethodWithErrorHandling(
      careCircleUserResource,
      'GET',
      new apigateway.LambdaIntegration(getCareCircleLambda),
      secondaryAuthorizer
    );

    // POST /care-circle/invite - Invite care circle member
    const inviteMemberLambda = createLambda(
      'InviteCareCircleMember',
      'api/invite-care-circle-member.handler',
      'Invite a care circle member'
    );
    const inviteResource = careCircleResource.addResource('invite');
    addMethodWithErrorHandling(
      inviteResource,
      'POST',
      new apigateway.LambdaIntegration(inviteMemberLambda),
      primaryAuthorizer,
      bodyValidator
    );

    // POST /care-circle/accept - Accept care circle invitation
    const acceptInvitationLambda = createLambda(
      'AcceptCareCircleInvitation',
      'api/accept-care-circle-invitation.handler',
      'Accept care circle invitation'
    );
    const acceptResource = careCircleResource.addResource('accept');
    addMethodWithErrorHandling(
      acceptResource,
      'POST',
      new apigateway.LambdaIntegration(acceptInvitationLambda),
      secondaryAuthorizer,
      bodyValidator
    );

    // POST /care-circle/reject - Reject care circle invitation
    const rejectInvitationLambda = createLambda(
      'RejectCareCircleInvitation',
      'api/reject-care-circle-invitation.handler',
      'Reject care circle invitation'
    );
    const rejectResource = careCircleResource.addResource('reject');
    addMethodWithErrorHandling(
      rejectResource,
      'POST',
      new apigateway.LambdaIntegration(rejectInvitationLambda),
      secondaryAuthorizer,
      bodyValidator
    );

    // DELETE /care-circle/{primaryUserId}/member/{secondaryUserId} - Remove care circle member
    const removeMemberLambda = createLambda(
      'RemoveCareCircleMember',
      'api/remove-care-circle-member.handler',
      'Remove a care circle member'
    );
    const primaryUserResource = careCircleResource.addResource('{primaryUserId}');
    const memberResource = primaryUserResource.addResource('member');
    const secondaryUserResource = memberResource.addResource('{secondaryUserId}');
    addMethodWithErrorHandling(
      secondaryUserResource,
      'DELETE',
      new apigateway.LambdaIntegration(removeMemberLambda),
      primaryAuthorizer
    );

    // GET /care-circle/dashboard - Get care circle dashboard
    const getCareCircleDashboardLambda = createLambda(
      'GetCareCircleDashboard',
      'api/get-care-circle-dashboard.handler',
      'Get care circle dashboard data'
    );
    const dashboardResource = careCircleResource.addResource('dashboard');
    addMethodWithErrorHandling(
      dashboardResource,
      'GET',
      new apigateway.LambdaIntegration(getCareCircleDashboardLambda),
      secondaryAuthorizer
    );

    // POST /care-circle/message - Send care circle message
    const sendMessageLambda = createLambda(
      'SendCareCircleMessage',
      'api/send-care-circle-message.handler',
      'Send a message to care circle'
    );
    const messageResource = careCircleResource.addResource('message');
    addMethodWithErrorHandling(
      messageResource,
      'POST',
      new apigateway.LambdaIntegration(sendMessageLambda),
      secondaryAuthorizer,
      bodyValidator
    );

    // GET /care-circle/messages - Get care circle messages
    const getMessagesLambda = createLambda(
      'GetCareCircleMessages',
      'api/get-care-circle-messages.handler',
      'Get care circle messages'
    );
    const messagesResource = careCircleResource.addResource('messages');
    addMethodWithErrorHandling(
      messagesResource,
      'GET',
      new apigateway.LambdaIntegration(getMessagesLambda),
      primaryAuthorizer
    );

    // POST /care-circle/messages/{messageId}/read - Mark message as read
    const markMessageReadLambda = createLambda(
      'MarkMessageRead',
      'api/mark-message-read.handler',
      'Mark a message as read'
    );
    const messageIdResource = messagesResource.addResource('{messageId}');
    const readResource = messageIdResource.addResource('read');
    addMethodWithErrorHandling(
      readResource,
      'POST',
      new apigateway.LambdaIntegration(markMessageReadLambda),
      primaryAuthorizer
    );

    // PUT /care-circle/permissions - Update care circle permissions
    const updatePermissionsLambda = createLambda(
      'UpdateCareCirclePermissions',
      'api/update-care-circle-permissions.handler',
      'Update care circle permissions'
    );
    const permissionsResource = careCircleResource.addResource('permissions');
    addMethodWithErrorHandling(
      permissionsResource,
      'PUT',
      new apigateway.LambdaIntegration(updatePermissionsLambda),
      primaryAuthorizer,
      bodyValidator
    );

    // ========================================
    // DEVICE INTEGRATION API ENDPOINTS
    // ========================================
    const devicesResource = api.root.addResource('devices');

    // POST /devices - Register device
    const registerDeviceLambda = createLambda(
      'RegisterDevice',
      'devices/register-device.handler',
      'Register a new health device',
      {
        IOT_POLICY_NAME: `healthcare-device-policy-${environment}`,
      }
    );
    addMethodWithErrorHandling(
      devicesResource,
      'POST',
      new apigateway.LambdaIntegration(registerDeviceLambda),
      primaryAuthorizer,
      bodyValidator
    );

    // Grant IoT permissions to register device Lambda
    registerDeviceLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'iot:CreateThing',
        'iot:CreateKeysAndCertificate',
        'iot:AttachThingPrincipal',
        'iot:AttachPolicy',
        'iot:DescribeEndpoint',
      ],
      resources: ['*'],
    }));

    // GET /devices - Get devices
    const getDevicesLambda = createLambda(
      'GetDevices',
      'devices/get-devices.handler',
      'Get devices for a user'
    );
    addMethodWithErrorHandling(
      devicesResource,
      'GET',
      new apigateway.LambdaIntegration(getDevicesLambda),
      primaryAuthorizer
    );

    // PUT /devices/{deviceId} - Update device
    const updateDeviceLambda = createLambda(
      'UpdateDevice',
      'devices/update-device.handler',
      'Update device information'
    );
    const deviceIdResource = devicesResource.addResource('{deviceId}');
    addMethodWithErrorHandling(
      deviceIdResource,
      'PUT',
      new apigateway.LambdaIntegration(updateDeviceLambda),
      primaryAuthorizer,
      bodyValidator
    );

    // DELETE /devices/{deviceId} - Delete device
    const deleteDeviceLambda = createLambda(
      'DeleteDevice',
      'devices/delete-device.handler',
      'Delete a device'
    );
    addMethodWithErrorHandling(
      deviceIdResource,
      'DELETE',
      new apigateway.LambdaIntegration(deleteDeviceLambda),
      primaryAuthorizer
    );

    // Grant IoT permissions to delete device Lambda
    deleteDeviceLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'iot:DeleteThing',
        'iot:DetachThingPrincipal',
        'iot:UpdateCertificate',
        'iot:DeleteCertificate',
        'iot:DetachPolicy',
      ],
      resources: ['*'],
    }));

    // ========================================
    // AUTHENTICATION API ENDPOINTS
    // ========================================
    const authResource = api.root.addResource('auth');

    // POST /auth/register - Register user
    const registerLambda = createLambda(
      'Register',
      'auth/register.handler',
      'Register a new user',
      {
        PRIMARY_USER_POOL_CLIENT_ID: primaryUserPoolClientId,
        SECONDARY_USER_POOL_CLIENT_ID: secondaryUserPoolClientId,
      }
    );
    const registerResource = authResource.addResource('register');
    addMethodWithErrorHandling(
      registerResource,
      'POST',
      new apigateway.LambdaIntegration(registerLambda),
      undefined,
      bodyValidator
    );

    // Grant Cognito permissions
    registerLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:SignUp',
        'cognito-idp:AdminAddUserToGroup',
      ],
      resources: [primaryUserPool.userPoolArn, secondaryUserPool.userPoolArn],
    }));

    // POST /auth/login - Login user
    const loginLambda = createLambda(
      'Login',
      'auth/login.handler',
      'Login user',
      {
        PRIMARY_USER_POOL_CLIENT_ID: primaryUserPoolClientId,
        SECONDARY_USER_POOL_CLIENT_ID: secondaryUserPoolClientId,
      }
    );
    const loginResource = authResource.addResource('login');
    addMethodWithErrorHandling(
      loginResource,
      'POST',
      new apigateway.LambdaIntegration(loginLambda),
      undefined,
      bodyValidator
    );

    loginLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:InitiateAuth',
        'cognito-idp:RespondToAuthChallenge',
      ],
      resources: [primaryUserPool.userPoolArn, secondaryUserPool.userPoolArn],
    }));

    // POST /auth/refresh - Refresh token
    const refreshTokenLambda = createLambda(
      'RefreshToken',
      'auth/refresh-token.handler',
      'Refresh authentication token',
      {
        PRIMARY_USER_POOL_CLIENT_ID: primaryUserPoolClientId,
        SECONDARY_USER_POOL_CLIENT_ID: secondaryUserPoolClientId,
      }
    );
    const refreshResource = authResource.addResource('refresh');
    addMethodWithErrorHandling(
      refreshResource,
      'POST',
      new apigateway.LambdaIntegration(refreshTokenLambda),
      undefined,
      bodyValidator
    );

    refreshTokenLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:InitiateAuth'],
      resources: [primaryUserPool.userPoolArn, secondaryUserPool.userPoolArn],
    }));

    // POST /auth/verify-email - Verify email
    const verifyEmailLambda = createLambda(
      'VerifyEmail',
      'auth/verify-email.handler',
      'Verify user email',
      {
        PRIMARY_USER_POOL_CLIENT_ID: primaryUserPoolClientId,
        SECONDARY_USER_POOL_CLIENT_ID: secondaryUserPoolClientId,
      }
    );
    const verifyResource = authResource.addResource('verify-email');
    addMethodWithErrorHandling(
      verifyResource,
      'POST',
      new apigateway.LambdaIntegration(verifyEmailLambda),
      undefined,
      bodyValidator
    );

    verifyEmailLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:ConfirmSignUp'],
      resources: [primaryUserPool.userPoolArn, secondaryUserPool.userPoolArn],
    }));

    // ========================================
    // PERMISSIONS API ENDPOINTS
    // ========================================
    const permissionsApiResource = api.root.addResource('permissions');

    // GET /permissions/{userId} - Get permissions
    const getPermissionsLambda = createLambda(
      'GetPermissions',
      'api/get-permissions.handler',
      'Get user permissions'
    );
    const permissionsUserResource = permissionsApiResource.addResource('{userId}');
    addMethodWithErrorHandling(
      permissionsUserResource,
      'GET',
      new apigateway.LambdaIntegration(getPermissionsLambda),
      secondaryAuthorizer
    );

    // PUT /permissions/{userId} - Update permissions
    const updatePermissionsApiLambda = createLambda(
      'UpdatePermissionsApi',
      'api/update-permissions.handler',
      'Update user permissions'
    );
    addMethodWithErrorHandling(
      permissionsUserResource,
      'PUT',
      new apigateway.LambdaIntegration(updatePermissionsApiLambda),
      primaryAuthorizer,
      bodyValidator
    );
  }
}
