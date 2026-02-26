# Alert Management Service

## Overview

The Alert Management Service provides comprehensive alert creation, processing, escalation, and notification capabilities for the Healthcare Monitoring App. It implements Requirements 1.3, 2.3, 2.5, 3.1, 3.2, 3.3, 3.5, 9.1, 9.3, 9.4, and 9.5.

## Architecture

The service follows an event-driven architecture using AWS EventBridge for decoupled alert processing:

```
Alert Creation → EventBridge → Notification Service → Multi-Channel Delivery
                     ↓
              Emergency Processing
                     ↓
              Escalation Logic
                     ↓
              Care Circle Notification
```

## Components

### API Lambda Functions

#### 1. Create Alert (`create-alert.ts`)
- **Endpoint**: `POST /api/v1/alerts`
- **Purpose**: Create new health alerts
- **Requirements**: 1.3, 2.3, 2.5, 3.1, 3.2

**Request Body**:
```json
{
  "userId": "user-123",
  "type": "vital_signs",
  "severity": "high",
  "message": "Heart rate above normal range",
  "relatedData": {
    "metric": "heart_rate",
    "value": 120
  }
}
```

**Response**:
```json
{
  "alertId": "alert-1234567890-abc123",
  "message": "Alert created successfully"
}
```

#### 2. Acknowledge Alert (`acknowledge-alert.ts`)
- **Endpoint**: `POST /api/v1/alerts/acknowledge`
- **Purpose**: Acknowledge alerts and notify care circle
- **Requirements**: 9.5

**Request Body**:
```json
{
  "alertId": "alert-1234567890-abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "acknowledgedBy": "user-456"
}
```

#### 3. Get Alerts (`get-alerts.ts`)
- **Endpoint**: `GET /api/v1/alerts/user/{userId}` or `GET /api/v1/alerts?status=pending`
- **Purpose**: Retrieve alerts with prioritization
- **Requirements**: 9.2, 9.3

**Query Parameters**:
- `status`: Filter by status (pending, acknowledged)
- `startTime`: Filter by start time
- `endTime`: Filter by end time
- `limit`: Maximum number of results (default: 50)

**Response**:
```json
{
  "alerts": [
    {
      "id": "alert-123",
      "userId": "user-123",
      "type": "vital_signs",
      "severity": "high",
      "message": "Heart rate above normal range",
      "timestamp": "2024-01-15T10:30:00Z",
      "acknowledged": false,
      "escalated": false
    }
  ],
  "count": 1
}
```

#### 4. Escalate Alert (`escalate-alert.ts`)
- **Endpoint**: `POST /api/v1/alerts/escalate`
- **Purpose**: Escalate alerts to higher notification levels
- **Requirements**: 3.1, 3.2

**Request Body**:
```json
{
  "alertId": "alert-1234567890-abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "escalationLevel": "emergency_contact"
}
```

**Escalation Levels**:
- `care_circle`: Notify all care circle members
- `emergency_contact`: Notify designated emergency contacts
- `emergency_services`: Provide information to emergency services

#### 5. Trigger Emergency (`trigger-emergency.ts`)
- **Endpoint**: `POST /api/v1/health/emergency`
- **Purpose**: Trigger emergency alerts with medical history
- **Requirements**: 3.3, 3.5

**Request Body**:
```json
{
  "userId": "user-123",
  "type": "fall",
  "severity": "critical",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "symptoms": ["dizziness", "chest pain"],
  "notes": "User pressed emergency button"
}
```

**Response**:
```json
{
  "emergencyId": "emergency-1234567890-xyz789",
  "alertId": "alert-1234567890-abc123",
  "message": "Emergency alert triggered successfully",
  "responders": 3
}
```

### Event Handlers

#### 1. Process Emergency Event (`events/process-emergency-event.ts`)
- **Event**: `EmergencyTriggered`
- **Purpose**: Process emergency events and coordinate response
- **Requirements**: 3.1, 3.2, 3.3, 3.5

#### 2. Send Alert Notifications (`events/send-alert-notifications.ts`)
- **Event**: `AlertCreated`, `AlertEscalated`
- **Purpose**: Send multi-channel notifications to care circle
- **Requirements**: 9.1, 9.2, 9.4

#### 3. Notify Alert Acknowledged (`events/notify-alert-acknowledged.ts`)
- **Event**: `AlertAcknowledged`
- **Purpose**: Notify care circle members when alerts are acknowledged
- **Requirements**: 9.5

### Shared Services

#### 1. Notification Service (`shared/notification-service.ts`)
- **Purpose**: Multi-channel notification delivery
- **Channels**: Push, SMS, Email
- **Features**:
  - 30-second delivery requirement
  - Automatic retry (up to 3 attempts)
  - Delivery confirmation tracking
  - User preference filtering

**Functions**:
- `sendNotification(request)`: Send notification to single recipient
- `sendNotificationToCareCircle(userIds, alert, channels)`: Send to multiple recipients

#### 2. Alert Prioritization (`shared/alert-prioritization.ts`)
- **Purpose**: Prioritize and consolidate alerts
- **Requirements**: 9.3

**Functions**:
- `calculateAlertPriority(alert)`: Calculate priority score
- `prioritizeAlerts(alerts)`: Sort alerts by priority
- `consolidateAlerts(alerts)`: Group related alerts
- `getAlertsNeedingEscalation(alerts)`: Identify alerts needing escalation

**Priority Factors**:
- Severity (critical > high > medium > low)
- Alert type (emergency > fall_detection > vital_signs > ...)
- Escalation status (+20 points)
- Acknowledgment status (+10 points if unacknowledged)
- Recency (newer alerts prioritized)

## EventBridge Rules

