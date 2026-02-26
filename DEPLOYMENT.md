# Deployment Guide

This guide provides detailed instructions for deploying the Healthcare Monitoring App to AWS.

## Prerequisites

1. **AWS Account**: Active AWS account with appropriate permissions
2. **AWS CLI**: Installed and configured with credentials
3. **Node.js**: Version 18.x or later
4. **AWS CDK**: Installed globally (`npm install -g aws-cdk`)

## Initial Setup

### 1. Configure AWS Credentials

```bash
aws configure
```

Provide:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)
- Default output format (json)

### 2. Bootstrap CDK

Bootstrap CDK in your AWS account (one-time setup per account/region):

```bash
cd infrastructure
npx cdk bootstrap aws://ACCOUNT-ID/REGION
```

Replace `ACCOUNT-ID` with your AWS account ID and `REGION` with your target region.

## Environment Deployment

### Development Environment

```bash
cd infrastructure

# Review changes
npx cdk diff HealthcareMonitoring-Dev

# Deploy
npx cdk deploy HealthcareMonitoring-Dev
```

### Staging Environment

```bash
cd infrastructure

# Review changes
npx cdk diff HealthcareMonitoring-Staging

# Deploy
npx cdk deploy HealthcareMonitoring-Staging
```

### Production Environment

```bash
cd infrastructure

# Review changes
npx cdk diff HealthcareMonitoring-Prod

# Deploy with extra confirmation
npx cdk deploy HealthcareMonitoring-Prod --require-approval broadening
```

## Post-Deployment Configuration

### 1. Retrieve Stack Outputs

After deployment, CDK will output important values:

```bash
# Get outputs for a specific stack
aws cloudformation describe-stacks \
  --stack-name HealthcareMonitoring-Dev \
  --query 'Stacks[0].Outputs'
```

Key outputs:
- `PrimaryUserPoolId`: Cognito User Pool ID for primary users
- `PrimaryUserPoolClientId`: Cognito Client ID for primary users
- `SecondaryUserPoolId`: Cognito User Pool ID for secondary users
- `SecondaryUserPoolClientId`: Cognito Client ID for secondary users
- `ApiUrl`: API Gateway endpoint URL
- `ReportsBucketName`: S3 bucket name for health reports
- `EncryptionKeyId`: KMS key ID for encryption

### 2. Configure Frontend Environment

Update `frontend/.env` with the stack outputs:

```bash
VITE_ENVIRONMENT=dev
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=<PrimaryUserPoolId>
VITE_USER_POOL_CLIENT_ID=<PrimaryUserPoolClientId>
VITE_API_URL=<ApiUrl>
```

### 3. Deploy Frontend

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to S3 (create bucket first if needed)
aws s3 mb s3://healthcare-frontend-dev-ACCOUNT-ID
aws s3 sync dist/ s3://healthcare-frontend-dev-ACCOUNT-ID --delete

# Enable static website hosting
aws s3 website s3://healthcare-frontend-dev-ACCOUNT-ID \
  --index-document index.html \
  --error-document index.html
```

## CI/CD Setup

### GitHub Actions Configuration

1. Add the following secrets to your GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_ACCOUNT_ID`

2. Push to branches:
   - `develop` → Deploys to development
   - `main` → Deploys to staging and production

## Monitoring and Verification

### 1. Verify API Gateway

```bash
# Test API endpoint
curl <ApiUrl>/health
```

### 2. Check CloudWatch Logs

```bash
# List log groups
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/healthcare

# View recent logs
aws logs tail /aws/lambda/healthcare-function-name --follow
```

### 3. Verify DynamoDB Tables

```bash
# List tables
aws dynamodb list-tables

# Describe a specific table
aws dynamodb describe-table --table-name healthcare-users-dev
```

### 4. Check CloudTrail

```bash
# Verify audit logging is active
aws cloudtrail get-trail-status --name healthcare-audit-trail-dev
```

## Rollback Procedures

### Rollback Infrastructure

```bash
cd infrastructure

# Rollback to previous version
npx cdk deploy HealthcareMonitoring-Dev --rollback
```

### Rollback Frontend

```bash
# Restore previous S3 version
aws s3api list-object-versions \
  --bucket healthcare-frontend-dev-ACCOUNT-ID \
  --prefix index.html

# Restore specific version
aws s3api copy-object \
  --bucket healthcare-frontend-dev-ACCOUNT-ID \
  --copy-source healthcare-frontend-dev-ACCOUNT-ID/index.html?versionId=VERSION_ID \
  --key index.html
```

## Disaster Recovery

### Backup Procedures

1. **DynamoDB**: Point-in-time recovery is enabled automatically
2. **S3**: Versioning is enabled for all buckets
3. **CloudTrail**: Logs retained for 7 years

### Recovery Procedures

```bash
# Restore DynamoDB table to specific point in time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name healthcare-users-prod \
  --target-table-name healthcare-users-prod-restored \
  --restore-date-time 2024-01-01T00:00:00Z
```

## Cleanup

### Delete Development Environment

```bash
cd infrastructure
npx cdk destroy HealthcareMonitoring-Dev
```

**Warning**: This will delete all resources including data. Ensure backups are in place.

## Troubleshooting

### CDK Deployment Fails

1. Check AWS credentials: `aws sts get-caller-identity`
2. Verify CDK bootstrap: `cdk bootstrap --show-template`
3. Check CloudFormation events in AWS Console

### API Gateway 403 Errors

1. Verify Cognito authorizer configuration
2. Check JWT token validity
3. Verify API Gateway resource policies

### Lambda Function Errors

1. Check CloudWatch Logs
2. Verify IAM role permissions
3. Check environment variables

### DynamoDB Access Issues

1. Verify IAM permissions
2. Check encryption key access
3. Verify table exists in correct region

## Security Checklist

- [ ] MFA enabled for all AWS accounts
- [ ] CloudTrail logging enabled
- [ ] KMS encryption configured
- [ ] S3 buckets have public access blocked
- [ ] Cognito MFA required for users
- [ ] API Gateway rate limiting configured
- [ ] CloudWatch alarms set up
- [ ] Backup procedures tested
- [ ] Disaster recovery plan documented

## Support

For deployment issues:
1. Check CloudFormation stack events
2. Review CloudWatch logs
3. Consult AWS documentation
4. Open a GitHub issue with deployment logs
