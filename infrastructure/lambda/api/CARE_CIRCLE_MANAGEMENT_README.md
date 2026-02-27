# Care Circle Management Service

## Overview

The Care Circle Management Service provides comprehensive functionality for managing care circles, family communication, health monitoring dashboards, and alert preferences in the Healthcare Monitoring App. This service enables elderly users (Primary Users) to share their health information with family members and caregivers (Secondary Users) while maintaining granular control over permissions and privacy.

## Requirements Implemented

- **Requirement 4.1**: Care circle member management and dashboard access
- **Requirement 4.3**: Weekly health summary generation for care circle members
- **Requirement 4.4**: Family communication system with messaging and read receipts
- **Requirement 4.5**: Care circle data visibility and medication adherence sharing
- **Requirement 8.5**: Granular permission management for data sharing
- **Requirement 9.2**: Alert preference customization by type and urgency level

## Features

### 1. Care Circle Data Management

**API Endpoints:**
- `GET /api/v1/care-circle/{userId}` - Get care circle members
- `POST /api/v1/care-circle/{userId}/members` - Add care circle member
- `DELETE /api/v1/care-circle/{userId}/members/{memberId}` - Remove care circle member
- `PUT /api/v1/care-circle/{userId}/members/{memberId}/permissions` - Update member permissions

**Functionality:**
- CRUD operations for care circle relationships
- Permission-based access control for each member
- Relationship tracking (spouse, child, sibling, caregiver, etc.)
- Audit logging for all care circle changes

**Permissions:**
- `canViewVitals` - View vital signs and health data
- `canViewMedications` - View medication schedules and adherence
- `canViewAppointments` - View medical appointments
- `canViewHealthRecords` - View complete health records
- `canReceiveAlerts` - Receive health alerts and notifications
- `canSendMessages` - Send messages to primary user
- `canManageDevices` - Manage health monitoring devices

### 2. Care Circle Invitation System

**API Endpoints:**
- `POST /api/v1/care-circle/{userId}/invite` - Send invitation
- `POST /api/v1/care-circle/invitations/{invitationId}/accept` - Accept invitation
- `POST /api/v1/care-circle/invitations/{invitationId}/reject` - Reject invitation

**Functionality:**
- Email-based invitation system with customizable messages
- 7-day invitation expiration
- Automatic care circle membership upon acceptance
- Permission configuration during invitation
- Invitation status tracking (pending, accepted, rejected, expired)

**Invitation Email Features:**
- Personalized invitation message
- Clear permission summary
- One-click acceptance link
- Expiration date display
- Professional HTML email template

### 3. Care Circle Dashboard Data API

**API Endpoint:**
- `GET /api/v1/care-circle/{userId}/dashboard` - Get comprehensive health dashboard

**Dashboard Data Includes:**
- **Primary User Info**: Name, ID, last active timestamp
- **Health Status**:
  - Latest vital signs (heart rate, blood pressure, oxygen saturation, temperature, weight)
  - Vitals trend analysis (improving, stable, declining, concerning, unknown)
  - Last recorded timestamp
- **Medications**:
  - Upcoming medications count (next 24 hours)
  - Adherence score (last 7 days)
  - Missed medications today
- **Appointments**:
  - Next appointment details (provider, type, scheduled time)
  - Upcoming appointments count
- **Alerts**:
  - Unacknowledged alerts count
  - Critical alerts count
  - Recent alerts (last 5)

**Access Control:**
- Permission-based data filtering
- Only authorized care circle members can access
- Primary user has full access to their own dashboard

### 4. Family Communication System

**API Endpoints:**
- `POST /api/v1/care-circle/{userId}/messages` - Send message
- `GET /api/v1/care-circle/{userId}/messages` - Get messages
- `POST /api/v1/care-circle/messages/{messageId}/read` - Mark message as read

**Functionality:**
- Bidirectional messaging between primary and secondary users
- Message subject and content support
- Read receipt tracking
- Message status (sent, delivered, read)
- Notification on message receipt
- Notification on read receipt
- Message history with conversation filtering
- 5000 character message limit

