# DynamoDB Data Access Layer

This directory contains the data access layer for all DynamoDB tables in the Healthcare Monitoring App. All data is encrypted at rest using AWS KMS (Requirement 8.1) and access is logged for HIPAA compliance (Requirement 8.4).

## Table Schemas

### 1. Users Table (`healthcare-users-{environment}`)

**Purpose:** Store primary and secondary user profiles, health profiles, and preferences.

**Schema:**
- **Partition Key:** `userId` (String)
- **Attributes:**
  - `profile`: UserProfile object
  - `healthProfile`: HealthProfile object (primary users only)
  - `careCircle`: Array of secondary user IDs (primary users only)
  - `primaryUsers`: Array of primary user IDs (secondary users only)
  - `preferences`: UserPreferences object
  - `alertPreferences`: AlertPreferences object (secondary users only)
  - `permissions`: PermissionSet object (secondary users only)
  - `devices`: Array of device IDs
  - `createdAt`: ISO timestamp
  - `lastActive`: ISO timestamp

**Global Secondary Indexes:**
- `email-index`: Partition key = `email` (String)
  - Use case: User lookup by email address

**Operations:**
- `createUser(user)`: Create a new user
- `getUser(userId)`: Get user by ID
- `getUserByEmail(email)`: Get user by email
- `updateUserProfile(userId, updates)`: Update user profile
- `updateLastActive(userId)`: Update last active timestamp
- `deleteUser(userId)`: Delete user

---

### 2. Health Records Table (`healthcare-records-{environment}`)

**Purpose:** Store all health-related records including vital signs, symptoms, and lab results.

**Schema:**
- **Partition Key:** `userId` (String)
- **Sort Key:** `timestamp` (String, ISO format)
- **Attributes:**
  - `id`: Unique record ID
  - `type`: HealthRecordType (vitals, medication, symptom, appointment, lab_result)
  - `data`: HealthData object (varies by type)
  - `source`: DataSource (manual, device, wearable)
  - `verified`: Boolean

**Global Secondary Indexes:**
- `type-timestamp-index`: Partition key = `type`, Sort key = `timestamp`
  - Use case: Query all records of a specific type across users

**Operations:**
- `createHealthRecord(record)`: Create a new health record
- `getHealthRecord(userId, timestamp)`: Get specific health record
- `getHealthRecordsByUser(userId, startTime?, endTime?, limit?)`: Get user's health records
- `getHealthRecordsByType(type, startTime?, endTime?, limit?)`: Get records by type
- `deleteHealthRecord(userId, timestamp)`: Delete health record

---

### 3. Medications Table (`healthcare-medications-{environment}`)

**Purpose:** Track medication schedules, adherence, and compliance.

**Schema:**
- **Partition Key:** `userId` (String)
- **Sort Key:** `medicationId` (String)
- **Attributes:**
  - `medication`: Medication object (name, dosage, frequency, etc.)
  - `scheduledTime`: ISO timestamp
  - `takenTime`: ISO timestamp (optional)
  - `status`: MedicationStatus (scheduled, taken, missed, skipped)
  - `adherenceScore`: Number (0-100)
  - `notes`: String (optional)

**Operations:**
- `createMedicationRecord(record)`: Create medication record
- `getMedicationRecord(userId, medicationId)`: Get specific medication record
- `getMedicationsByUser(userId, limit?)`: Get all medications for user
- `updateMedicationStatus(userId, medicationId, status, takenTime?, notes?)`: Update status
- `updateAdherenceScore(userId, medicationId, adherenceScore)`: Update adherence score
- `deleteMedicationRecord(userId, medicationId)`: Delete medication record

---

### 4. Appointments Table (`healthcare-appointments-{environment}`)

**Purpose:** Manage medical appointments and reminders.

**Schema:**
- **Partition Key:** `userId` (String)
- **Sort Key:** `appointmentId` (String)
- **Attributes:**
  - `provider`: HealthcareProvider object
  - `type`: AppointmentType (checkup, specialist, emergency, etc.)
  - `scheduledTime`: ISO timestamp
  - `duration`: Number (minutes)
  - `status`: AppointmentStatus (scheduled, confirmed, completed, cancelled, missed)
  - `reminders`: ReminderSettings object
  - `location`: String (optional)
  - `notes`: String (optional)
  - `preparationInstructions`: String (optional)

