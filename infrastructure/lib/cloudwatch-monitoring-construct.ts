/**
 * CloudWatch Monitoring and Alarms Construct
 * Task 16.4: Set up CloudWatch monitoring and alarms
 * 
 * This module creates comprehensive CloudWatch monitoring including:
 * - CloudWatch dashboards for API metrics
 * - Alarms for error rates and latency
 * - Log aggregation and analysis
 * - Distributed tracing with X-Ray (already enabled on Lambda functions)
 * 
 * Requirements: 9.1 - Real-time notifications and monitoring
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface CloudWatchMonitoringProps {
  environment: 'dev' | 'staging' | 'prod';
  api: apigateway.RestApi;
  
  // DynamoDB Tables for monitoring
  usersTable: dynamodb.Table;
  healthRecordsTable: dynamodb.Table;
  medicationsTable: dynamodb.Table;
  appointmentsTable: dynamodb.Table;
  alertsTable: dynamodb.Table;
  careCircleTable: dynamodb.Table;
  devicesTable: dynamodb.Table;
  
  // SNS Topics for alerts
  alertTopic: sns.Topic;
  
  // Optional: Email for alarm notifications
  alarmEmail?: string;
}

export class CloudWatchMonitoringConstruct extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: CloudWatchMonitoringProps) {
    super(scope, id);

    const {
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
      alarmEmail,
    } = props;

    // ========================================
    // SNS TOPIC FOR CLOUDWATCH ALARMS
    // ========================================
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `healthcare-cloudwatch-alarms-${environment}`,
      displayName: 'Healthcare Monitoring CloudWatch Alarms',
    });

    // Subscribe email if provided
    if (alarmEmail) {
      this.alarmTopic.addSubscription(
        new subscriptions.EmailSubscription(alarmEmail)
      );
    }

    // ========================================
    // API GATEWAY METRICS AND ALARMS
    // ========================================
    
    // API Gateway 4XX Error Rate Alarm
    const api4xxErrorMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '4XXError',
      dimensionsMap: {
        ApiName: api.restApiName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const api4xxAlarm = new cloudwatch.Alarm(this, 'Api4xxErrorAlarm', {
      alarmName: `healthcare-api-4xx-errors-${environment}`,
      alarmDescription: 'Alert when API 4XX error rate is high',
      metric: api4xxErrorMetric,
      threshold: environment === 'prod' ? 50 : 20, // More sensitive in prod
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    api4xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // API Gateway 5XX Error Rate Alarm
    const api5xxErrorMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5XXError',
      dimensionsMap: {
        ApiName: api.restApiName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxErrorAlarm', {
      alarmName: `healthcare-api-5xx-errors-${environment}`,
      alarmDescription: 'CRITICAL: Alert when API 5XX error rate is high',
      metric: api5xxErrorMetric,
      threshold: environment === 'prod' ? 10 : 5, // Very sensitive for server errors
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    api5xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // API Gateway Latency Alarm
    const apiLatencyMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: {
        ApiName: api.restApiName,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      alarmName: `healthcare-api-latency-${environment}`,
      alarmDescription: 'Alert when API latency is high',
      metric: apiLatencyMetric,
      threshold: environment === 'prod' ? 2000 : 3000, // 2s in prod, 3s in dev/staging
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiLatencyAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // API Gateway Request Count (for monitoring traffic)
    const apiCountMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Count',
      dimensionsMap: {
        ApiName: api.restApiName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    // ========================================
    // DYNAMODB METRICS AND ALARMS
    // ========================================
    
    const tables = [
      { table: usersTable, name: 'Users' },
      { table: healthRecordsTable, name: 'HealthRecords' },
      { table: medicationsTable, name: 'Medications' },
      { table: appointmentsTable, name: 'Appointments' },
      { table: alertsTable, name: 'Alerts' },
      { table: careCircleTable, name: 'CareCircle' },
      { table: devicesTable, name: 'Devices' },
    ];

    const dynamoDbAlarms: cloudwatch.Alarm[] = [];

    tables.forEach(({ table, name }) => {
      // Read Throttle Alarm
      const readThrottleMetric = table.metricUserErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      });

      const readThrottleAlarm = new cloudwatch.Alarm(this, `${name}ReadThrottleAlarm`, {
        alarmName: `healthcare-dynamodb-${name.toLowerCase()}-read-throttle-${environment}`,
        alarmDescription: `Alert when ${name} table has read throttling`,
        metric: readThrottleMetric,
        threshold: 5,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      readThrottleAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
      dynamoDbAlarms.push(readThrottleAlarm);

      // System Errors Alarm - using ConditionalCheckFailedRequests as a proxy for system issues
      const systemErrorsMetric = table.metric('SystemErrors', {
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      });

      const systemErrorsAlarm = new cloudwatch.Alarm(this, `${name}SystemErrorsAlarm`, {
        alarmName: `healthcare-dynamodb-${name.toLowerCase()}-system-errors-${environment}`,
        alarmDescription: `CRITICAL: Alert when ${name} table has system errors`,
        metric: systemErrorsMetric,
        threshold: 1,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      systemErrorsAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
      dynamoDbAlarms.push(systemErrorsAlarm);
    });

    // ========================================
    // LOG AGGREGATION AND ANALYSIS
    // ========================================
    
    // Create Log Insights Query Definitions for common analysis patterns
    const logGroup = logs.LogGroup.fromLogGroupName(
      this,
      'ApiLogGroup',
      `/aws/apigateway/${api.restApiName}`
    );

    // Metric Filter for API Errors
    const apiErrorMetricFilter = new logs.MetricFilter(this, 'ApiErrorMetricFilter', {
      logGroup,
      metricNamespace: 'Healthcare/API',
      metricName: 'ApiErrors',
      filterPattern: logs.FilterPattern.anyTerm('ERROR', 'Error', 'error', 'Exception'),
      metricValue: '1',
      defaultValue: 0,
    });

    // Alarm for aggregated API errors from logs
    const logErrorMetric = new cloudwatch.Metric({
      namespace: 'Healthcare/API',
      metricName: 'ApiErrors',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const logErrorAlarm = new cloudwatch.Alarm(this, 'LogErrorAlarm', {
      alarmName: `healthcare-api-log-errors-${environment}`,
      alarmDescription: 'Alert when error logs are detected in API Gateway',
      metric: logErrorMetric,
      threshold: environment === 'prod' ? 20 : 10,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    logErrorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // Metric Filter for Slow Requests (latency > 5s)
    const slowRequestMetricFilter = new logs.MetricFilter(this, 'SlowRequestMetricFilter', {
      logGroup,
      metricNamespace: 'Healthcare/API',
      metricName: 'SlowRequests',
      filterPattern: logs.FilterPattern.spaceDelimited('requestId', 'ip', 'user', 'timestamp', 'method', 'path', 'status', 'latency')
        .whereNumber('latency', '>', 5000),
      metricValue: '1',
      defaultValue: 0,
    });

    // ========================================
    // CLOUDWATCH DASHBOARD
    // ========================================
    
    this.dashboard = new cloudwatch.Dashboard(this, 'HealthcareDashboard', {
      dashboardName: `healthcare-monitoring-${environment}`,
    });

    // API Gateway Metrics Section
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Request Count',
        left: [apiCountMetric],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Latency',
        left: [apiLatencyMetric],
        width: 12,
        height: 6,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - 4XX Errors',
        left: [api4xxErrorMetric],
        width: 8,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway - 5XX Errors',
        left: [api5xxErrorMetric],
        width: 8,
        height: 6,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'API Gateway - Total Requests (24h)',
        metrics: [apiCountMetric],
        width: 8,
        height: 6,
      })
    );

    // DynamoDB Metrics Section
    const dynamoDbWidgets: cloudwatch.IWidget[] = [];
    
    tables.forEach(({ table, name }) => {
      dynamoDbWidgets.push(
        new cloudwatch.GraphWidget({
          title: `DynamoDB - ${name} Read/Write Capacity`,
          left: [
            table.metricConsumedReadCapacityUnits({ statistic: 'Sum' }),
            table.metricConsumedWriteCapacityUnits({ statistic: 'Sum' }),
          ],
          width: 12,
          height: 6,
        })
      );
    });

    this.dashboard.addWidgets(...dynamoDbWidgets);

    // Alert System Metrics Section
    const alertDeliveryMetric = new cloudwatch.Metric({
      namespace: 'AWS/SNS',
      metricName: 'NumberOfMessagesPublished',
      dimensionsMap: {
        TopicName: alertTopic.topicName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const alertFailureMetric = new cloudwatch.Metric({
      namespace: 'AWS/SNS',
      metricName: 'NumberOfNotificationsFailed',
      dimensionsMap: {
        TopicName: alertTopic.topicName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Alert System - Messages Published',
        left: [alertDeliveryMetric],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Alert System - Failed Notifications',
        left: [alertFailureMetric],
        width: 12,
        height: 6,
      })
    );

    // Alert Notification Failure Alarm
    const alertFailureAlarm = new cloudwatch.Alarm(this, 'AlertFailureAlarm', {
      alarmName: `healthcare-alert-notification-failures-${environment}`,
      alarmDescription: 'CRITICAL: Alert when notification delivery fails',
      metric: alertFailureMetric,
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    alertFailureAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // Log Insights Queries Section
    this.dashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title: 'Recent API Errors',
        logGroupNames: [logGroup.logGroupName],
        queryLines: [
          'fields @timestamp, @message',
          'filter @message like /ERROR|Error|error|Exception/',
          'sort @timestamp desc',
          'limit 20',
        ],
        width: 24,
        height: 6,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title: 'Slowest API Requests',
        logGroupNames: [logGroup.logGroupName],
        queryLines: [
          'fields @timestamp, requestId, method, path, latency',
          'filter latency > 1000',
          'sort latency desc',
          'limit 20',
        ],
        width: 24,
        height: 6,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title: 'Top API Endpoints by Request Count',
        logGroupNames: [logGroup.logGroupName],
        queryLines: [
          'fields path',
          'stats count() as requestCount by path',
          'sort requestCount desc',
          'limit 10',
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.LogQueryWidget({
        title: 'Error Rate by Endpoint',
        logGroupNames: [logGroup.logGroupName],
        queryLines: [
          'fields path, status',
          'filter status >= 400',
          'stats count() as errorCount by path',
          'sort errorCount desc',
          'limit 10',
        ],
        width: 12,
        height: 6,
      })
    );

    // ========================================
    // COMPOSITE ALARMS FOR CRITICAL SCENARIOS
    // ========================================
    
    // Composite alarm for overall API health
    const apiHealthCompositeAlarm = new cloudwatch.CompositeAlarm(this, 'ApiHealthCompositeAlarm', {
      compositeAlarmName: `healthcare-api-health-composite-${environment}`,
      alarmDescription: 'CRITICAL: Multiple API health indicators are failing',
      alarmRule: cloudwatch.AlarmRule.anyOf(
        cloudwatch.AlarmRule.fromAlarm(api5xxAlarm, cloudwatch.AlarmState.ALARM),
        cloudwatch.AlarmRule.allOf(
          cloudwatch.AlarmRule.fromAlarm(api4xxAlarm, cloudwatch.AlarmState.ALARM),
          cloudwatch.AlarmRule.fromAlarm(apiLatencyAlarm, cloudwatch.AlarmState.ALARM)
        )
      ),
    });
    apiHealthCompositeAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // ========================================
    // OUTPUTS
    // ========================================
    
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${cdk.Stack.of(this).region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS Topic ARN for CloudWatch Alarms',
    });
  }
}
