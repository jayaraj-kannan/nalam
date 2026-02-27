#!/usr/bin/env node
/**
 * Load Test CLI
 * Requirements: 9.1 - Test notification delivery under load
 * 
 * Command-line interface for running load tests
 */

import { loadTestScenarios } from './load-test-config';
import { runLoadTest, runAllLoadTests } from './run-load-test';

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
Healthcare Monitoring App - Load Test Runner

Usage:
  npm run load-test [options]

Options:
  --scenario <name>    Run a specific scenario (default: all)
  --api-url <url>      API base URL (default: http://localhost:3000)
  --auth-token <token> Authentication token for protected endpoints
  --help               Show this help message

Available Scenarios:
${loadTestScenarios.map(s => `  - ${s.name}`).join('\n')}

Examples:
  npm run load-test
  npm run load-test --scenario "Normal Daily Usage"
  npm run load-test --api-url https://api.example.com --auth-token abc123
  `);
}

async function main() {
  // Parse arguments
  const scenarioName = args.includes('--scenario') 
    ? args[args.indexOf('--scenario') + 1] 
    : null;
  
  const apiUrl = args.includes('--api-url')
    ? args[args.indexOf('--api-url') + 1]
    : 'http://localhost:3000';
  
  const authToken = args.includes('--auth-token')
    ? args[args.indexOf('--auth-token') + 1]
    : undefined;
  
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  
  console.log('Healthcare Monitoring App - Load Test Runner');
  console.log('='.repeat(80));
  console.log(`API URL: ${apiUrl}`);
  console.log(`Auth Token: ${authToken ? '***' : 'Not provided'}`);
  console.log('='.repeat(80) + '\n');
  
  try {
    if (scenarioName) {
      // Run specific scenario
      const scenario = loadTestScenarios.find(s => s.name === scenarioName);
      
      if (!scenario) {
        console.error(`Error: Scenario "${scenarioName}" not found`);
        console.log('\nAvailable scenarios:');
        loadTestScenarios.forEach(s => console.log(`  - ${s.name}`));
        process.exit(1);
      }
      
      const result = await runLoadTest(scenario, apiUrl, authToken);
      process.exit(result.passed ? 0 : 1);
    } else {
      // Run all scenarios
      const results = await runAllLoadTests(loadTestScenarios, apiUrl, authToken);
      const allPassed = results.every(r => r.passed);
      process.exit(allPassed ? 0 : 1);
    }
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

main();