**Global Secondary Indexes:**
- `scheduledTime-index`: Partition key = `userId`, Sort key = `scheduledTime`
  - Use case: Query upcoming appointments chronologically

**Operations:**
- `createAppointment(appointment)`: Create new appointment
- `getAppointment(userId, appointmentId)`: Get specific appointment
- `getAppointmentsByUser(userId, limit?)`: Get all appointments for user
- `getUpcomingAppointments(userId, startTime?, endTime?, limit?)`: Get upcoming appointments
- `updateAppointmentStatus(userId, appointmentId, status, notes?)`: Update status
- `updateAppointment(userId, appointmentId, updates)`: Update appointment details
- `deleteAppointment(userId, appointmentId)`: Delete appointment

---

### 5. Alerts Table (`healthcare-alerts-{environment}`)

**Purpose:** Store health alerts, emergency events, and notifications.

**Schema:**
- **Partition Key:** `alertId` (String)
- **Sort Key:** `timestamp` (String, ISO format)
- **Attributes:**
  - `userId`: String
  - `type`: AlertType (vital_signs, medication, appointment, emergency, device, check_in, fall_detection)
  - `severity`: AlertSeverity (low, medium, high, critical)
  - `message`: String
  - `acknowledged`: Boolean
  - `acknowledgedBy`: String (optional)
  - `acknowledgedAt`: ISO timestamp (optional)
  - `escalated`: Boolean
  - `escalationLevel`: EscalationLevel (optional)
  - `status`: String (pending, acknowledged)
  - `relatedData`: Object (optional)

**Global Secondary Indexes:**
- `userId-timestamp-index`: Partition key = `userId`, Sort key = `timestamp`
  - Use case: Query all alerts for a specific user
- `status-index`: Partition key = `status`, Sort key = `timestamp`
  - Use case: Query all pending/acknowledged alerts

**Operations:**
- `createAlert(alert)`: Create new alert
- `getAlert(alertId, timestamp)`: Get specific alert
- `getAlertsByUser(userId, startTime?, endTime?, limit?)`: Get user's alerts
- `getAlertsByStatus(status, startTime?, endTime?, limit?)`: Get alerts by status
- `acknowledgeAlert(alertId, timestamp, acknowledgedBy)`: Acknowledge alert
- `escalateAlert(alertId, timestamp, escalationLevel)`: Escalate alert
- `deleteAlert(alertId, timestamp)`: Delete alert

---

### 6. Care Circle Table (`healthcare-care-circle-{environment}`)

**Purpose:** Manage relationships between primary users and their care circle members.

**Schema:**
- **Partition Key:** `primaryUserId` (String)
- **Sort Key:** `secondaryUserId` (String)
- **Attributes:**
  - `relationship`: RelationshipType (spouse, child, sibling, parent, friend, caregiver, etc.)
  - `permissions`: PermissionSet object
  - `joinedAt`: ISO timestamp
  - `lastActive`: ISO timestamp

**Operations:**
- `addCareCircleMember(primaryUserId, secondaryUserId, relationship, permissions)`: Add member
- `getCareCircleMember(primaryUserId, secondaryUserId)`: Get specific member
- `getCareCircleMembers(primaryUserId)`: Get all care circle members
- `updateCareCirclePermissions(primaryUserId, secondaryUserId, permissions)`: Update permissions
- `updateCareCircleRelationship(primaryUserId, secondaryUserId, relationship)`: Update relationship
- `updateCareCircleLastActive(primaryUserId, secondaryUserId)`: Update last active
- `removeCareCircleMember(primaryUserId, secondaryUserId)`: Remove member
- `checkPermission(primaryUserId, secondaryUserId, permission)`: Check specific permission

---

### 7. Devices Table (`healthcare-devices-{environment}`)

**Purpose:** Track registered health devices and their connection status.

