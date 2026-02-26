# Configuration Guide

This document describes the configuration options for the Healthcare Monitoring App.

## AWS Services Configuration

### Amazon Cognito

**Primary User Pool**
- Purpose: Authentication for elderly users (primary users)
- MFA: Required (SMS and TOTP)
- Password Policy: 12+ characters, mixed case, numbers, symbols
- Account Recovery: Email only

**Secondary User Pool**
- Purpose: Authentication for caregivers (secondary users)
- MFA: Required (SMS and TOTP)
- Password Policy: 12+ characters, mixed case, numbers, symbols
- Account Recovery: Email only

### Amazon DynamoDB

**Tables Created:**

1. `healthcare-users-{env}`
   - Partition Key: userId (String)
   - GSI: email-index
   - Encryption: Customer-managed KMS
   - Point-in-time recovery: Enabled

2. `healthcare-records-{env}`
   - Partition Key: userId (String)
   - Sort Key: timestamp (String)
   - GSI: type-timestamp-index
   - Encryption: Customer-managed KMS
   - Point-in-time recovery: Enabled

3. `healthcare-medications-{env}`
   - Partition Key: userId (String)
   - Sort Key: medicationId (String)
   - Encryption: Customer-managed KMS
   - Point-in-time recovery: Enabled

4. `healthcare-appointments-{env}`
   - Partition Key: userId (String)
   - Sort Key: appointmentId (String)
   - GSI: scheduledTime-index
   - Encryption: Customer-managed KMS
   - Point-in-time recovery: Enabled

5. `healthcare-alerts-{env}`
   - Partition Key: alertId (String)
   - Sort Key: timestamp (String)
   - GSI: userId-timestamp-index, status-index
   - Encryption: Customer-managed KMS
   - Point-in-time recovery: Enabled

6. `healthcare-care-circle-{env}`
   - Partition Key: primaryUserId (String)
   - Sort Key: secondaryUserId (String)
   - Encryption: Customer-managed KMS
   - Point-in-time recovery: Enabled

7. `healthcare-devices-{env}`
   - Partition Key: deviceId (String)
   - GSI: userId-index
   - Encryption: Customer-managed KMS
   - Point-in-time recovery: Enabled

### Amazon S3

**Buckets Created:**

1. `healthcare-reports-{env}-{account-id}`
   - Purpose: Health reports and documents
   - Encryption: KMS
   - Versioning: Enabled
   - Public Access: Blocked
   - Lifecycle: Intelligent Tiering after 30 days

2. `healthcare-audit-logs-{env}-{account-id}`
   - Purpose: CloudTrail audit logs
   - Encryption: KMS
   - Versioning: Enabled
   - Public Access: Blocked
   - Lifecycle: Glacier after 90 days, delete after 7 years

### AWS KMS

**Encryption Key**
- Purpose: Encrypt all sensitive data
- Key Rotation: Enabled (automatic annual rotation)
- Usage: DynamoDB, S3, SNS, CloudWatch Logs
- Retention: Retained in production, destroyed in dev/staging

### Amazon SNS

**Topics Created:**

1. `healthcare-alerts-{env}`
   - Purpose: Emergency and health alerts
   - Encryption: KMS

2. `healthcare-medication-reminders-{env}`
   - Purpose: Medication reminder notifications
   - Encryption: KMS

3. `healthcare-appointment-reminders-{env}`
   - Purpose: Appointment reminder notifications
   - Encryption: KMS

### Amazon API Gateway

**API Configuration:**
- Name: `healthcare-monitoring-api-{env}`
- Type: REST API
- Stage: {env} (dev/staging/prod)
- Tracing: AWS X-Ray enabled
- Logging: Full request/response logging
- Metrics: CloudWatch metrics enabled
- CORS: Enabled for all origins (configure for production)
- Authorizers: Cognito User Pool authorizers

### AWS CloudTrail

**Audit Trail Configuration:**
- Multi-region: Enabled
- Global service events: Enabled
- File validation: Enabled
- CloudWatch Logs: Enabled
- Log retention: 10 years
- S3 lifecycle: Glacier after 90 days, delete after 7 years

### Amazon EventBridge

**Event Bus:**
- Name: `healthcare-events-{env}`
- Purpose: Event-driven architecture for alerts, reminders, and notifications

## Environment Variables

### Frontend (.env)

```bash
# Environment
VITE_ENVIRONMENT=dev|staging|prod

# AWS Configuration
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=<cognito-user-pool-id>
VITE_USER_POOL_CLIENT_ID=<cognito-client-id>

# API Configuration
VITE_API_URL=<api-gateway-url>
```

### Infrastructure (.env)

```bash
# AWS Configuration
CDK_DEFAULT_ACCOUNT=<aws-account-id>
CDK_DEFAULT_REGION=us-east-1

# Environment
ENVIRONMENT=dev|staging|prod
```

