# Lambda Functions

This directory contains all Lambda function code for the Healthcare Monitoring App.

## Structure

```
lambda/
├── health-monitoring/       # Health data recording and analysis
├── alert-management/        # Alert creation and notification
├── medication-tracking/     # Medication reminders and adherence
├── appointment-management/  # Appointment scheduling and reminders
├── device-integration/      # IoT device data processing
├── care-circle/            # Care circle management
├── auth/                   # Authentication and authorization
└── shared/                 # Shared utilities and types
```

## Development

Each Lambda function should:
- Have its own package.json
- Include TypeScript types
- Have unit tests
- Follow error handling patterns
- Log appropriately for CloudWatch

## Deployment

Lambda functions are deployed as part of the CDK stack in `lib/healthcare-monitoring-stack.ts`.
