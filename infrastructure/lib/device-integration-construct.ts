import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';

export interface DeviceIntegrationConstructProps {
  environment: string;
  devicesTable: dynamodb.Table;
  timestreamDatabase: timestream.CfnDatabase;
  deviceReadingsTable: timestream.CfnTable;
  encryptionKey: kms.Key;
  eventBus: events.EventBus;
}

export class DeviceIntegrationConstruct extends Construct {
  public readonly deviceDataProcessor: lambda.Function;
  public readonly deviceRegistration: lambda.Function;
  public readonly connectivityMonitor: lambda.Function;

  constructor(scope: Construct, id: string, props: DeviceIntegrationConstructProps) {
    super(scope, id);

    const { environment, devicesTable, timestreamDatabase, deviceReadingsTable, encryptionKey, eventBus } = props;

    // IoT Core Thing Types for different health devices
    const deviceTypes = [
      'blood_pressure_monitor',
      'glucose_meter',
      'pulse_oximeter',
      'fitness_tracker',
      'fall_detector',
      'weight_scale',
    ];

    deviceTypes.forEach((deviceType) => {
      new iot.CfnThingType(this, `ThingType-${deviceType}`, {
        thingTypeName: `healthcare-${deviceType}-${environment}`,
        thingTypeProperties: {
          thingTypeDescription: `Health device type: ${deviceType}`,
        },
      });
    });

    // IoT Policy for device connectivity
    const devicePolicy = new iot.CfnPolicy(this, 'DevicePolicy', {
      policyName: `healthcare-device-policy-${environment}`,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['iot:Connect'],
            Resource: [`arn:aws:iot:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:client/\${iot:Connection.Thing.ThingName}`],
          },
          {
            Effect: 'Allow',
            Action: ['iot:Publish'],
            Resource: [
              `arn:aws:iot:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:topic/healthcare/devices/\${iot:Connection.Thing.ThingName}/data`,
              `arn:aws:iot:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:topic/healthcare/devices/\${iot:Connection.Thing.ThingName}/status`,
            ],
          },
          {
            Effect: 'Allow',
            Action: ['iot:Subscribe'],
            Resource: [
              `arn:aws:iot:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:topicfilter/healthcare/devices/\${iot:Connection.Thing.ThingName}/commands`,
            ],
          },
          {
            Effect: 'Allow',
            Action: ['iot:Receive'],
            Resource: [
              `arn:aws:iot:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:topic/healthcare/devices/\${iot:Connection.Thing.ThingName}/commands`,
            ],
          },
        ],
      },
    });

    // Lambda function for device data processing
    this.deviceDataProcessor = new lambda.Function(this, 'DeviceDataProcessor', {
      functionName: `healthcare-device-data-processor-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'process-device-data.handler',
      code: lambda.Code.fromAsset('infrastructure/lambda/devices'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DEVICES_TABLE: devicesTable.tableName,
        TIMESTREAM_DATABASE: timestreamDatabase.databaseName!,
        TIMESTREAM_TABLE: deviceReadingsTable.tableName!,
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Grant permissions to device data processor
    devicesTable.grantReadWriteData(this.deviceDataProcessor);
    this.deviceDataProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['timestream:WriteRecords', 'timestream:DescribeEndpoints'],
        resources: [
          `arn:aws:timestream:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:database/${timestreamDatabase.databaseName}`,
          `arn:aws:timestream:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:database/${timestreamDatabase.databaseName}/table/${deviceReadingsTable.tableName}`,
        ],
      })
    );
    eventBus.grantPutEventsTo(this.deviceDataProcessor);

    // IoT Topic Rule for device data ingestion
    const deviceDataRule = new iot.CfnTopicRule(this, 'DeviceDataRule', {
      topicRulePayload: {
        sql: "SELECT * FROM 'healthcare/devices/+/data'",
        description: 'Route device data to Lambda for processing',
        actions: [
          {
            lambda: {
              functionArn: this.deviceDataProcessor.functionArn,
            },
          },
        ],
        errorAction: {
          cloudwatchLogs: {
            logGroupName: `/aws/iot/healthcare-device-errors-${environment}`,
            roleArn: new iam.Role(this, 'IoTErrorLogRole', {
              assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
              inlinePolicies: {
                CloudWatchLogsPolicy: new iam.PolicyDocument({
                  statements: [
                    new iam.PolicyStatement({
                      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
                      resources: ['*'],
                    }),
                  ],
                }),
              },
            }).roleArn,
          },
        },
      },
    });

    // Grant IoT permission to invoke Lambda
    this.deviceDataProcessor.addPermission('IoTInvokePermission', {
      principal: new iam.ServicePrincipal('iot.amazonaws.com'),
      sourceArn: deviceDataRule.attrArn,
    });

    // Lambda function for device registration
    this.deviceRegistration = new lambda.Function(this, 'DeviceRegistration', {
      functionName: `healthcare-device-registration-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'register-device.handler',
      code: lambda.Code.fromAsset('infrastructure/lambda/devices'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        DEVICES_TABLE: devicesTable.tableName,
        IOT_POLICY_NAME: devicePolicy.policyName!,
        ENVIRONMENT: environment,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Grant permissions to device registration
    devicesTable.grantReadWriteData(this.deviceRegistration);
    this.deviceRegistration.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'iot:CreateThing',
          'iot:CreateKeysAndCertificate',
          'iot:AttachThingPrincipal',
          'iot:AttachPolicy',
          'iot:DescribeThing',
          'iot:UpdateThing',
        ],
        resources: ['*'],
      })
    );

    // Lambda function for device connectivity monitoring
    this.connectivityMonitor = new lambda.Function(this, 'ConnectivityMonitor', {
      functionName: `healthcare-connectivity-monitor-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'monitor-connectivity.handler',
      code: lambda.Code.fromAsset('infrastructure/lambda/devices'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        DEVICES_TABLE: devicesTable.tableName,
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Grant permissions to connectivity monitor
    devicesTable.grantReadWriteData(this.connectivityMonitor);
    eventBus.grantPutEventsTo(this.connectivityMonitor);

    // EventBridge rule to trigger connectivity monitoring every 15 minutes
    const connectivityRule = new events.Rule(this, 'ConnectivityMonitoringRule', {
      ruleName: `healthcare-connectivity-check-${environment}`,
      description: 'Check device connectivity every 15 minutes',
      schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
      eventBus,
    });

    connectivityRule.addTarget(new targets.LambdaFunction(this.connectivityMonitor));

    // IoT Topic Rule for device status updates
    const deviceStatusRule = new iot.CfnTopicRule(this, 'DeviceStatusRule', {
      topicRulePayload: {
        sql: "SELECT * FROM 'healthcare/devices/+/status'",
        description: 'Track device connection status',
        actions: [
          {
            lambda: {
              functionArn: this.connectivityMonitor.functionArn,
            },
          },
        ],
      },
    });

    // Grant IoT permission to invoke connectivity monitor
    this.connectivityMonitor.addPermission('IoTStatusInvokePermission', {
      principal: new iam.ServicePrincipal('iot.amazonaws.com'),
      sourceArn: deviceStatusRule.attrArn,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DevicePolicyName', {
      value: devicePolicy.policyName!,
      description: 'IoT Device Policy Name',
    });

    new cdk.CfnOutput(this, 'DeviceDataProcessorArn', {
      value: this.deviceDataProcessor.functionArn,
      description: 'Device Data Processor Lambda ARN',
    });

    new cdk.CfnOutput(this, 'DeviceRegistrationArn', {
      value: this.deviceRegistration.functionArn,
      description: 'Device Registration Lambda ARN',
    });
  }
}