## HIPAA Compliance Configuration

### Encryption

- **At Rest**: All data encrypted using AWS KMS with customer-managed keys
- **In Transit**: TLS 1.3 for all API communications
- **Key Rotation**: Automatic annual rotation enabled

### Audit Logging

- **CloudTrail**: All API calls logged
- **CloudWatch**: Application logs retained for 10 years
- **Access Logs**: All data access events logged with timestamps
- **Retention**: 7 years minimum for HIPAA compliance

### Access Control

- **MFA**: Required for all users
- **Password Policy**: Strong passwords enforced
- **Session Management**: Automatic timeout after inactivity
- **Authorization**: Role-based access control (RBAC)

### Data Retention

- **Active Data**: Retained indefinitely in DynamoDB
- **Audit Logs**: 7 years in S3 (Glacier after 90 days)
- **Backups**: Point-in-time recovery for 35 days
- **Deletion**: Secure deletion with verification

## Monitoring Configuration

### CloudWatch Alarms

Configure alarms for:
- API Gateway 4xx/5xx error rates
- Lambda function errors and throttles
- DynamoDB read/write capacity
- SNS delivery failures
- Cognito authentication failures

### CloudWatch Dashboards

Create dashboards for:
- API performance metrics
- User authentication metrics
- Alert delivery metrics
- Database performance
- Cost monitoring

## Security Configuration

### IAM Roles

Each Lambda function has a dedicated IAM role with least-privilege access:
- DynamoDB: Read/write access to specific tables only
- S3: Access to specific buckets only
- KMS: Decrypt/encrypt permissions
- SNS: Publish permissions to specific topics
- CloudWatch: Log writing permissions

### API Gateway Security

- Rate limiting: 1000 requests per second per user
- Throttling: 5000 requests per second burst
- API keys: Required for external integrations
- WAF: Configure AWS WAF for production

### Network Security

- VPC: Lambda functions in VPC (optional for enhanced security)
- Security Groups: Restrict inbound/outbound traffic
- NACLs: Network-level access control

## Cost Optimization

### DynamoDB

- On-demand billing for unpredictable workloads
- Provisioned capacity for predictable workloads
- Auto-scaling enabled

### Lambda

- Memory optimization: Right-size function memory
- Provisioned concurrency: Only for critical functions
- Reserved concurrency: Prevent runaway costs

### S3

- Lifecycle policies: Move to cheaper storage classes
- Intelligent Tiering: Automatic cost optimization
- Delete old versions: Reduce storage costs

## Backup and Recovery

### Automated Backups

- DynamoDB: Point-in-time recovery (35 days)
- S3: Versioning enabled
- CloudTrail: Logs retained for 7 years

### Manual Backups

- DynamoDB: On-demand backups before major changes
- S3: Cross-region replication for critical data
- Configuration: Export CloudFormation templates

### Recovery Procedures

- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour
- Disaster Recovery: Multi-region deployment for production

## Performance Configuration

### API Gateway

- Caching: Enable for frequently accessed endpoints
- Compression: Enable response compression
- Edge-optimized: Use CloudFront for global distribution

### Lambda

- Memory: 512MB-1024MB for most functions
- Timeout: 30 seconds for API functions, 5 minutes for batch
- Concurrency: Reserved concurrency for critical functions

### DynamoDB

- Read/write capacity: Auto-scaling enabled
- DAX: Consider for read-heavy workloads
- Global tables: Multi-region replication for production

## Compliance Checklist

- [x] Data encrypted at rest (KMS)
- [x] Data encrypted in transit (TLS 1.3)
- [x] MFA required for all users
- [x] Audit logging enabled (CloudTrail)
- [x] Log retention 7+ years
- [x] Point-in-time recovery enabled
- [x] Access control implemented (RBAC)
- [x] Backup procedures documented
- [x] Disaster recovery plan documented
- [ ] Business Associate Agreement (BAA) signed with AWS
- [ ] Security assessment completed
- [ ] Penetration testing completed
- [ ] HIPAA compliance audit completed

## Support and Maintenance

### Regular Maintenance Tasks

- Weekly: Review CloudWatch alarms and logs
- Monthly: Review access logs and user activity
- Quarterly: Security assessment and updates
- Annually: HIPAA compliance audit

### Monitoring Checklist

- [ ] CloudWatch alarms configured
- [ ] CloudWatch dashboards created
- [ ] SNS notifications for critical alerts
- [ ] Cost monitoring and budgets set
- [ ] Performance baselines established

### Update Procedures

1. Test changes in development environment
2. Deploy to staging for validation
3. Schedule production deployment
4. Monitor for issues post-deployment
5. Rollback if necessary
