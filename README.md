# Healthcare Monitoring App

A comprehensive digital health platform designed for elderly users and their family members or caregivers. The system enables continuous health monitoring, medication management, emergency detection, and seamless communication.

## Features

- **Health Data Monitoring**: Track vital signs and health metrics with device integration
- **Medication Management**: Automated reminders and adherence tracking
- **Emergency Detection**: Real-time alerts and multi-channel notifications
- **Family Communication**: Care circle management and health status sharing
- **Accessible Interface**: Elderly-friendly design with voice input and large fonts
- **HIPAA Compliant**: End-to-end encryption and comprehensive audit logging

## Architecture

- **Frontend**: React.js with TypeScript, Progressive Web App
- **Backend**: AWS Lambda serverless functions
- **API**: Amazon API Gateway with Cognito authentication
- **Database**: Amazon DynamoDB and Timestream
- **Storage**: Amazon S3 with KMS encryption
- **Notifications**: Amazon SNS and SES
- **IoT**: AWS IoT Core for health device integration
- **Infrastructure**: AWS CDK for infrastructure-as-code

## Project Structure

```
healthcare-monitoring-app/
├── frontend/                 # React.js frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── config/          # Environment configuration
│   │   ├── test/            # Test setup
│   │   └── main.tsx         # Application entry point
│   ├── package.json
│   └── vite.config.ts
├── infrastructure/          # AWS CDK infrastructure
│   ├── bin/
│   │   └── app.ts          # CDK app entry point
│   ├── lib/
│   │   └── healthcare-monitoring-stack.ts
│   ├── package.json
│   └── cdk.json
├── .github/
│   └── workflows/
│       └── ci-cd.yml       # CI/CD pipeline
└── package.json            # Root package.json
```

## Prerequisites

- Node.js 18.x or later
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

## Getting Started

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install infrastructure dependencies
cd ../infrastructure && npm install
```

### 2. Configure Environment

```bash
# Frontend configuration
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your AWS configuration

# Infrastructure configuration
cp infrastructure/.env.example infrastructure/.env
# Edit infrastructure/.env with your AWS account details
```

### 3. Deploy Infrastructure

```bash
# Bootstrap CDK (first time only)
cd infrastructure
npx cdk bootstrap

# Deploy to development environment
npm run deploy

# Or deploy specific environment
npx cdk deploy HealthcareMonitoring-Dev
```

### 4. Run Frontend Locally

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`

## Development

### Frontend Development

```bash
cd frontend

# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Preview production build
npm run preview
```

### Infrastructure Development

```bash
cd infrastructure

# Synthesize CloudFormation template
npm run synth

# Show differences with deployed stack
npm run diff

# Deploy changes
npm run deploy

# Destroy stack (use with caution)
npm run destroy
```

## Environments

The application supports three environments:

- **Development**: For active development and testing
- **Staging**: For pre-production validation
- **Production**: For live production use

Each environment has isolated AWS resources and configurations.

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

- **Pull Requests**: Run tests and linting
- **Push to `develop`**: Deploy to development environment
- **Push to `main`**: Deploy to staging and production environments

### Required GitHub Secrets

- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_ACCOUNT_ID`: AWS account ID

## Security and Compliance

### HIPAA Compliance

- All data encrypted at rest using AWS KMS
- All data encrypted in transit using TLS 1.3
- Multi-factor authentication required
- Comprehensive audit logging with CloudTrail
- 7-year log retention for compliance
- Point-in-time recovery for all databases

### Security Features

- Cognito user pools with MFA
- API Gateway with JWT authorization
- KMS encryption for all sensitive data
- S3 bucket policies blocking public access
- CloudTrail for audit logging
- IAM roles with least privilege access

## Testing

### Frontend Tests

```bash
cd frontend
npm test
```

### Infrastructure Tests

```bash
cd infrastructure
npm test
```

### Property-Based Tests

The project uses fast-check for property-based testing to validate universal correctness properties across all inputs.

## Monitoring and Logging

- **CloudWatch**: Application and infrastructure monitoring
- **CloudTrail**: Audit logging for compliance
- **X-Ray**: Distributed tracing for API requests
- **CloudWatch Alarms**: Automated alerting for critical metrics

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