**Query Parameters:**
- `limit` - Maximum number of messages to return (default: 50)
- `conversationWith` - Filter messages by conversation partner

### 5. Weekly Health Summary Generation

**Lambda Function:**
- `generate-weekly-health-summary` - Scheduled EventBridge function

**Summary Includes:**
- **Vital Signs Statistics**:
  - Average heart rate, blood pressure, oxygen saturation
  - Total readings count
  - Trend analysis
- **Medication Adherence**:
  - Adherence score percentage
  - Total scheduled, taken, and missed doses
- **Appointments**:
  - Completed, upcoming, and missed appointments
- **Alerts**:
  - Total alerts and critical alerts
  - Alerts by type breakdown
- **Insights**:
  - Highlights (positive health indicators)
  - Concerns (areas needing attention)

**Delivery:**
- Automated weekly email to all care circle members
- Professional HTML email template with color-coded sections
- Personalized for each primary user
- Scheduled via EventBridge (weekly trigger)

### 6. Alert Preference Management

**API Endpoints:**
- `GET /api/v1/users/{userId}/alert-preferences` - Get alert preferences
- `PUT /api/v1/users/{userId}/alert-preferences` - Update alert preferences

**Preference Options:**
- **Notification Channels**: push, sms, email, voice
- **Quiet Hours**: Start and end time (HH:MM format)
- **Alert Types Configuration**:
  - vital_signs
  - medication
  - appointment
  - emergency
  - device
  - check_in
  - fall_detection
- **Per-Type Settings**:
  - Enabled/disabled toggle
  - Urgency levels (low, medium, high, critical)

**Filtering Logic:**
- Alert type must be enabled
- Alert severity must match configured urgency levels
- Critical alerts bypass quiet hours
- Non-critical alerts respect quiet hours
- Default to sending if no preferences configured

**Helper Functions:**
- `shouldSendAlert()` - Check if alert should be sent based on preferences
- `getNotificationChannels()` - Get channels for user based on preferences
- `filterCareCircleByPreferences()` - Filter care circle members by alert preferences

## Data Models

### CareCircleRelationship
```typescript
{
  primaryUserId: string;
  secondaryUserId: string;
  relationship: RelationshipType;
  permissions: PermissionSet;
  joinedAt: string;
  lastActive: string;
}
```

### CareCircleInvitation
```typescript
{
  invitationId: string;
  primaryUserId: string;
  email: string;
  relationship: RelationshipType;
  permissions: PermissionSet;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  message?: string;
}
```

### CareCircleMessage
```typescript
{
  messageId: string;
  primaryUserId: string;
  senderId: string;
  recipientId: string;
  subject?: string;
  content: string;
  sentAt: string;
  readAt?: string;
  status: 'sent' | 'delivered' | 'read';
}
```

### AlertPreferences
```typescript
{
  channels: NotificationChannel[];
  quietHours?: { start: string; end: string };
  alertTypes: {
    [key in AlertType]?: {
      enabled: boolean;
      urgencyLevels: AlertSeverity[];
    };
  };
}
```

## DynamoDB Tables

### CARE_CIRCLE Table
- **Partition Key**: primaryUserId
- **Sort Key**: secondaryUserId
- **Attributes**: relationship, permissions, joinedAt, lastActive

### CARE_CIRCLE_INVITATIONS Table
- **Partition Key**: invitationId
- **Attributes**: primaryUserId, email, relationship, permissions, status, createdAt, expiresAt, message

### CARE_CIRCLE_MESSAGES Table
- **Partition Key**: messageId
- **GSI**: recipientId-index (for querying received messages)
- **GSI**: senderId-index (for querying sent messages)
- **Attributes**: primaryUserId, senderId, recipientId, subject, content, sentAt, readAt, status

## Security & Privacy

### Access Control
- Primary users can only manage their own care circle
- Care circle members can only access data they have permissions for
- All access events are logged via audit logger
- Permission checks on every API call

### Data Encryption
- All data encrypted at rest in DynamoDB
- All data encrypted in transit via HTTPS
- Sensitive health data protected by permission system

### Audit Logging
- All care circle changes logged
- Permission updates tracked
- Message sending/reading logged
- Invitation actions recorded

