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
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
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

    new cdk.CfnOutput(this, 'ReportsBucketName', {
      value: reportsBucket.bucketName,
      description: 'S3 Bucket for Health Reports',
    });

    new cdk.CfnOutput(this, 'EncryptionKeyId', {
      value: encryptionKey.keyId,
      description: 'KMS Encryption Key ID',
    });
  }
}
