// Alert Management Infrastructure Construct
// Requirements: 3.1, 9.1

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface AlertManagementConstructProps {
  environment: string;
  eventBus: events.EventBus;
  alertsTable: dynamodb.Table;
  usersTable: dynamodb.Table;
  careCircleTable: dynamodb.Table;
  alertTopic: sns.Topic;
}

export class AlertManagementConstruct extends Construct {
  public readonly processEmergencyEventFunction: lambda.Function;
  public readonly sendAlertNotificationsFunction: lambda.Function;
  public readonly notifyAlertAcknowledgedFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: AlertManagementConstructProps) {
    super(scope, id);

    const { environment, eventBus, alertsTable, usersTable, careCircleTable, alertTopic } = props;

    // Create DynamoDB table for notifications tracking
    const notificationsTable = new dynamodb.Table(this, 'NotificationsTable', {
      tableName: `healthcare-notifications-${environment}`,
      partitionKey: { name: 'notificationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sentAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    notificationsTable.addGlobalSecondaryIndex({
      indexName: 'alertId-index',
      partitionKey: { name: 'alertId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sentAt', type: dynamodb.AttributeType.STRING },
    });

    // Create DynamoDB table for emergency events
    const emergencyEventsTable = new dynamodb.Table(this, 'EmergencyEventsTable', {
      tableName: `healthcare-emergency-events-${environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    emergencyEventsTable.addGlobalSecondaryIndex({
      indexName: 'userId-timestamp-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // Common Lambda environment variables
    const commonEnvironment = {
      ENVIRONMENT: environment,
      EVENT_BUS_NAME: eventBus.eventBusName,
      ALERTS_TABLE: alertsTable.tableName,
      USERS_TABLE: usersTable.tableName,
      CARE_CIRCLE_TABLE: careCircleTable.tableName,
      NOTIFICATIONS_TABLE: notificationsTable.tableName,
      EMERGENCY_EVENTS_TABLE: emergencyEventsTable.tableName,
      ALERT_TOPIC_ARN: alertTopic.topicArn,
    };

    // Lambda function to process emergency events
    this.processEmergencyEventFunction = new nodejs.NodejsFunction(this, 'ProcessEmergencyEvent', {
      functionName: `healthcare-process-emergency-${environment}`,
      entry: 'lambda/events/process-emergency-event.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Lambda function to send alert notifications
    this.sendAlertNotificationsFunction = new nodejs.NodejsFunction(this, 'SendAlertNotifications', {
      functionName: `healthcare-send-alert-notifications-${environment}`,
      entry: 'lambda/events/send-alert-notifications.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(60), // Longer timeout for multi-channel notifications
      memorySize: 512,
      environment: commonEnvironment,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Lambda function to notify care circle of alert acknowledgment
    this.notifyAlertAcknowledgedFunction = new nodejs.NodejsFunction(this, 'NotifyAlertAcknowledged', {
      functionName: `healthcare-notify-alert-acknowledged-${environment}`,
      entry: 'lambda/events/notify-alert-acknowledged.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Grant permissions to Lambda functions
    alertsTable.grantReadWriteData(this.processEmergencyEventFunction);
    alertsTable.grantReadWriteData(this.sendAlertNotificationsFunction);
    alertsTable.grantReadWriteData(this.notifyAlertAcknowledgedFunction);

    usersTable.grantReadData(this.processEmergencyEventFunction);
    usersTable.grantReadData(this.sendAlertNotificationsFunction);
    usersTable.grantReadData(this.notifyAlertAcknowledgedFunction);

    careCircleTable.grantReadData(this.processEmergencyEventFunction);
    careCircleTable.grantReadData(this.sendAlertNotificationsFunction);
    careCircleTable.grantReadData(this.notifyAlertAcknowledgedFunction);

    notificationsTable.grantReadWriteData(this.sendAlertNotificationsFunction);
    notificationsTable.grantReadWriteData(this.notifyAlertAcknowledgedFunction);

    emergencyEventsTable.grantReadWriteData(this.processEmergencyEventFunction);

    // Grant SNS and SES permissions for notifications
    this.sendAlertNotificationsFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sns:Publish'],
      resources: ['*'],
    }));

    this.sendAlertNotificationsFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    this.notifyAlertAcknowledgedFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sns:Publish'],
      resources: ['*'],
    }));

    this.notifyAlertAcknowledgedFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    // Grant EventBridge permissions
    eventBus.grantPutEventsTo(this.processEmergencyEventFunction);
    eventBus.grantPutEventsTo(this.sendAlertNotificationsFunction);

    // EventBridge Rule: Emergency Triggered -> Process Emergency Event
    const emergencyTriggeredRule = new events.Rule(this, 'EmergencyTriggeredRule', {
      eventBus,
      ruleName: `healthcare-emergency-triggered-${environment}`,
      description: 'Route emergency events to processing function',
      eventPattern: {
        source: ['healthcare.emergency'],
        detailType: ['EmergencyTriggered'],
      },
    });

    emergencyTriggeredRule.addTarget(new targets.LambdaFunction(this.processEmergencyEventFunction, {
      retryAttempts: 2,
      maxEventAge: cdk.Duration.minutes(5),
    }));

    // EventBridge Rule: Alert Created -> Send Notifications
    const alertCreatedRule = new events.Rule(this, 'AlertCreatedRule', {
      eventBus,
      ruleName: `healthcare-alert-created-${environment}`,
      description: 'Send notifications when alerts are created',
      eventPattern: {
        source: ['healthcare.alerts'],
        detailType: ['AlertCreated'],
      },
    });

    alertCreatedRule.addTarget(new targets.LambdaFunction(this.sendAlertNotificationsFunction, {
      retryAttempts: 3,
      maxEventAge: cdk.Duration.minutes(2),
    }));

    // EventBridge Rule: Alert Escalated -> Send Escalation Notifications
    const alertEscalatedRule = new events.Rule(this, 'AlertEscalatedRule', {
      eventBus,
      ruleName: `healthcare-alert-escalated-${environment}`,
      description: 'Send notifications when alerts are escalated',
      eventPattern: {
        source: ['healthcare.alerts'],
        detailType: ['AlertEscalated'],
      },
    });

    alertEscalatedRule.addTarget(new targets.LambdaFunction(this.sendAlertNotificationsFunction, {
      retryAttempts: 3,
      maxEventAge: cdk.Duration.minutes(2),
    }));

    // EventBridge Rule: Alert Acknowledged -> Notify Care Circle
    const alertAcknowledgedRule = new events.Rule(this, 'AlertAcknowledgedRule', {
      eventBus,
      ruleName: `healthcare-alert-acknowledged-${environment}`,
      description: 'Notify care circle when alerts are acknowledged',
      eventPattern: {
        source: ['healthcare.alerts'],
        detailType: ['AlertAcknowledged'],
      },
    });

    alertAcknowledgedRule.addTarget(new targets.LambdaFunction(this.notifyAlertAcknowledgedFunction, {
      retryAttempts: 2,
      maxEventAge: cdk.Duration.minutes(5),
    }));

    // Dead Letter Queue for failed events
    const dlqTopic = new sns.Topic(this, 'AlertEventsDLQ', {
      topicName: `healthcare-alert-events-dlq-${environment}`,
      displayName: 'Alert Events Dead Letter Queue',
    });

    // Add DLQ to all rules
    [emergencyTriggeredRule, alertCreatedRule, alertEscalatedRule, alertAcknowledgedRule].forEach(rule => {
      rule.addTarget(new targets.SnsTopic(dlqTopic));
    });

    // Outputs
    new cdk.CfnOutput(this, 'NotificationsTableName', {
      value: notificationsTable.tableName,
      description: 'Notifications Table Name',
    });

    new cdk.CfnOutput(this, 'EmergencyEventsTableName', {
      value: emergencyEventsTable.tableName,
      description: 'Emergency Events Table Name',
    });

    new cdk.CfnOutput(this, 'ProcessEmergencyEventFunctionArn', {
      value: this.processEmergencyEventFunction.functionArn,
      description: 'Process Emergency Event Function ARN',
    });

    new cdk.CfnOutput(this, 'SendAlertNotificationsFunctionArn', {
      value: this.sendAlertNotificationsFunction.functionArn,
      description: 'Send Alert Notifications Function ARN',
    });
  }
}
