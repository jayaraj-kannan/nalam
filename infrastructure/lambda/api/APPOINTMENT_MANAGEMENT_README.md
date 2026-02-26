# Appointment Management Service

## Overview

The Appointment Management Service provides comprehensive functionality for scheduling, tracking, and managing medical appointments for elderly users in the Healthcare Monitoring App. The service includes automated reminders, calendar integration, missed appointment detection, and care circle notifications.

**Requirements Implemented:** 6.1, 6.2, 6.3, 6.4, 6.5

## Features

### 1. Appointment Tracking System (Requirement 6.5)
- **Create Appointment**: Schedule new medical appointments with provider details, type, location, and preparation instructions
- **Get Appointments**: Retrieve all appointments or filter for upcoming appointments
- **Update Appointment**: Modify appointment details or status (scheduled, confirmed, completed, cancelled, missed)
- **Delete Appointment**: Remove appointments from the system

### 2. Appointment Reminder System (Requirements 6.1, 6.2)
- **Automated Reminders**: Send reminders at 24 hours and 2 hours before appointments
- **Multi-Channel Delivery**: Notifications via push, SMS, and email
- **Care Circle Sharing**: Automatically share appointment schedules with care circle members
- **Customizable Reminders**: Configure reminder times and channels per appointment

### 3. Calendar Integration (Requirement 6.3)
- **iCal Format**: Generate iCalendar (.ics) files for appointments
- **Google Calendar**: Compatible with Google Calendar import
- **Apple Calendar**: Compatible with Apple Calendar import
- **Bidirectional Sync**: Support for calendar application integration

### 4. Missed Appointment Detection (Requirement 6.4)
- **Automatic Detection**: Identify appointments that were not attended
- **Status Updates**: Automatically mark appointments as "missed"
- **Care Circle Alerts**: Notify family members when appointments are missed
- **Grace Period**: Consider appointment duration before marking as missed

## API Endpoints

### Create Appointment
```
POST /api/v1/appointments
```

**Request Body:**
```json
{
  "userId": "user-123",
  "provider": {
    "name": "Dr. Smith",
    "specialty": "Cardiology",
    "phone": "+1234567890",
    "email": "dr.smith@hospital.com"
  },
  "type": "checkup",
  "scheduledTime": "2024-12-25T10:00:00Z",
  "duration": 30,
  "reminders": {
    "enabled": true,
    "times": [24, 2],
    "channels": ["push", "sms", "email"]
  },
  "location": "123 Medical Center, Suite 200",
  "notes": "Annual checkup",
  "preparationInstructions": "Fasting required - no food 8 hours before"
}
```

**Response:**
```json
{
  "appointmentId": "appt-1234567890-abc123",
  "message": "Appointment created successfully"
}
```

### Get Appointments
```
GET /api/v1/appointments/{userId}
GET /api/v1/appointments/{userId}?upcoming=true
GET /api/v1/appointments/{userId}?startTime=2024-12-01T00:00:00Z&endTime=2024-12-31T23:59:59Z
```

**Response:**
```json
{
  "appointments": [
    {
      "id": "appt-123",
      "userId": "user-123",
      "provider": {
        "name": "Dr. Smith",
        "specialty": "Cardiology",
        "phone": "+1234567890"
      },
      "type": "checkup",
      "scheduledTime": "2024-12-25T10:00:00Z",
      "duration": 30,
      "status": "scheduled",
      "reminders": {
        "enabled": true,
        "times": [24, 2],
        "channels": ["push", "sms", "email"]
      },
      "location": "123 Medical Center",
      "notes": "Annual checkup"
    }
  ],
  "count": 1
}
```

### Update Appointment
```
PUT /api/v1/appointments/{userId}/{appointmentId}
```

**Request Body:**
```json
{
  "status": "confirmed",
  "notes": "Updated notes"
}
```

**Response:**
```json
{
  "message": "Appointment updated successfully"
}
```

### Delete Appointment
```
DELETE /api/v1/appointments/{userId}/{appointmentId}
```

**Response:**
```json
{
  "message": "Appointment deleted successfully"
}
```

### Get iCal Calendar File
```
GET /api/v1/appointments/{userId}/ical
GET /api/v1/appointments/{userId}/{appointmentId}/ical
```

**Response:**
- Content-Type: `text/calendar; charset=utf-8`
- Content-Disposition: `attachment; filename="appointments-{userId}.ics"`
- Body: iCalendar format file

## Event-Driven Architecture

### Events Published