**Schema:**
- **Partition Key:** `deviceId` (String)
- **Attributes:**
  - `userId`: String
  - `type`: DeviceType (blood_pressure, glucose_meter, pulse_oximeter, fitness_tracker, etc.)
  - `manufacturer`: String
  - `model`: String
  - `capabilities`: Array of DeviceCapability
  - `connectionType`: ConnectionType (bluetooth, wifi, cellular)
  - `status`: DeviceStatus (connected, disconnected, syncing, error)
  - `lastSync`: ISO timestamp (optional)
  - `batteryLevel`: Number (optional)
  - `firmwareVersion`: String (optional)

**Global Secondary Indexes:**
- `userId-index`: Partition key = `userId`
  - Use case: Query all devices for a specific user

**Operations:**
- `registerDevice(device)`: Register new device
- `getDevice(deviceId)`: Get device by ID
- `getDevicesByUser(userId)`: Get all devices for user
- `updateDeviceStatus(deviceId, status, lastSync?)`: Update device status
- `updateDeviceBattery(deviceId, batteryLevel)`: Update battery level
- `updateDeviceSync(deviceId)`: Update last sync timestamp
- `updateDevice(deviceId, updates)`: Update device details
- `deleteDevice(deviceId)`: Delete device

---

## Security Features

### Encryption at Rest (Requirement 8.1)
All tables use AWS KMS customer-managed keys for encryption at rest. The encryption key is configured with automatic rotation enabled.

### Audit Logging (Requirement 8.4)
All data access operations are logged through AWS CloudTrail for HIPAA compliance. Logs are retained for 7 years and stored in encrypted S3 buckets.

### Point-in-Time Recovery
All tables have point-in-time recovery enabled to protect against accidental data loss.

### Access Control
Data access is controlled through:
1. IAM roles for Lambda functions
2. Care circle permissions for data sharing
3. Cognito user authentication
4. API Gateway authorization

---

## Usage Example

```typescript
import {
  createUser,
  getUser,
  createHealthRecord,
  getHealthRecordsByUser,
  createAlert,
  getAlertsByUser,
} from './data-access';

// Create a new primary user
await createUser({
  id: 'user-123',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    dateOfBirth: '1950-01-01',
  },
  healthProfile: {
    conditions: [],
    medications: [],
    allergies: ['penicillin'],
    emergencyContacts: [],
    healthcareProviders: [],
    baselineVitals: {
      heartRate: { min: 60, max: 100 },
      bloodPressure: {
        systolic: { min: 90, max: 140 },
        diastolic: { min: 60, max: 90 },
      },
      temperature: { min: 97.0, max: 99.0 },
      oxygenSaturation: { min: 95, max: 100 },
      weight: { min: 150, max: 200 },
    },
  },
  careCircle: [],
  preferences: {
    fontSize: 'large',
    contrast: 'high',
    voiceNavigation: true,
    screenReader: false,
    language: 'en',
    timezone: 'America/New_York',
    notificationChannels: ['push', 'sms'],
  },
  devices: [],
  createdAt: new Date(),
  lastActive: new Date(),
});

// Record vital signs
const recordId = await createHealthRecord({
  userId: 'user-123',
  timestamp: new Date(),
  type: 'vitals',
  data: {
    heartRate: 75,
    bloodPressure: { systolic: 120, diastolic: 80 },
    temperature: 98.6,
    oxygenSaturation: 98,
    timestamp: new Date(),
    source: 'device',
  },
  source: 'device',
  verified: true,
});

// Create an alert
const alertId = await createAlert({
  userId: 'user-123',
  type: 'vital_signs',
  severity: 'high',
  message: 'Blood pressure reading is elevated',
  timestamp: new Date(),
  acknowledged: false,
  escalated: false,
});
```

---

## Environment Variables

The data access layer requires the following environment variables:

- `AWS_REGION`: AWS region (e.g., 'us-east-1')
- `USERS_TABLE`: Users table name
- `HEALTH_RECORDS_TABLE`: Health records table name
- `MEDICATIONS_TABLE`: Medications table name
- `APPOINTMENTS_TABLE`: Appointments table name
- `ALERTS_TABLE`: Alerts table name
- `CARE_CIRCLE_TABLE`: Care circle table name
- `DEVICES_TABLE`: Devices table name

These are automatically set by the CDK stack during deployment.