### 1. Emergency Triggered Rule
- **Source**: `healthcare.emergency`
- **Detail Type**: `EmergencyTriggered`
- **Target**: Process Emergency Event Lambda
- **Retry**: 2 attempts, 5-minute max age

### 2. Alert Created Rule
- **Source**: `healthcare.alerts`
- **Detail Type**: `AlertCreated`
- **Target**: Send Alert Notifications Lambda
- **Retry**: 3 attempts, 2-minute max age

### 3. Alert Escalated Rule
- **Source**: `healthcare.alerts`
- **Detail Type**: `AlertEscalated`
- **Target**: Send Alert Notifications Lambda
- **Retry**: 3 attempts, 2-minute max age

### 4. Alert Acknowledged Rule
- **Source**: `healthcare.alerts`
- **Detail Type**: `AlertAcknowledged`
- **Target**: Notify Alert Acknowledged Lambda
- **Retry**: 2 attempts, 5-minute max age

## Data Models

### HealthAlert
```typescript
interface HealthAlert {
  id: string;
  userId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  escalated: boolean;
  escalationLevel?: EscalationLevel;
  relatedData?: Record<string, unknown>;
}
```

### EmergencyEvent
```typescript
interface EmergencyEvent {
  id: string;
  userId: string;
  type: EmergencyType;
  timestamp: Date;
  location?: GeoLocation;
  vitals?: VitalSigns;
  symptoms?: string[];
  severity: EmergencySeverity;
  responders: string[];
  resolved: boolean;
  resolvedAt?: Date;
  notes?: string;
}
```

### NotificationResult
```typescript
interface NotificationResult {
  notificationId: string;
  alertId: string;
  recipient: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  retryCount: number;
}
```

## Alert Types

- `vital_signs`: Abnormal vital sign readings
- `medication`: Medication adherence issues
- `appointment`: Appointment reminders or missed appointments
- `emergency`: Emergency situations
- `device`: Device connectivity or malfunction
- `check_in`: Missed check-ins
- `fall_detection`: Fall detected by device

## Severity Levels

- `low`: Informational, no immediate action required
- `medium`: Attention needed, not urgent
- `high`: Urgent attention required
- `critical`: Immediate action required, potential emergency

## Notification Channels

- `push`: Push notifications (via SNS)
- `sms`: SMS text messages (via SNS)
- `email`: Email notifications (via SES)
- `voice`: Voice calls (future implementation)

## Alert Workflow

### 1. Normal Alert Flow
```
1. Anomaly detected or manual alert created
2. Alert stored in DynamoDB
3. EventBridge event published (AlertCreated)
4. Notification service retrieves care circle members
5. User preferences applied
6. Multi-channel notifications sent (within 30 seconds)
7. Delivery confirmation tracked
8. Failed notifications retried (up to 3 times)
```

### 2. Emergency Alert Flow
```
1. Emergency triggered (fall, manual, abnormal vitals)
2. Emergency event stored with medical history
3. EventBridge event published (EmergencyTriggered)
4. Emergency processing function coordinates response
5. Alert created with critical severity
6. All care circle members notified immediately
7. Emergency contacts notified if critical
8. Medical history prepared for emergency services
```

### 3. Alert Acknowledgment Flow
```
1. Care circle member acknowledges alert
2. Alert status updated in DynamoDB
3. EventBridge event published (AlertAcknowledged)
4. Other care circle members notified
5. Audit log entry created
```

### 4. Alert Escalation Flow
```
1. Alert remains unacknowledged for threshold time (30 min)
2. Escalation triggered automatically or manually
3. Alert escalation level updated
4. EventBridge event published (AlertEscalated)
5. Higher-level notifications sent
6. Emergency contacts or services notified if needed
```

## Configuration

### Environment Variables

- `ENVIRONMENT`: Deployment environment (dev, staging, prod)
- `EVENT_BUS_NAME`: EventBridge event bus name
- `ALERTS_TABLE`: DynamoDB alerts table name
- `USERS_TABLE`: DynamoDB users table name
- `CARE_CIRCLE_TABLE`: DynamoDB care circle table name
- `NOTIFICATIONS_TABLE`: DynamoDB notifications table name
- `EMERGENCY_EVENTS_TABLE`: DynamoDB emergency events table name
- `ALERT_TOPIC_ARN`: SNS topic ARN for alerts
- `SES_FROM_EMAIL`: Email address for sending notifications

### Notification Timing

- **Delivery Target**: 30 seconds from alert creation
- **Retry Interval**: Immediate, exponential backoff
- **Max Retries**: 3 attempts
- **Escalation Threshold**: 30 minutes unacknowledged

## Testing

### Unit Tests
- Alert creation and validation
- Notification delivery
- Priority calculation
- Alert consolidation

### Integration Tests
- End-to-end alert flow
- Multi-channel notification delivery
- EventBridge event routing
- Care circle notification

### Property-Based Tests (Optional)
- Emergency alert generation (Property 4)
- Emergency information provision (Property 16)
- Notification delivery (Property 6)
- Alert prioritization (Property 7)

## Security

- All alerts encrypted at rest (DynamoDB encryption)
- All notifications encrypted in transit (TLS)
- Audit logging for all alert operations
- Access control via Cognito and IAM
- HIPAA compliance maintained

## Monitoring

- CloudWatch metrics for alert creation rate
- Notification delivery success rate
- Average notification delivery time
- Failed notification count
- Alert acknowledgment rate
- Emergency event frequency

## Error Handling

- Failed notifications automatically retried
- Dead letter queue for unprocessable events
- CloudWatch alarms for high failure rates
- Graceful degradation for service outages
- User-friendly error messages

## Future Enhancements

- Voice call notifications
- Geofencing for location-based alerts
- Machine learning for alert prediction
- Integration with emergency services APIs
- Real-time alert dashboard
- Alert analytics and reporting