#### AppointmentCreated
```json
{
  "Source": "healthcare.appointments",
  "DetailType": "AppointmentCreated",
  "Detail": {
    "appointmentId": "appt-123",
    "userId": "user-123",
    "scheduledTime": "2024-12-25T10:00:00Z",
    "type": "checkup",
    "provider": "Dr. Smith"
  }
}
```

#### AppointmentStatusChanged
```json
{
  "Source": "healthcare.appointments",
  "DetailType": "AppointmentStatusChanged",
  "Detail": {
    "appointmentId": "appt-123",
    "userId": "user-123",
    "status": "confirmed",
    "scheduledTime": "2024-12-25T10:00:00Z"
  }
}
```

### Scheduled Events

#### Send Appointment Reminders
- **Frequency**: Every 15 minutes
- **Function**: `send-appointment-reminders`
- **Purpose**: Check for appointments requiring reminders at 24h and 2h before scheduled time

#### Check Missed Appointments
- **Frequency**: Every hour
- **Function**: `check-missed-appointments`
- **Purpose**: Detect appointments that were not attended and notify care circle

## Lambda Functions

### API Functions

1. **create-appointment.ts**
   - Creates new appointment records
   - Validates input data
   - Publishes AppointmentCreated event
   - Sets default reminder configuration

2. **get-appointments.ts**
   - Retrieves appointments for a user
   - Supports filtering by date range
   - Returns upcoming appointments only

3. **update-appointment.ts**
   - Updates appointment details
   - Changes appointment status
   - Publishes AppointmentStatusChanged event

4. **delete-appointment.ts**
   - Removes appointment records
   - Soft delete option available

5. **get-appointment-ical.ts**
   - Generates iCalendar format files
   - Supports single or multiple appointments
   - Includes reminder alarms in iCal

### Event Functions

1. **send-appointment-reminders.ts**
   - Scans for upcoming appointments
   - Sends reminders at configured times (24h, 2h)
   - Notifies primary user and care circle
   - Multi-channel delivery (push, SMS, email)

2. **check-missed-appointments.ts**
   - Identifies missed appointments
   - Updates appointment status to "missed"
   - Notifies care circle members
   - Considers appointment duration

## Data Model

### AppointmentRecord
```typescript
interface AppointmentRecord {
  id: string;
  userId: string;
  provider: HealthcareProvider;
  type: AppointmentType;
  scheduledTime: Date;
  duration?: number; // minutes
  status: AppointmentStatus;
  reminders: ReminderSettings;
  location?: string;
  notes?: string;
  preparationInstructions?: string;
}

type AppointmentType = 
  | 'checkup' 
  | 'specialist' 
  | 'emergency' 
  | 'follow_up' 
  | 'procedure' 
  | 'lab_work';

type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'completed' 
  | 'cancelled' 
  | 'missed';

interface ReminderSettings {
  enabled: boolean;
  times: number[]; // Hours before appointment
  channels: NotificationChannel[];
}
```

## DynamoDB Schema

### Table: healthcare-appointments-{environment}

**Partition Key**: `userId` (String)
**Sort Key**: `appointmentId` (String)

**Global Secondary Index**: `scheduledTime-index`
- Partition Key: `userId`
- Sort Key: `scheduledTime`
- Purpose: Efficient querying of upcoming appointments

**Attributes**:
- `userId`: User ID
- `appointmentId`: Unique appointment identifier
- `provider`: Healthcare provider details (Map)
- `type`: Appointment type
- `scheduledTime`: ISO timestamp
- `duration`: Duration in minutes
- `status`: Current status
- `reminders`: Reminder configuration (Map)
- `location`: Appointment location
- `notes`: Additional notes
- `preparationInstructions`: Pre-appointment instructions

## Notification Flow

### Reminder Notifications

1. **EventBridge Scheduled Rule** triggers every 15 minutes
2. **send-appointment-reminders** Lambda function:
   - Scans all users with appointments
   - Checks for appointments within reminder windows (24h, 2h)
   - Sends notifications to primary user
   - Shares with care circle members (if permissions allow)
3. **Notification Service** delivers via multiple channels
4. **Retry Logic** attempts up to 3 times for failed deliveries

### Missed Appointment Notifications

1. **EventBridge Scheduled Rule** triggers every hour
2. **check-missed-appointments** Lambda function:
   - Scans appointments from past 7 days
   - Identifies appointments past their end time with status "scheduled" or "confirmed"
   - Updates status to "missed"
   - Notifies care circle members
