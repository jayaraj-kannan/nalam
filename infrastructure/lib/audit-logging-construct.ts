// Audit Logging Infrastructure
// Requirements: 8.4 - Comprehensive audit logging with 7-year retention

import { Construct } from 'constructs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';

export interface AuditLoggingConstructProps {
  environment: string;
  encryptionKey: kms.Key;
}

export class AuditLoggingConstruct extends Construct {
  public readonly auditLogGroup: logs.LogGroup;
  public readonly auditLogsTable: dynamodb.Table;
  public readonly reportGeneratorFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: AuditLoggingConstructProps) {
    super(scope, id);

    const { environment, encryptionKey } = props;

    // CloudWatch Log Group for audit logs
    // Requirements: 8.4 - Store audit logs with 7-year retention
    this.auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
      logGroupName: `/healthcare-monitoring/${environment}/audit`,
      retention: logs.RetentionDays.TEN_YEARS, // Exceeds 7-year HIPAA requirement
      encryptionKey,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // Log streams for different audit event types
    const accessLogStream = new logs.LogStream(this, 'AccessLogStream', {
      logGroup: this.auditLogGroup,
      logStreamName: 'data-access-events',
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    const permissionLogStream = new logs.LogStream(this, 'PermissionLogStream', {
      logGroup: this.auditLogGroup,
      logStreamName: 'permission-changes',
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    const apiLogStream = new logs.LogStream(this, 'ApiLogStream', {
      logGroup: this.auditLogGroup,
      logStreamName: 'api-requests',
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    const securityLogStream = new logs.LogStream(this, 'SecurityLogStream', {
      logGroup: this.auditLogGroup,
      logStreamName: 'security-events',
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // DynamoDB table for queryable audit logs
    // Requirements: 8.4 - Structured audit log storage
    this.auditLogsTable = new dynamodb.Table(this, 'AuditLogsTable', {
      tableName: `healthcare-audit-logs-${environment}`,
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl',
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_IMAGE, // Enable streams for real-time processing
    });

    // GSI for querying by user
    this.auditLogsTable.addGlobalSecondaryIndex({
      indexName: 'userId-timestamp-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // GSI for querying by event type
    this.auditLogsTable.addGlobalSecondaryIndex({
      indexName: 'eventType-timestamp-index',
      partitionKey: { name: 'eventType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // GSI for querying by target user (for care circle access)
    this.auditLogsTable.addGlobalSecondaryIndex({
      indexName: 'targetUserId-timestamp-index',
      partitionKey: { name: 'targetUserId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // Lambda function for generating audit reports
    // Requirements: 8.4 - Audit report generation
    this.reportGeneratorFunction = new lambda.Function(this, 'AuditReportGenerator', {
      functionName: `healthcare-audit-report-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'generate-audit-report.handler',
      code: lambda.Code.fromAsset('lambda/audit'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        AUDIT_LOGS_TABLE: this.auditLogsTable.tableName,
        AUDIT_LOG_GROUP: this.auditLogGroup.logGroupName,
        ENVIRONMENT: environment,
      },
    });

    // Grant permissions
    this.auditLogsTable.grantReadData(this.reportGeneratorFunction);
    this.auditLogGroup.grantRead(this.reportGeneratorFunction);

    // Metric filters for monitoring
    // Requirements: 8.4 - Real-time audit monitoring
    
    // Failed access attempts
    new logs.MetricFilter(this, 'FailedAccessMetric', {
      logGroup: this.auditLogGroup,
      metricNamespace: 'HealthcareMonitoring/Audit',
      metricName: 'FailedAccessAttempts',
      filterPattern: logs.FilterPattern.literal('{ $.success = false && $.eventType = "DATA_ACCESS" }'),
      metricValue: '1',
    });

    // Permission changes
    new logs.MetricFilter(this, 'PermissionChangeMetric', {
      logGroup: this.auditLogGroup,
      metricNamespace: 'HealthcareMonitoring/Audit',
      metricName: 'PermissionChanges',
      filterPattern: logs.FilterPattern.literal('{ $.eventType = "PERMISSION_CHANGE" }'),
      metricValue: '1',
    });

    // Security events
    new logs.MetricFilter(this, 'SecurityEventMetric', {
      logGroup: this.auditLogGroup,
      metricNamespace: 'HealthcareMonitoring/Audit',
      metricName: 'SecurityEvents',
      filterPattern: logs.FilterPattern.literal('{ $.eventType = "SECURITY_*" }'),
      metricValue: '1',
    });

    // High-severity security events
    new logs.MetricFilter(this, 'CriticalSecurityMetric', {
      logGroup: this.auditLogGroup,
      metricNamespace: 'HealthcareMonitoring/Audit',
      metricName: 'CriticalSecurityEvents',
      filterPattern: logs.FilterPattern.literal('{ $.metadata.severity = "critical" }'),
      metricValue: '1',
    });

    // Outputs
    new cdk.CfnOutput(this, 'AuditLogGroupName', {
      value: this.auditLogGroup.logGroupName,
      description: 'CloudWatch Log Group for audit logs',
    });

    new cdk.CfnOutput(this, 'AuditLogsTableName', {
      value: this.auditLogsTable.tableName,
      description: 'DynamoDB table for audit logs',
    });

    new cdk.CfnOutput(this, 'AuditReportGeneratorArn', {
      value: this.reportGeneratorFunction.functionArn,
      description: 'Lambda function for generating audit reports',
    });
  }
}
