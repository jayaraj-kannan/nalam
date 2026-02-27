import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as events from 'aws-cdk-lib/aws-events';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import { DeviceIntegrationConstruct } from './device-integration-construct';
import { ApiLambdaIntegrations } from './api-lambda-integrations';
import { CloudWatchMonitoringConstruct } from './cloudwatch-monitoring-construct';

export interface HealthcareMonitoringStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
}

export class HealthcareMonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HealthcareMonitoringStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // KMS Key for encryption (HIPAA compliance - Requirement 8.1)
    const encryptionKey = new kms.Key(this, 'EncryptionKey', {
      description: `Healthcare Monitoring App encryption key - ${environment}`,
      enableKeyRotation: true,
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // CloudTrail for audit logging (HIPAA compliance - Requirement 8.4)
    const trailBucket = new s3.Bucket(this, 'AuditLogBucket', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
          expiration: cdk.Duration.days(2555), // 7 years for HIPAA
        },
      ],
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    const trail = new cloudtrail.Trail(this, 'AuditTrail', {
      bucket: trailBucket,
      enableFileValidation: true,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      sendToCloudWatchLogs: true,
      cloudWatchLogGroup: new logs.LogGroup(this, 'AuditLogGroup', {
        retention: logs.RetentionDays.TEN_YEARS,
        encryptionKey,
      }),
    });

    // Cognito User Pools (Requirement 8.2)
    const primaryUserPool = new cognito.UserPool(this, 'PrimaryUserPool', {
      userPoolName: `healthcare-primary-users-${environment}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    const secondaryUserPool = new cognito.UserPool(this, 'SecondaryUserPool', {
      userPoolName: `healthcare-secondary-users-${environment}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // User Pool Clients
    const primaryUserPoolClient = primaryUserPool.addClient('PrimaryUserPoolClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
    });

    const secondaryUserPoolClient = secondaryUserPool.addClient('SecondaryUserPoolClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
    });

    // DynamoDB Tables (Requirements 1.1, 8.1, 8.4)
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `healthcare-users-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    const healthRecordsTable = new dynamodb.Table(this, 'HealthRecordsTable', {
      tableName: `healthcare-records-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    healthRecordsTable.addGlobalSecondaryIndex({
      indexName: 'type-timestamp-index',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    const medicationsTable = new dynamodb.Table(this, 'MedicationsTable', {
      tableName: `healthcare-medications-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'medicationId', type: dynamodb.AttributeType.STRING },
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    const appointmentsTable = new dynamodb.Table(this, 'AppointmentsTable', {
      tableName: `healthcare-appointments-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'appointmentId', type: dynamodb.AttributeType.STRING },
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    appointmentsTable.addGlobalSecondaryIndex({
      indexName: 'scheduledTime-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'scheduledTime', type: dynamodb.AttributeType.STRING },
    });

    const alertsTable = new dynamodb.Table(this, 'AlertsTable', {
      tableName: `healthcare-alerts-${environment}`,
      partitionKey: { name: 'alertId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    alertsTable.addGlobalSecondaryIndex({
      indexName: 'userId-timestamp-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    alertsTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    const careCircleTable = new dynamodb.Table(this, 'CareCircleTable', {
      tableName: `healthcare-care-circle-${environment}`,
      partitionKey: { name: 'primaryUserId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'secondaryUserId', type: dynamodb.AttributeType.STRING },
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    const devicesTable = new dynamodb.Table(this, 'DevicesTable', {
      tableName: `healthcare-devices-${environment}`,
      partitionKey: { name: 'deviceId', type: dynamodb.AttributeType.STRING },
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    devicesTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    // S3 Bucket for health reports and documents (Requirement 10.3)
    const reportsBucket = new s3.Bucket(this, 'ReportsBucket', {
      bucketName: `healthcare-reports-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // SNS Topics for notifications (Requirement 9.1)
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `healthcare-alerts-${environment}`,
      displayName: 'Healthcare Monitoring Alerts',
      masterKey: encryptionKey,
    });

    const medicationReminderTopic = new sns.Topic(this, 'MedicationReminderTopic', {
      topicName: `healthcare-medication-reminders-${environment}`,
      displayName: 'Medication Reminders',
      masterKey: encryptionKey,
    });

    const appointmentReminderTopic = new sns.Topic(this, 'AppointmentReminderTopic', {
      topicName: `healthcare-appointment-reminders-${environment}`,
      displayName: 'Appointment Reminders',
      masterKey: encryptionKey,
    });

    // EventBridge for event-driven architecture
    const eventBus = new events.EventBus(this, 'EventBus', {
      eventBusName: `healthcare-events-${environment}`,
    });

    // Timestream Database for time-series health data (Requirements 1.1, 1.2, 7.1)
    const timestreamDatabase = new timestream.CfnDatabase(this, 'TimestreamDatabase', {
      databaseName: `healthcare-timeseries-${environment}`,
      kmsKeyId: encryptionKey.keyId,
    });

    // Timestream Table for Vital Signs
    // Stores heart rate, blood pressure, temperature, oxygen saturation, weight
    const vitalSignsTable = new timestream.CfnTable(this, 'VitalSignsTable', {
      databaseName: timestreamDatabase.databaseName!,
      tableName: 'vital-signs',
      retentionProperties: {
        // Memory store: 24 hours for recent data (fast queries)
        memoryStoreRetentionPeriodInHours: '24',
        // Magnetic store: 7 years for HIPAA compliance
        magneticStoreRetentionPeriodInDays: '2555',
      },
      magneticStoreWriteProperties: {
        enableMagneticStoreWrites: true,
      },
    });
    vitalSignsTable.addDependency(timestreamDatabase);

    // Timestream Table for Device Readings
    // Stores raw data from health devices and wearables
    const deviceReadingsTable = new timestream.CfnTable(this, 'DeviceReadingsTable', {
      databaseName: timestreamDatabase.databaseName!,
      tableName: 'device-readings',
      retentionProperties: {
        // Memory store: 48 hours for device data (more frequent queries)
        memoryStoreRetentionPeriodInHours: '48',
        // Magnetic store: 7 years for HIPAA compliance
        magneticStoreRetentionPeriodInDays: '2555',
      },
      magneticStoreWriteProperties: {
        enableMagneticStoreWrites: true,
      },
    });
    deviceReadingsTable.addDependency(timestreamDatabase);

    // Timestream Table for Sensor Data
    // Stores continuous monitoring data from IoT sensors
    const sensorDataTable = new timestream.CfnTable(this, 'SensorDataTable', {
      databaseName: timestreamDatabase.databaseName!,
      tableName: 'sensor-data',
      retentionProperties: {
        // Memory store: 12 hours for high-frequency sensor data
        memoryStoreRetentionPeriodInHours: '12',
        // Magnetic store: 1 year for sensor data (less critical for long-term)
        magneticStoreRetentionPeriodInDays: '365',
      },
      magneticStoreWriteProperties: {
        enableMagneticStoreWrites: true,
      },
    });
    sensorDataTable.addDependency(timestreamDatabase);

    // API Gateway (Requirement 8.2)
    const api = new apigateway.RestApi(this, 'HealthcareApi', {
      restApiName: `healthcare-monitoring-api-${environment}`,
      description: 'Healthcare Monitoring App API',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
        throttlingBurstLimit: environment === 'prod' ? 5000 : 1000,
        throttlingRateLimit: environment === 'prod' ? 2000 : 500,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
        allowCredentials: true,
      },
      cloudWatchRole: true,
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
    });

    // API Key for external integrations (e.g., health devices, third-party services)
    const apiKey = api.addApiKey('ExternalIntegrationApiKey', {
      apiKeyName: `healthcare-external-api-key-${environment}`,
      description: 'API Key for external health device integrations',
    });

    // Usage Plan with throttling and quota limits
    const usagePlan = api.addUsagePlan('UsagePlan', {
      name: `healthcare-usage-plan-${environment}`,
      description: 'Usage plan for healthcare monitoring API',
      throttle: {
        rateLimit: environment === 'prod' ? 1000 : 200,
        burstLimit: environment === 'prod' ? 2000 : 500,
      },
      quota: {
        limit: environment === 'prod' ? 1000000 : 100000,
        period: apigateway.Period.MONTH,
      },
    });

    // Associate API key with usage plan
    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    // Request/Response Models for validation
    // Vital Signs Model
    const vitalSignsModel = api.addModel('VitalSignsModel', {
      contentType: 'application/json',
      modelName: 'VitalSignsModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'VitalSigns',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          heartRate: { type: apigateway.JsonSchemaType.NUMBER, minimum: 30, maximum: 250 },
          bloodPressure: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              systolic: { type: apigateway.JsonSchemaType.NUMBER, minimum: 70, maximum: 250 },
              diastolic: { type: apigateway.JsonSchemaType.NUMBER, minimum: 40, maximum: 150 },
            },
          },
          temperature: { type: apigateway.JsonSchemaType.NUMBER, minimum: 35, maximum: 42 },
          oxygenSaturation: { type: apigateway.JsonSchemaType.NUMBER, minimum: 70, maximum: 100 },
          weight: { type: apigateway.JsonSchemaType.NUMBER, minimum: 20, maximum: 300 },
          timestamp: { type: apigateway.JsonSchemaType.STRING, format: 'date-time' },
          source: { 
            type: apigateway.JsonSchemaType.STRING, 
            enum: ['manual', 'device', 'wearable'] 
          },
        },
      },
    });

    // Emergency Alert Model
    const emergencyAlertModel = api.addModel('EmergencyAlertModel', {
      contentType: 'application/json',
      modelName: 'EmergencyAlertModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'EmergencyAlert',
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['severity'],
        properties: {
          location: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              latitude: { type: apigateway.JsonSchemaType.NUMBER },
              longitude: { type: apigateway.JsonSchemaType.NUMBER },
            },
          },
          symptoms: {
            type: apigateway.JsonSchemaType.ARRAY,
            items: { type: apigateway.JsonSchemaType.STRING },
          },
          severity: {
            type: apigateway.JsonSchemaType.STRING,
            enum: ['low', 'medium', 'high', 'critical'],
          },
        },
      },
    });

    // Medication Model
    const medicationModel = api.addModel('MedicationModel', {
      contentType: 'application/json',
      modelName: 'MedicationModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'Medication',
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['name', 'dosage', 'frequency'],
        properties: {
          name: { type: apigateway.JsonSchemaType.STRING, minLength: 1, maxLength: 200 },
          dosage: { type: apigateway.JsonSchemaType.STRING, minLength: 1, maxLength: 100 },
          frequency: { type: apigateway.JsonSchemaType.STRING, minLength: 1, maxLength: 100 },
          scheduledTime: { type: apigateway.JsonSchemaType.STRING, format: 'date-time' },
          instructions: { type: apigateway.JsonSchemaType.STRING, maxLength: 500 },
        },
      },
    });

    // Appointment Model
    const appointmentModel = api.addModel('AppointmentModel', {
      contentType: 'application/json',
      modelName: 'AppointmentModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'Appointment',
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['scheduledTime', 'type'],
        properties: {
          scheduledTime: { type: apigateway.JsonSchemaType.STRING, format: 'date-time' },
          type: { type: apigateway.JsonSchemaType.STRING, minLength: 1, maxLength: 100 },
          provider: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              name: { type: apigateway.JsonSchemaType.STRING },
              specialty: { type: apigateway.JsonSchemaType.STRING },
              phone: { type: apigateway.JsonSchemaType.STRING },
            },
          },
          notes: { type: apigateway.JsonSchemaType.STRING, maxLength: 1000 },
        },
      },
    });

    // Error Response Model
    const errorResponseModel = api.addModel('ErrorResponseModel', {
      contentType: 'application/json',
      modelName: 'ErrorResponseModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'ErrorResponse',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          message: { type: apigateway.JsonSchemaType.STRING },
          code: { type: apigateway.JsonSchemaType.STRING },
          timestamp: { type: apigateway.JsonSchemaType.STRING },
        },
      },
    });

    // Success Response Model
    const successResponseModel = api.addModel('SuccessResponseModel', {
      contentType: 'application/json',
      modelName: 'SuccessResponseModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'SuccessResponse',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          message: { type: apigateway.JsonSchemaType.STRING },
          data: { type: apigateway.JsonSchemaType.OBJECT },
          timestamp: { type: apigateway.JsonSchemaType.STRING },
        },
      },
    });

    // Cognito Authorizers
    const primaryAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'PrimaryAuthorizer', {
      cognitoUserPools: [primaryUserPool],
      authorizerName: 'PrimaryUserAuthorizer',
    });

    const secondaryAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'SecondaryAuthorizer', {
      cognitoUserPools: [secondaryUserPool],
      authorizerName: 'SecondaryUserAuthorizer',
    });

    // Outputs
    new cdk.CfnOutput(this, 'PrimaryUserPoolId', {
      value: primaryUserPool.userPoolId,
      description: 'Primary User Pool ID',
    });

    new cdk.CfnOutput(this, 'PrimaryUserPoolClientId', {
      value: primaryUserPoolClient.userPoolClientId,
      description: 'Primary User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'SecondaryUserPoolId', {
      value: secondaryUserPool.userPoolId,
      description: 'Secondary User Pool ID',
    });

    new cdk.CfnOutput(this, 'SecondaryUserPoolClientId', {
      value: secondaryUserPoolClient.userPoolClientId,
      description: 'Secondary User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'API Key ID for external integrations',
    });

    new cdk.CfnOutput(this, 'ReportsBucketName', {
      value: reportsBucket.bucketName,
      description: 'S3 Bucket for Health Reports',
    });

    new cdk.CfnOutput(this, 'EncryptionKeyId', {
      value: encryptionKey.keyId,
      description: 'KMS Encryption Key ID',
    });

    new cdk.CfnOutput(this, 'TimestreamDatabaseName', {
      value: timestreamDatabase.databaseName!,
      description: 'Timestream Database Name',
    });

    new cdk.CfnOutput(this, 'VitalSignsTableName', {
      value: vitalSignsTable.tableName!,
      description: 'Timestream Vital Signs Table Name',
    });

    new cdk.CfnOutput(this, 'DeviceReadingsTableName', {
      value: deviceReadingsTable.tableName!,
      description: 'Timestream Device Readings Table Name',
    });

    new cdk.CfnOutput(this, 'SensorDataTableName', {
      value: sensorDataTable.tableName!,
      description: 'Timestream Sensor Data Table Name',
    });

    // Device Integration Service (Requirements 7.1, 7.2, 7.3, 7.4, 7.5)
    const deviceIntegration = new DeviceIntegrationConstruct(this, 'DeviceIntegration', {
      environment,
      devicesTable,
      timestreamDatabase,
      deviceReadingsTable,
      encryptionKey,
      eventBus,
    });

    // API Gateway Lambda Integrations (Task 16.2)
    new ApiLambdaIntegrations(this, 'ApiLambdaIntegrations', {
      api,
      environment,
      primaryAuthorizer,
      secondaryAuthorizer,
      primaryUserPool,
      secondaryUserPool,
      primaryUserPoolClientId: primaryUserPoolClient.userPoolClientId,
      secondaryUserPoolClientId: secondaryUserPoolClient.userPoolClientId,
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
      timestreamDatabaseName: timestreamDatabase.databaseName!,
      vitalSignsTableName: vitalSignsTable.tableName!,
      deviceReadingsTableName: deviceReadingsTable.tableName!,
    });

    // CloudWatch Monitoring and Alarms (Task 16.4)
    // Requirements: 9.1 - Real-time notifications and monitoring
    const monitoring = new CloudWatchMonitoringConstruct(this, 'CloudWatchMonitoring', {
      environment,
      api,
      usersTable,
      healthRecordsTable,
      medicationsTable,
      appointmentsTable,
      alertsTable,
      careCircleTable,
      devicesTable,
      alertTopic,
      // Optional: Set alarm email for production
      alarmEmail: environment === 'prod' ? process.env.ALARM_EMAIL : undefined,
    });

    // Output monitoring dashboard URL
    new cdk.CfnOutput(this, 'MonitoringDashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${monitoring.dashboard.dashboardName}`,
      description: 'CloudWatch Monitoring Dashboard URL',
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: monitoring.alarmTopic.topicArn,
      description: 'SNS Topic ARN for CloudWatch Alarms',
    });
  }
}
