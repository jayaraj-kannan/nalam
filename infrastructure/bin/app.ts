#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HealthcareMonitoringStack } from '../lib/healthcare-monitoring-stack';

const app = new cdk.App();

// Get environment from context or use default
const environment = app.node.tryGetContext('environment') || 'dev';

// Development environment
new HealthcareMonitoringStack(app, `HealthcareMonitoring-Dev`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  environment: 'dev',
  tags: {
    Environment: 'dev',
    Project: 'HealthcareMonitoring',
    ManagedBy: 'CDK',
  },
});

// Staging environment
new HealthcareMonitoringStack(app, `HealthcareMonitoring-Staging`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  environment: 'staging',
  tags: {
    Environment: 'staging',
    Project: 'HealthcareMonitoring',
    ManagedBy: 'CDK',
  },
});

// Production environment
new HealthcareMonitoringStack(app, `HealthcareMonitoring-Prod`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  environment: 'prod',
  tags: {
    Environment: 'prod',
    Project: 'HealthcareMonitoring',
    ManagedBy: 'CDK',
  },
});

app.synth();
