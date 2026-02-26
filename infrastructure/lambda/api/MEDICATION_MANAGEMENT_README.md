# Medication Management Service

## Overview

The Medication Management Service provides comprehensive medication tracking, reminder, and adherence monitoring capabilities for the Healthcare Monitoring App. This service helps elderly users manage their medications effectively while keeping their care circle informed.

## Requirements Implemented

- **Requirement 2.1**: Medication reminders at scheduled times
- **Requirement 2.2**: Medication adherence tracking and confirmation
- **Requirement 2.3**: Missed medication detection and care circle notifications
- **Requirement 2.4**: Medication data storage and management
- **Requirement 2.5**: Adherence compliance alerts (below 80% threshold)
- **Requirement 4.5**: Care circle integration for medication data sharing

## Components

### API Endpoints

#### 1. Schedule Medication
**File**: `schedule-medication.ts`
**Endpoint**: `POST /api/v1/medications/schedule`
**Purpose**: Create a new medication schedule for a user

**Request Body**:
```json
{
  "userId": "string",
  "medication": {
    "id": "string",
    "name": "string",
    "dosage": "string",
    "frequency": "string",
    "scheduledTimes": ["HH:MM"],
    "startDate": "ISO date",
    "endDate": "ISO date (optional)",
    "prescribedBy": "string (optional)",
    "specialInstructions": "string (optional)"
  },
  "scheduledTime": "ISO timestamp"
}
```

**Response**:
```json
{
  "medicationId": "string",
  "message": "Medication scheduled successfully"
}
```

#### 2. Confirm Medication Taken
**File**: `confirm-medication.ts`
**Endpoint**: `POST /api/v1/medications/confirm`
**Purpose**: Record that a medication was taken

**Request Body**:
```json
{
  "userId": "string",
  "medicationId": "string",
  "takenTime": "ISO timestamp (optional, defaults to now)",
  "notes": "string (optional)"
}
```

**Response**:
```json
{
  "message": "Medication confirmed as taken",
  "medicationId": "string",
  "takenTime": "ISO timestamp"
}
```

#### 3. Get Medications
**File**: `get-medications.ts`
**Endpoint**: `GET /api/v1/medications/{userId}`
**Purpose**: Retrieve all medications for a user

**Authorization**: Requires permission to view medications (care circle members)

**Response**:
```json
{
  "medications": [
    {
      "id": "string",
      "userId": "string",
      "medication": { /* Medication object */ },
      "scheduledTime": "ISO timestamp",
      "takenTime": "ISO timestamp (optional)",
      "status": "scheduled | taken | missed | skipped",
      "adherenceScore": "number",
      "notes": "string (optional)"
    }
  ],
  "count": "number"
}
```

#### 4. Get Medication Adherence
**File**: `get-medication-adherence.ts`
**Endpoint**: `GET /api/v1/medications/{userId}/adherence`
**Purpose**: Get adherence statistics for a user

**Authorization**: Requires permission to view medications

**Response**:
```json
{
  "userId": "string",
  "adherence": {
    "adherenceScore": "number (0-100)",
    "totalMedications": "number",
    "takenCount": "number",
    "missedCount": "number",
    "scheduledCount": "number",
    "skippedCount": "number",
    "windowDays": 7
  },
  "message": "Good medication adherence | Medication adherence needs improvement"
}
```

#### 5. Get Care Circle Medication Summary
**File**: `get-care-circle-medication-summary.ts`
**Endpoint**: `GET /api/v1/care-circle/{userId}/medications/summary`
**Purpose**: Get medication summary for care circle members

**Authorization**: Requires permission to view medications

**Response**:
```json
{
  "userId": "string",
  "summary": {
    "upcomingMedications": [
      {
        "medicationName": "string",
        "dosage": "string",
        "scheduledTime": "ISO timestamp",
        "status": "string"
      }
    ],
    "recentActivity": [
      {
        "medicationName": "string",
        "dosage": "string",
        "scheduledTime": "ISO timestamp",
        "takenTime": "ISO timestamp (optional)",
        "status": "string"
      }
    ],
    "adherenceScore": "number",
    "missedCount": "number",
    "takenCount": "number"
  },
  "generatedAt": "ISO timestamp"
}
```

### Event Handlers