## Testing

### Test Coverage
- Unit tests for all API endpoints
- Permission validation tests
- Invitation workflow tests
- Message sending and read receipt tests
- Alert preference validation tests
- Dashboard data aggregation tests

### Test File
- `__tests__/care-circle-management.test.ts` - Comprehensive test suite

### Test Results
- 14 tests passing
- All core functionality validated
- Edge cases covered (invalid inputs, unauthorized access, etc.)

## Integration Points

### Notification Service
- Message notifications via push, SMS, email
- Read receipt notifications
- Weekly summary email delivery

### Health Monitoring Service
- Dashboard aggregates vital signs from Timestream
- Medication adherence data integration
- Appointment schedule integration
- Alert history integration

### Alert Management Service
- Alert preference filtering
- Care circle notification routing
- Quiet hours enforcement

### Audit Logger
- All care circle operations logged
- Permission changes tracked
- Compliance with HIPAA requirements

## Usage Examples

### Adding a Care Circle Member
```typescript
POST /api/v1/care-circle/primary-user-123/members
{
  "secondaryUserId": "secondary-user-456",
  "relationship": "child",
  "permissions": {
    "canViewVitals": true,
    "canViewMedications": true,
    "canReceiveAlerts": true,
    "canSendMessages": true
  }
}
```

### Sending an Invitation
```typescript
POST /api/v1/care-circle/primary-user-123/invite
{
  "email": "family@example.com",
  "relationship": "spouse",
  "permissions": {
    "canViewVitals": true,
    "canViewMedications": true,
    "canViewAppointments": true,
    "canReceiveAlerts": true
  },
  "message": "Please join my care circle to help monitor my health"
}
```

### Sending a Message
```typescript
POST /api/v1/care-circle/primary-user-123/messages
{
  "recipientId": "secondary-user-456",
  "subject": "Feeling better today",
  "content": "Just wanted to let you know I'm feeling much better after taking my medication."
}
```

### Updating Alert Preferences
```typescript
PUT /api/v1/users/secondary-user-456/alert-preferences
{
  "channels": ["push", "sms", "email"],
  "quietHours": {
    "start": "22:00",
    "end": "07:00"
  },
  "alertTypes": {
    "vital_signs": {
      "enabled": true,
      "urgencyLevels": ["high", "critical"]
    },
    "medication": {
      "enabled": true,
      "urgencyLevels": ["medium", "high", "critical"]
    },
    "emergency": {
      "enabled": true,
      "urgencyLevels": ["critical"]
    }
  }
}
```

## Future Enhancements

1. **Video Calling**: Add video call capability between care circle members
2. **Photo Sharing**: Allow sharing of health-related photos and documents
3. **Group Messaging**: Enable group conversations within care circle
4. **Custom Reports**: Allow care circle members to generate custom health reports
5. **Medication Reminders**: Care circle members can set reminders for primary user
6. **Appointment Scheduling**: Care circle members can help schedule appointments
7. **Emergency Contacts**: Automatic notification of emergency contacts outside care circle
8. **Health Goals**: Collaborative health goal setting and tracking

## Deployment

### Environment Variables Required
- `CARE_CIRCLE_TABLE` - DynamoDB table name for care circle relationships
- `CARE_CIRCLE_INVITATIONS_TABLE` - DynamoDB table name for invitations
- `CARE_CIRCLE_MESSAGES_TABLE` - DynamoDB table name for messages
- `SES_FROM_EMAIL` - Email address for sending notifications
- `APP_URL` - Application URL for invitation links
- `TIMESTREAM_DATABASE` - Timestream database name for health data
- `TIMESTREAM_TABLE` - Timestream table name for vital signs

### EventBridge Schedule
- Weekly health summary: `cron(0 9 ? * MON *)` - Every Monday at 9 AM

## Conclusion

The Care Circle Management Service provides a comprehensive solution for family-centered health monitoring, enabling elderly users to safely share their health information with trusted family members and caregivers while maintaining control over their privacy and data access. The service integrates seamlessly with other healthcare monitoring components to provide a holistic view of the primary user's health status.