3. **Care Circle Alert** sent via push, SMS, and email

## Calendar Integration

### iCal Format Support

The service generates RFC 5545 compliant iCalendar files with:
- Event details (summary, description, location)
- Start and end times
- Reminder alarms (VALARM components)
- Status information
- Unique identifiers (UID)

### Usage Examples

**Import to Google Calendar:**
1. Download .ics file from API
2. Open Google Calendar
3. Click Settings → Import & Export
4. Select downloaded .ics file

**Import to Apple Calendar:**
1. Download .ics file from API
2. Double-click the file
3. Calendar app opens automatically
4. Confirm import

**Subscribe to Calendar (Future Enhancement):**
- Provide calendar feed URL
- Auto-sync appointments
- Bidirectional updates

## Testing

### Unit Tests
Location: `infrastructure/lambda/api/__tests__/appointment-management.test.ts`

**Test Coverage:**
- ✓ Create appointment with valid data
- ✓ Reject appointment with missing fields
- ✓ Reject appointment with past scheduled time
- ✓ Reject appointment with invalid type
- ✓ Get all appointments for user
- ✓ Get upcoming appointments only
- ✓ Update appointment status
- ✓ Reject invalid status
- ✓ Delete appointment
- ✓ Generate iCal for single appointment
- ✓ Generate iCal for all user appointments
- ✓ Reminder timing validation
- ✓ Missed appointment detection

**Run Tests:**
```bash
cd infrastructure
npm test -- appointment-management.test.ts
```

## Security & Compliance

### HIPAA Compliance
- **Encryption at Rest**: DynamoDB tables encrypted with AWS KMS
- **Encryption in Transit**: TLS 1.3 for all API communications
- **Audit Logging**: All appointment access logged to CloudWatch
- **Access Control**: Permission-based access for care circle members

### Authorization
- Users can only access their own appointments
- Care circle members require `canViewAppointments` permission
- API Gateway authorizer validates JWT tokens
- Lambda functions verify user permissions

## Error Handling

### Common Errors

**400 Bad Request**
- Missing required fields
- Invalid appointment type
- Past scheduled time
- Invalid date format

**404 Not Found**
- Appointment not found
- User not found

**500 Internal Server Error**
- Database connection issues
- Event publishing failures
- Notification delivery failures

### Retry Logic
- Failed notifications: Up to 3 retries
- EventBridge events: 2 retries with exponential backoff
- DynamoDB operations: Automatic retry with AWS SDK

## Performance Considerations

### Optimization Strategies
1. **DynamoDB GSI**: Fast queries for upcoming appointments
2. **Batch Processing**: Process multiple users in parallel
3. **Connection Pooling**: Reuse database connections
4. **Caching**: Cache user preferences and care circle data
5. **Pagination**: Limit query results to prevent timeouts

### Scalability
- Serverless architecture auto-scales with demand
- DynamoDB on-demand pricing for variable workloads
- EventBridge handles high event volumes
- SNS/SES scale automatically for notifications

## Future Enhancements

1. **Video Appointment Integration**: Support for telemedicine appointments
2. **Appointment Rescheduling**: Automated rescheduling suggestions
3. **Provider Availability**: Check provider schedules before booking
4. **Transportation Integration**: Coordinate rides to appointments
5. **Insurance Verification**: Validate insurance coverage
6. **Appointment History**: Detailed history with outcomes
7. **Recurring Appointments**: Support for regular checkups
8. **Waitlist Management**: Notify when earlier slots available

## Monitoring & Alerts

### CloudWatch Metrics
- Appointment creation rate
- Reminder delivery success rate
- Missed appointment count
- API latency and error rates

### Alarms
- High error rate (> 5%)
- Notification delivery failures
- Lambda function timeouts
- DynamoDB throttling

## Support & Troubleshooting

### Common Issues

**Reminders not sent:**
- Check EventBridge rule is enabled
- Verify reminder configuration in appointment
- Check notification service logs

**Missed appointments not detected:**
- Verify EventBridge scheduled rule
- Check appointment status
- Review Lambda function logs

**Calendar import fails:**
- Validate iCal format
- Check date/time formatting
- Verify calendar app compatibility

### Logs
All Lambda functions log to CloudWatch Logs:
- `/aws/lambda/create-appointment`
- `/aws/lambda/send-appointment-reminders`
- `/aws/lambda/check-missed-appointments`

## Contact

For questions or issues with the Appointment Management Service, please refer to the main project documentation or contact the development team.