#### 1. Send Medication Reminders
**File**: `events/send-medication-reminders.ts`
**Trigger**: EventBridge scheduled rule (every 5 minutes recommended)
**Purpose**: Send medication reminders to users at scheduled times

**Functionality**:
- Scans all users with medications
- Checks for medications scheduled within the next 5 minutes
- Sends multi-channel notifications (push, SMS, email)
- Uses user's preferred notification channels

**Event Structure**:
```json
{
  "source": "healthcare.medication",
  "detail-type": "MedicationReminderCheck",
  "detail": {
    "checkTime": "ISO timestamp (optional)"
  }
}
```

#### 2. Check Medication Adherence
**File**: `events/check-medication-adherence.ts`
**Trigger**: EventBridge scheduled rule (every 30 minutes recommended)
**Purpose**: Monitor medication adherence and detect missed medications

**Functionality**:
- Detects medications missed by 30+ minutes
- Updates medication status to "missed"
- Notifies care circle members of missed medications
- Calculates weekly adherence scores
- Generates compliance alerts when adherence < 80%

**Event Structure**:
```json
{
  "source": "healthcare.medication",
  "detail-type": "AdherenceCheck",
  "detail": {
    "checkTime": "ISO timestamp (optional)"
  }
}
```

### Data Layer

**File**: `shared/data-access/medications.ts`

**Functions**:
- `createMedicationRecord()`: Create new medication record
- `getMedicationRecord()`: Get single medication record
- `getMedicationsByUser()`: Get all medications for a user
- `updateMedicationStatus()`: Update medication status (taken, missed, skipped)
- `updateAdherenceScore()`: Update adherence score
- `deleteMedicationRecord()`: Delete medication record

### Integration with Health Reports

The medication data is integrated into health reports generated by `generate-health-report.ts`:

**Features**:
- Medication adherence section in PDF reports
- Adherence score, taken count, missed count
- Recommendations when adherence < 80%
- Included in weekly, monthly, and quarterly reports

## Adherence Monitoring

### Thresholds
- **Missed Medication**: 30 minutes past scheduled time
- **Adherence Compliance**: 80% over 7 days
- **Calculation Window**: 7 days (configurable)

### Alert Severity
- **Missed Medication**: Medium severity
- **Low Adherence (<80%)**: High severity

### Notifications
- **Channels**: Push, SMS, Email
- **Recipients**: Primary user and care circle members
- **Timing**: 
  - Reminders: At scheduled time (within 5-minute window)
  - Missed alerts: 30 minutes after scheduled time
  - Compliance alerts: When adherence drops below 80%

## Care Circle Integration

Care circle members with appropriate permissions can:
- View medication schedules
- See adherence statistics
- Receive notifications for missed medications
- Access medication summaries
- View medication data in health reports

## Security & Compliance

- **Authorization**: Permission-based access control
- **Audit Logging**: All medication actions logged
- **Data Encryption**: At rest and in transit
- **HIPAA Compliance**: Audit trail maintained

## EventBridge Configuration

### Recommended Schedule Rules

1. **Medication Reminders**:
   - Rate: `rate(5 minutes)`
   - Target: `send-medication-reminders` Lambda
   - Purpose: Check for upcoming medications every 5 minutes

2. **Adherence Monitoring**:
   - Rate: `rate(30 minutes)`
   - Target: `check-medication-adherence` Lambda
   - Purpose: Check for missed medications and calculate adherence

## Testing

### Unit Tests
- Test medication CRUD operations
- Test adherence calculation logic
- Test notification delivery
- Test permission checks

### Integration Tests
- Test end-to-end medication scheduling
- Test reminder delivery workflow
- Test missed medication detection
- Test care circle notifications

## Future Enhancements

1. **Medication Interactions**: Check for drug interactions
2. **Refill Reminders**: Alert when medication supply is low
3. **Pharmacy Integration**: Direct prescription refills
4. **Medication History**: Track medication changes over time
5. **Smart Scheduling**: ML-based optimal reminder times
6. **Voice Confirmation**: Voice-based medication confirmation for elderly users

## Deployment Notes

1. Ensure EventBridge rules are created for both reminder and adherence checks
2. Configure SNS topics for medication notifications
3. Set up appropriate IAM permissions for Lambda functions
4. Configure DynamoDB table for medications with proper indexes
5. Enable CloudWatch logging for monitoring and debugging
