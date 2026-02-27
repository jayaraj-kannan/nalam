# Encryption Configuration

## Overview

The Healthcare Monitoring App implements comprehensive end-to-end encryption to protect sensitive health data in compliance with HIPAA requirements (Requirement 8.1).

## Encryption Architecture

### Data at Rest (AES-256)

All data stored in AWS services is encrypted using AES-256 encryption:

1. **DynamoDB Tables**: Customer-managed encryption using AWS KMS
2. **S3 Buckets**: KMS encryption for health reports and documents
3. **Timestream**: KMS encryption for time-series health data
4. **CloudWatch Logs**: KMS encryption for audit logs

### Data in Transit (TLS 1.3)

All data transmitted between clients and servers uses TLS 1.3:

1. **API Gateway**: Enforces TLS 1.3 for all API endpoints
2. **CloudFront**: TLS 1.3 for content delivery
3. **IoT Core**: TLS 1.3 for device communication

### Key Management (AWS KMS)

AWS Key Management Service (KMS) provides centralized key management:

1. **Customer Master Key (CMK)**: Single CMK for all encryption operations
2. **Automatic Key Rotation**: Enabled for annual key rotation
3. **Key Policies**: Restrict key usage to authorized services and roles
4. **Audit Trail**: All key usage logged in CloudTrail

### Client-Side Encryption

Sensitive health data fields are encrypted before storage:

1. **Envelope Encryption**: Uses data encryption keys (DEKs) encrypted by KMS
2. **AES-256-GCM**: Authenticated encryption with associated data
3. **Field-Level Encryption**: Selective encryption of sensitive fields
4. **Metadata Storage**: Encryption metadata stored alongside encrypted data

## Implementation Details

### Encryption Service

The `encryption-service.ts` module provides encryption utilities:

```typescript
// Encrypt sensitive data
const { encrypted, dataKey, iv, authTag } = await encryptData(plaintext);

// Decrypt sensitive data
const plaintext = await decryptData(encrypted, dataKey, iv, authTag);

// Encrypt specific fields in an object
const encryptedData = await encryptSensitiveFields(data, ['ssn', 'medicalHistory']);

// Decrypt specific fields
const decryptedData = await decryptSensitiveFields(encryptedData, ['ssn', 'medicalHistory']);
```

### Sensitive Data Fields

The following fields are encrypted at the application level:

**User Profile Data:**
- Social Security Number (SSN)
- Date of Birth
- Emergency Contact Information
- Insurance Information

**Health Data:**
- Medical History
- Diagnoses
- Prescription Details
- Lab Results
- Doctor Notes

**Communication:**
- Family Messages (content)
- Emergency Alert Details

### KMS Key Configuration

The KMS key is configured with:

```typescript
const encryptionKey = new kms.Key(this, 'EncryptionKey', {
  description: 'Healthcare Monitoring App encryption key',
  enableKeyRotation: true, // Annual rotation
  removalPolicy: cdk.RemovalPolicy.RETAIN, // Never delete in production
});
```

### Database Encryption

All DynamoDB tables use customer-managed encryption:

```typescript
const table = new dynamodb.Table(this, 'Table', {
  encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
  encryptionKey: encryptionKey,
  pointInTimeRecovery: true, // Encrypted backups
});
```

### S3 Bucket Encryption

All S3 buckets enforce KMS encryption:

```typescript
const bucket = new s3.Bucket(this, 'Bucket', {
  encryption: s3.BucketEncryption.KMS,
  encryptionKey: encryptionKey,
  enforceSSL: true, // Require TLS for all operations
});
```

## Security Best Practices

### Key Rotation

- **Automatic Rotation**: KMS keys rotate annually
- **Manual Rotation**: Can be triggered for security incidents
- **Backward Compatibility**: Old keys retained for decryption

### Access Control

- **Least Privilege**: Only necessary services can use encryption keys
- **IAM Policies**: Restrict key access to specific roles
- **Key Policies**: Additional layer of access control

### Audit and Monitoring

- **CloudTrail**: All key usage logged
- **CloudWatch Alarms**: Alert on unusual key usage patterns
- **Audit Reports**: Regular review of encryption key access

## Compliance

### HIPAA Requirements

The encryption configuration meets HIPAA requirements:

1. **§164.312(a)(2)(iv)**: Encryption and decryption mechanisms
2. **§164.312(e)(2)(ii)**: Encryption of transmitted data
3. **§164.308(b)(1)**: Business associate agreements (BAA) with AWS

### Data Retention

- **Encryption Keys**: Retained for 7 years (HIPAA requirement)
- **Encrypted Data**: Retained according to data retention policies
- **Audit Logs**: 7-year retention for compliance

## Disaster Recovery

### Key Backup

- **Multi-Region**: KMS keys can be replicated to other regions
- **Key Material**: Backed up automatically by AWS
- **Recovery**: Keys can be restored from backups

### Data Recovery

- **Point-in-Time Recovery**: DynamoDB tables support PITR
- **S3 Versioning**: Previous versions of encrypted objects retained
- **Backup Encryption**: All backups encrypted with same key

## Performance Considerations

### Caching

- **Data Keys**: Cached for performance (with TTL)
- **Decrypted Data**: Never cached in plaintext
- **KMS Limits**: Rate limiting handled with exponential backoff

### Optimization

- **Envelope Encryption**: Reduces KMS API calls
- **Batch Operations**: Encrypt multiple fields with single data key
- **Lazy Decryption**: Decrypt only when needed

## Monitoring and Alerts

### CloudWatch Metrics

- **KMS API Calls**: Monitor encryption/decryption operations
- **Error Rates**: Alert on encryption failures
- **Latency**: Track encryption operation performance

### Security Alerts

- **Unauthorized Access**: Alert on denied key access attempts
- **Key Deletion**: Alert on key deletion attempts
- **Policy Changes**: Alert on key policy modifications

## Testing

### Unit Tests

- Test encryption/decryption functions
- Verify field-level encryption
- Test error handling

### Integration Tests

- End-to-end encryption workflows
- Key rotation scenarios
- Disaster recovery procedures

## References

- [AWS KMS Best Practices](https://docs.aws.amazon.com/kms/latest/developerguide/best-practices.html)
- [HIPAA Encryption Requirements](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [AWS HIPAA Compliance](https://aws.amazon.com/compliance/hipaa-compliance/)
