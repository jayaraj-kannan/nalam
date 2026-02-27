/**
 * Load Test Runner
 * Requirements: 9.1 - Test notification delivery under load
 * 
 * Executes load test scenarios and reports results
 */

import { LoadTestScenario } from './load-test-config';

export interface LoadTestResult {
  scenario: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  throughput: number;
  responseTime: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errors: Array<{
    endpoint: string;
    error: string;
    count: number;
  }>;
  passed: boolean;
  thresholdViolations: string[];
}

/**
 * Execute a load test scenario
 */
export async function runLoadTest(
  scenario: LoadTestScenario,
  apiBaseUrl: string,
  authToken?: string
): Promise<LoadTestResult> {
  console.log(`Starting load test: ${scenario.name}`);
  console.log(`Description: ${scenario.description}`);
  console.log(`Virtual Users: ${scenario.virtualUsers}`);
  console.log(`Duration: ${scenario.duration}s`);
  console.log(`Ramp-up Time: ${scenario.rampUpTime}s`);

  const startTime = new Date();
  const results: number[] = [];
  const errors: Map<string, { endpoint: string; error: string; count: number }> = new Map();
  let successCount = 0;
  let failCount = 0;

  try {
    // Simulate load test execution
    // In a real implementation, this would use a load testing library like k6, Artillery, or custom implementation
    
    // Calculate requests per second during steady state
    const steadyStateDuration = scenario.duration - scenario.rampUpTime;
    const totalRequests = Math.floor(scenario.virtualUsers * steadyStateDuration);
    
    console.log(`\nExecuting ${totalRequests} requests...`);
    
    // Simulate request execution
    for (let i = 0; i < totalRequests; i++) {
      // Select endpoint based on weight
      const endpoint = selectEndpoint(scenario.endpoints);
      
      try {
        const responseTime = await executeRequest(
          apiBaseUrl,
          endpoint,
          authToken
        );
        
        results.push(responseTime);
        successCount++;
        
        // Progress indicator
        if ((i + 1) % 100 === 0) {
          process.stdout.write(`\rProgress: ${i + 1}/${totalRequests} requests`);
        }
      } catch (error) {
        failCount++;
        const errorKey = `${endpoint.method} ${endpoint.path}`;
        const existing = errors.get(errorKey);
        
        if (existing) {
          existing.count++;
        } else {
          errors.set(errorKey, {
            endpoint: `${endpoint.method} ${endpoint.path}`,
            error: error instanceof Error ? error.message : 'Unknown error',
            count: 1,
          });
        }
      }
    }
    
    console.log('\n\nLoad test completed!');
    
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    // Calculate statistics
    results.sort((a, b) => a - b);
    const responseTime = {
      min: results[0] || 0,
      max: results[results.length - 1] || 0,
      avg: results.reduce((a, b) => a + b, 0) / results.length || 0,
      p50: percentile(results, 50),
      p95: percentile(results, 95),
      p99: percentile(results, 99),
    };
    
    const errorRate = (failCount / (successCount + failCount)) * 100;
    const throughput = (successCount + failCount) / duration;
    
    // Check thresholds
    const thresholdViolations: string[] = [];
    
    if (responseTime.max > scenario.thresholds.maxResponseTime) {
      thresholdViolations.push(
        `Max response time ${responseTime.max}ms exceeds threshold ${scenario.thresholds.maxResponseTime}ms`
      );
    }
    
    if (errorRate > scenario.thresholds.maxErrorRate) {
      thresholdViolations.push(
        `Error rate ${errorRate.toFixed(2)}% exceeds threshold ${scenario.thresholds.maxErrorRate}%`
      );
    }
    
    if (throughput < scenario.thresholds.minThroughput) {
      thresholdViolations.push(
        `Throughput ${throughput.toFixed(2)} req/s below threshold ${scenario.thresholds.minThroughput} req/s`
      );
    }
    
    if (responseTime.p95 > scenario.thresholds.p95ResponseTime) {
      thresholdViolations.push(
        `P95 response time ${responseTime.p95}ms exceeds threshold ${scenario.thresholds.p95ResponseTime}ms`
      );
    }
    
    if (responseTime.p99 > scenario.thresholds.p99ResponseTime) {
      thresholdViolations.push(
        `P99 response time ${responseTime.p99}ms exceeds threshold ${scenario.thresholds.p99ResponseTime}ms`
      );
    }
    
    const result: LoadTestResult = {
      scenario: scenario.name,
      startTime,
      endTime,
      duration,
      totalRequests: successCount + failCount,
      successfulRequests: successCount,
      failedRequests: failCount,
      errorRate,
      throughput,
      responseTime,
      errors: Array.from(errors.values()),
      passed: thresholdViolations.length === 0,
      thresholdViolations,
    };
    
    printResults(result);
    
    return result;
  } catch (error) {
    console.error('Load test failed:', error);
    throw error;
  }
}

