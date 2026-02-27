/**
 * Lambda Performance Configuration
 * Configures provisioned concurrency for critical functions
 * Requirements: 9.1 - Emergency alert delivery within 30 seconds
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface LambdaPerformanceConfig {
  /**
   * Memory size in MB (affects CPU allocation)
   * Higher memory = more CPU power = faster execution
   */
  memorySize: number;

  /**
   * Timeout in seconds
   */
  timeout: cdk.Duration;

  /**
   * Reserved concurrent executions
   * Guarantees capacity for critical functions
   */
  reservedConcurrentExecutions?: number;

  /**
   * Provisioned concurrent executions
   * Pre-warmed instances to eliminate cold starts
   */
  provisionedConcurrentExecutions?: number;

  /**
   * Environment variables for performance tuning
   */
  environment?: Record<string, string>;
}

/**
 * Performance profiles for different function types
 */
export const PerformanceProfiles = {
  /**
   * Critical functions that must respond immediately
   * Examples: Emergency alerts, vital signs recording
   */
  CRITICAL: {
    memorySize: 1024, // 1GB for fast execution
    timeout: cdk.Duration.seconds(10),
    reservedConcurrentExecutions: 10,
    provisionedConcurrentExecutions: 5, // Always keep 5 warm instances
    environment: {
      NODE_OPTIONS: '--enable-source-maps --max-old-space-size=896',
    },
  } as LambdaPerformanceConfig,

  /**
   * High-priority functions with fast response requirements
   * Examples: Medication reminders, appointment reminders
   */
  HIGH_PRIORITY: {
    memorySize: 512,
    timeout: cdk.Duration.seconds(15),
    reservedConcurrentExecutions: 5,
    provisionedConcurrentExecutions: 2, // Keep 2 warm instances
    environment: {
      NODE_OPTIONS: '--enable-source-maps',
    },
  } as LambdaPerformanceConfig,

  /**
   * Standard functions with normal response requirements
   * Examples: Health data queries, care circle management
   */
  STANDARD: {
    memorySize: 256,
    timeout: cdk.Duration.seconds(30),
    environment: {
      NODE_OPTIONS: '--enable-source-maps',
    },
  } as LambdaPerformanceConfig,

  /**
   * Background processing functions
   * Examples: Report generation, data aggregation
   */
  BACKGROUND: {
    memorySize: 512,
    timeout: cdk.Duration.minutes(5),
    environment: {
      NODE_OPTIONS: '--enable-source-maps --max-old-space-size=448',
    },
  } as LambdaPerformanceConfig,
};

/**
 * Apply performance configuration to a Lambda function
 */
export function applyPerformanceConfig(
  fn: lambda.Function,
  config: LambdaPerformanceConfig
): void {
  // Reserved concurrency
  if (config.reservedConcurrentExecutions !== undefined) {
    fn.addAlias('live', {
      provisionedConcurrentExecutions: config.provisionedConcurrentExecutions,
    });
  }
}

/**
 * Create Lambda function with performance optimizations
 */
export function createOptimizedFunction(
  scope: Construct,
  id: string,
  props: lambda.FunctionProps,
  performanceConfig: LambdaPerformanceConfig
): lambda.Function {
  const fn = new lambda.Function(scope, id, {
    ...props,
    memorySize: performanceConfig.memorySize,
    timeout: performanceConfig.timeout,
    reservedConcurrentExecutions: performanceConfig.reservedConcurrentExecutions,
    environment: {
      ...props.environment,
      ...performanceConfig.environment,
    },
    // Enable X-Ray tracing for performance monitoring
    tracing: lambda.Tracing.ACTIVE,
  });

  // Add provisioned concurrency if specified
  if (performanceConfig.provisionedConcurrentExecutions !== undefined) {
    const version = fn.currentVersion;
    const alias = new lambda.Alias(scope, `${id}Alias`, {
      aliasName: 'live',
      version,
      provisionedConcurrentExecutions: performanceConfig.provisionedConcurrentExecutions,
    });
  }

  return fn;
}

/**
 * Critical function identifiers for provisioned concurrency
 */
export const CriticalFunctions = {
  TRIGGER_EMERGENCY: 'trigger-emergency',
  RECORD_VITAL_SIGNS: 'record-vital-signs',
  PROCESS_EMERGENCY_EVENT: 'process-emergency-event',
  SEND_ALERT_NOTIFICATIONS: 'send-alert-notifications',
} as const;

/**
 * Check if a function should have provisioned concurrency
 */
export function isCriticalFunction(functionName: string): boolean {
  return Object.values(CriticalFunctions).includes(functionName as any);
}