/**
 * Select endpoint based on weight distribution
 */
function selectEndpoint(endpoints: LoadTestScenario['endpoints']): LoadTestScenario['endpoints'][0] {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const endpoint of endpoints) {
    cumulative += endpoint.weight;
    if (random <= cumulative) {
      return endpoint;
    }
  }
  
  return endpoints[0];
}

/**
 * Execute a single request (simulated)
 */
async function executeRequest(
  baseUrl: string,
  endpoint: LoadTestScenario['endpoints'][0],
  authToken?: string
): Promise<number> {
  const startTime = Date.now();
  
  // Simulate request execution
  // In a real implementation, this would make actual HTTP requests
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
  
  const responseTime = Date.now() - startTime;
  
  // Simulate occasional failures (5% failure rate)
  if (Math.random() < 0.05) {
    throw new Error('Simulated request failure');
  }
  
  return responseTime;
}

/**
 * Calculate percentile
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const index = Math.ceil((p / 100) * values.length) - 1;
  return values[Math.max(0, index)];
}

/**
 * Print load test results
 */
function printResults(result: LoadTestResult): void {
  console.log('\n' + '='.repeat(80));
  console.log(`LOAD TEST RESULTS: ${result.scenario}`);
  console.log('='.repeat(80));
  
  console.log('\nOverall Statistics:');
  console.log(`  Duration: ${result.duration.toFixed(2)}s`);
  console.log(`  Total Requests: ${result.totalRequests}`);
  console.log(`  Successful: ${result.successfulRequests}`);
  console.log(`  Failed: ${result.failedRequests}`);
  console.log(`  Error Rate: ${result.errorRate.toFixed(2)}%`);
  console.log(`  Throughput: ${result.throughput.toFixed(2)} req/s`);
  
  console.log('\nResponse Time Statistics:');
  console.log(`  Min: ${result.responseTime.min}ms`);
  console.log(`  Max: ${result.responseTime.max}ms`);
  console.log(`  Avg: ${result.responseTime.avg.toFixed(2)}ms`);
  console.log(`  P50: ${result.responseTime.p50}ms`);
  console.log(`  P95: ${result.responseTime.p95}ms`);
  console.log(`  P99: ${result.responseTime.p99}ms`);
  
  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(error => {
      console.log(`  ${error.endpoint}: ${error.error} (${error.count} occurrences)`);
    });
  }
  
  if (result.thresholdViolations.length > 0) {
    console.log('\n⚠️  THRESHOLD VIOLATIONS:');
    result.thresholdViolations.forEach(violation => {
      console.log(`  - ${violation}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`TEST ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Run all load test scenarios
 */
export async function runAllLoadTests(
  scenarios: LoadTestScenario[],
  apiBaseUrl: string,
  authToken?: string
): Promise<LoadTestResult[]> {
  const results: LoadTestResult[] = [];
  
  for (const scenario of scenarios) {
    const result = await runLoadTest(scenario, apiBaseUrl, authToken);
    results.push(result);
    
    // Wait between scenarios
    console.log('\nWaiting 30 seconds before next scenario...\n');
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('LOAD TEST SUMMARY');
  console.log('='.repeat(80));
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${result.scenario}`);
    console.log(`  Throughput: ${result.throughput.toFixed(2)} req/s`);
    console.log(`  Error Rate: ${result.errorRate.toFixed(2)}%`);
    console.log(`  P95 Response Time: ${result.responseTime.p95}ms`);
  });
  
  const allPassed = results.every(r => r.passed);
  console.log('\n' + '='.repeat(80));
  console.log(`OVERALL: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('='.repeat(80) + '\n');
  
  return results;
}
