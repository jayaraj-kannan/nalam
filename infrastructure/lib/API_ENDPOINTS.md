# Healthcare Monitoring App - API Endpoints

## Overview

This document provides a comprehensive reference for all API endpoints in the Healthcare Monitoring App. All endpoints are secured with Cognito authentication unless otherwise noted.

**Base URL:** `https://{api-id}.execute-api.{region}.amazonaws.com/{environment}/`

## Authentication

### Public Endpoints (No Authorization Required)

#### POST /auth/register
Register a new user (Primary or Secondary).

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "userType": "primary" | "secondary",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1950-01-01",
    "phone": "+1234567890"
  },
  "phoneNumber": "+1234567890"
}
```

**Response:** 200 OK
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "userType": "primary",
  "message": "Registration successful. Please check your email to verify your account.",
  "emailVerificationRequired": true
}
```

#### POST /auth/login
Login user and receive authentication tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "userType": "primary" | "secondary"
}
```

**Response:** 200 OK
```json
{
  "accessToken": "jwt-token",
  "idToken": "jwt-token",
  "refreshToken": "jwt-token",
  "expiresIn": 3600
}
```

#### POST /auth/refresh
Refresh authentication token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token",
  "userType": "primary" | "secondary"
}
```

**Response:** 200 OK
```json
{
  "accessToken": "new-jwt-token",
  "idToken": "new-jwt-token",
  "expiresIn": 3600
}
```

#### POST /auth/verify-email
Verify user email address.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "userType": "primary" | "secondary"
}
```

**Response:** 200 OK
```json
{
  "message": "Email verified successfully"
}
```

---

## Health Monitoring API

### POST /health/vitals
Record vital signs for a primary user.

**Authorization:** Primary User

**Request Body:**
```json
{
  "vitals": {
    "heartRate": 75,
    "bloodPressure": {
      "systolic": 120,
      "diastolic": 80
    },
    "temperature": 98.6,
    "oxygenSaturation": 98,
    "weight": 150
  },
  "deviceId": "optional-device-id"
}
```

**Response:** 200 OK
```json
{
  "message": "Vital signs recorded successfully",
  "userId": "uuid",
  "timestamp": "2024-01-01T12:00:00Z",
  "vitals": { ... },
  "anomalies": [ ... ],
  "alertTriggered": false
}
```

### GET /health/trends/{userId}
Get health trends for a user.

**Authorization:** Secondary User

**Query Parameters:**
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `metrics` (optional): Comma-separated list of metrics

**Response:** 200 OK
```json
{
  "userId": "uuid",
  "trends": [
    {
      "metric": "heartRate",
      "data": [ ... ],
      "trend": "stable",
      "average": 75
    }
  ],
  "analysis": "Health trends are stable",
  "recommendations": [ ... ]
}
```

### GET /health/data/{userId}
Get health data for a user.

**Authorization:** Secondary User

**Query Parameters:**
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `dataTypes` (optional): Comma-separated list of data types

**Response:** 200 OK
```json
{
  "userId": "uuid",
  "healthData": [ ... ],
  "permissions": { ... }
}
```

### POST /health/report
Generate health report for a user.

**Authorization:** Secondary User

**Request Body:**
```json
{
  "userId": "uuid",
  "reportType": "weekly" | "monthly" | "quarterly",
  "format": "pdf"
}
```

**Response:** 200 OK
```json
{
  "reportId": "uuid",
  "reportUrl": "s3-presigned-url",
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

---

## Alert Management API

### POST /alerts
Create a new health alert.

**Authorization:** Primary User

**Request Body:**
```json
{
  "type": "vital_signs" | "medication" | "appointment" | "emergency",
  "severity": "low" | "medium" | "high" | "critical",
  "message": "Alert message",
  "data": { ... }
}
```

**Response:** 200 OK
```json
{
  "alertId": "uuid",
  "message": "Alert created successfully",
  "notificationsSent": 3
}
```

### GET /alerts
Get alerts for a user.

**Authorization:** Secondary User

**Query Parameters:**
- `userId` (optional): User ID to filter alerts
- `status` (optional): Alert status (pending, acknowledged, resolved)
- `severity` (optional): Alert severity
- `limit` (optional): Number of alerts to return

**Response:** 200 OK
```json
{
  "alerts": [
    {
      "alertId": "uuid",
      "type": "vital_signs",
      "severity": "high",
      "message": "High blood pressure detected",
      "timestamp": "2024-01-01T12:00:00Z",
      "acknowledged": false
    }
  ],
  "total": 10
}
```

### POST /alerts/{alertId}/acknowledge
Acknowledge an alert.

**Authorization:** Secondary User

**Response:** 200 OK
```json
{
  "message": "Alert acknowledged successfully",
  "alertId": "uuid",
  "acknowledgedBy": "uuid",
  "acknowledgedAt": "2024-01-01T12:00:00Z"
}
```

### POST /alerts/{alertId}/escalate
Escalate an alert.

**Authorization:** Secondary User

**Request Body:**
```json
{
  "reason": "Escalation reason",
  "escalationLevel": "high" | "critical"
}
```

**Response:** 200 OK
```json
{
  "message": "Alert escalated successfully",
  "alertId": "uuid",
  "newSeverity": "critical"
}
```

### POST /alerts/emergency
Trigger emergency alert.

**Authorization:** Primary User

**Request Body:**
```json
{
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "symptoms": ["chest pain", "shortness of breath"],
  "severity": "critical"
}
```

**Response:** 200 OK
```json
{
  "alertId": "uuid",
  "message": "Emergency alert triggered",
  "notificationsSent": 5,
  "emergencyContacts": [ ... ]
}
```

### GET /alerts/preferences
Get alert preferences for a user.

**Authorization:** Secondary User

**Response:** 200 OK
```json
{
  "userId": "uuid",
  "preferences": {
    "channels": ["push", "email", "sms"],
    "alertTypes": {
      "vital_signs": true,
      "medication": true,
      "appointment": true
    }
  }
}
```

### PUT /alerts/preferences
Update alert preferences for a user.

**Authorization:** Secondary User

**Request Body:**
```json
{
  "channels": ["push", "email"],
  "alertTypes": {
    "vital_signs": true,
    "medication": false
  }
}
```

**Response:** 200 OK
```json
{
  "message": "Alert preferences updated successfully"
}
```

---

## Medication Management API

### POST /medications
Schedule a new medication.

**Authorization:** Primary User

**Request Body:**
```json
{
  "name": "Aspirin",
  "dosage": "81mg",
  "frequency": "daily",
  "scheduledTime": "08:00",
  "instructions": "Take with food"
}
```

**Response:** 200 OK
```json
{
  "medicationId": "uuid",
  "message": "Medication scheduled successfully"
}
```

### GET /medications
Get medications for a user.

**Authorization:** Primary User

**Query Parameters:**
- `status` (optional): scheduled, taken, missed, skipped
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date

**Response:** 200 OK
```json
{
  "medications": [
    {
      "medicationId": "uuid",
      "name": "Aspirin",
      "dosage": "81mg",
      "frequency": "daily",
      "scheduledTime": "08:00",
      "status": "scheduled"
    }
  ]
}
```

### POST /medications/{medicationId}/confirm
Confirm medication taken.

**Authorization:** Primary User

**Request Body:**
```json
{
  "takenAt": "2024-01-01T08:05:00Z",
  "notes": "Taken with breakfast"
}
```

**Response:** 200 OK
```json
{
  "message": "Medication confirmed",
  "adherenceScore": 95
}
```

### GET /medications/adherence
Get medication adherence for a user.

**Authorization:** Secondary User

**Query Parameters:**
- `userId`: User ID
- `period`: week, month, quarter

**Response:** 200 OK
```json
{
  "userId": "uuid",
  "period": "week",
  "adherenceScore": 95,
  "totalScheduled": 21,
  "totalTaken": 20,
  "totalMissed": 1
}
```

### GET /medications/care-circle-summary
Get medication summary for care circle.

**Authorization:** Secondary User

**Response:** 200 OK
```json
{
  "primaryUsers": [
    {
      "userId": "uuid",
      "name": "John Doe",
      "adherenceScore": 95,
      "missedMedications": 1
    }
  ]
}
```

---

## Appointment Management API

### POST /appointments
Create a new appointment.

**Authorization:** Primary User

**Request Body:**
```json
{
  "scheduledTime": "2024-01-15T10:00:00Z",
  "type": "Cardiology Checkup",
  "provider": {
    "name": "Dr. Smith",
    "specialty": "Cardiology",
    "phone": "+1234567890"
  },
  "notes": "Annual checkup"
}
```

**Response:** 200 OK
```json
{
  "appointmentId": "uuid",
  "message": "Appointment created successfully"
}
```

### GET /appointments
Get appointments for a user.

**Authorization:** Primary User

**Query Parameters:**
- `status` (optional): scheduled, confirmed, completed, cancelled, missed
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date

**Response:** 200 OK
```json
{
  "appointments": [
    {
      "appointmentId": "uuid",
      "scheduledTime": "2024-01-15T10:00:00Z",
      "type": "Cardiology Checkup",
      "provider": { ... },
      "status": "scheduled"
    }
  ]
}
```

### PUT /appointments/{appointmentId}
Update an appointment.

**Authorization:** Primary User

**Request Body:**
```json
{
  "scheduledTime": "2024-01-15T14:00:00Z",
  "notes": "Rescheduled to afternoon"
}
```

**Response:** 200 OK
```json
{
  "message": "Appointment updated successfully"
}
```

### DELETE /appointments/{appointmentId}
Delete an appointment.

**Authorization:** Primary User

**Response:** 200 OK
```json
{
  "message": "Appointment deleted successfully"
}
```

### GET /appointments/{appointmentId}/ical
Get appointment in iCal format.

**Authorization:** Primary User

**Response:** 200 OK (text/calendar)
```
BEGIN:VCALENDAR
VERSION:2.0
...
END:VCALENDAR
```

---

## Care Circle Management API

### GET /care-circle/{userId}
Get care circle for a user.

**Authorization:** Secondary User

**Response:** 200 OK
```json
{
  "primaryUserId": "uuid",
  "members": [
    {
      "userId": "uuid",
      "name": "Jane Doe",
      "relationship": "daughter",
      "permissions": { ... }
    }
  ]
}
```

### POST /care-circle/invite
Invite a care circle member.

**Authorization:** Primary User

**Request Body:**
```json
{
  "email": "caregiver@example.com",
  "relationship": "daughter",
  "permissions": {
    "canViewVitals": true,
    "canViewMedications": true,
    "canReceiveAlerts": true
  }
}
```

**Response:** 200 OK
```json
{
  "invitationId": "uuid",
  "message": "Invitation sent successfully"
}
```

### POST /care-circle/accept
Accept care circle invitation.

**Authorization:** Secondary User

**Request Body:**
```json
{
  "invitationId": "uuid"
}
```

**Response:** 200 OK
```json
{
  "message": "Invitation accepted successfully",
  "primaryUserId": "uuid"
}
```

### POST /care-circle/reject
Reject care circle invitation.

**Authorization:** Secondary User

**Request Body:**
```json
{
  "invitationId": "uuid",
  "reason": "Optional reason"
}
```

**Response:** 200 OK
```json
{
  "message": "Invitation rejected"
}
```

### DELETE /care-circle/{primaryUserId}/member/{secondaryUserId}
Remove a care circle member.

**Authorization:** Primary User

**Response:** 200 OK
```json
{
  "message": "Member removed successfully"
}
```

### GET /care-circle/dashboard
Get care circle dashboard data.

**Authorization:** Secondary User

**Response:** 200 OK
```json
{
  "primaryUsers": [
    {
      "userId": "uuid",
      "name": "John Doe",
      "healthStatus": "stable",
      "recentAlerts": [ ... ],
      "medicationAdherence": 95
    }
  ]
}
```

### POST /care-circle/message
Send a message to care circle.

**Authorization:** Secondary User

**Request Body:**
```json
{
  "recipientId": "uuid",
  "message": "How are you feeling today?",
  "priority": "normal" | "high"
}
```

**Response:** 200 OK
```json
{
  "messageId": "uuid",
  "message": "Message sent successfully"
}
```

### GET /care-circle/messages
Get care circle messages.

**Authorization:** Primary User

**Query Parameters:**
- `limit` (optional): Number of messages to return
- `unreadOnly` (optional): true/false

**Response:** 200 OK
```json
{
  "messages": [
    {
      "messageId": "uuid",
      "senderId": "uuid",
      "senderName": "Jane Doe",
      "message": "How are you feeling today?",
      "timestamp": "2024-01-01T12:00:00Z",
      "read": false
    }
  ]
}
```

### POST /care-circle/messages/{messageId}/read
Mark a message as read.

**Authorization:** Primary User

**Response:** 200 OK
```json
{
  "message": "Message marked as read"
}
```

### PUT /care-circle/permissions
Update care circle permissions.

**Authorization:** Primary User

**Request Body:**
```json
{
  "secondaryUserId": "uuid",
  "permissions": {
    "canViewVitals": true,
    "canViewMedications": false
  }
}
```

**Response:** 200 OK
```json
{
  "message": "Permissions updated successfully"
}
```

---

## Device Integration API

### POST /devices
Register a new health device.

**Authorization:** Primary User

**Request Body:**
```json
{
  "userId": "uuid",
  "type": "blood_pressure_monitor" | "glucose_meter" | "pulse_oximeter" | "fitness_tracker",
  "manufacturer": "Omron",
  "model": "BP7200",
  "capabilities": ["blood_pressure", "heart_rate"],
  "connectionType": "bluetooth" | "wifi" | "cellular",
  "firmwareVersion": "1.0.0"
}
```

**Response:** 200 OK
```json
{
  "deviceId": "uuid",
  "certificateArn": "arn:aws:iot:...",
  "certificatePem": "-----BEGIN CERTIFICATE-----...",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----...",
  "publicKey": "-----BEGIN PUBLIC KEY-----...",
  "iotEndpoint": "data.iot.us-east-1.amazonaws.com"
}
```

### GET /devices
Get devices for a user.

**Authorization:** Primary User

**Response:** 200 OK
```json
{
  "devices": [
    {
      "deviceId": "uuid",
      "type": "blood_pressure_monitor",
      "manufacturer": "Omron",
      "model": "BP7200",
      "status": "connected",
      "lastSync": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### PUT /devices/{deviceId}
Update device information.

**Authorization:** Primary User

**Request Body:**
```json
{
  "firmwareVersion": "1.1.0",
  "status": "connected" | "disconnected"
}
```

**Response:** 200 OK
```json
{
  "message": "Device updated successfully"
}
```

### DELETE /devices/{deviceId}
Delete a device.

**Authorization:** Primary User

**Response:** 200 OK
```json
{
  "message": "Device deleted successfully"
}
```

---

## Permissions API

### GET /permissions/{userId}
Get permissions for a user.

**Authorization:** Secondary User

**Response:** 200 OK
```json
{
  "userId": "uuid",
  "permissions": {
    "canViewVitals": true,
    "canViewMedications": true,
    "canViewAppointments": true,
    "canReceiveAlerts": true
  }
}
```

### PUT /permissions/{userId}
Update permissions for a user.

**Authorization:** Primary User

**Request Body:**
```json
{
  "permissions": {
    "canViewVitals": true,
    "canViewMedications": false
  }
}
```

**Response:** 200 OK
```json
{
  "message": "Permissions updated successfully"
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "message": "Invalid request parameters",
  "code": "INVALID_REQUEST",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthorized: Missing or invalid authentication token",
  "code": "UNAUTHORIZED",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 403 Forbidden
```json
{
  "message": "Forbidden: Insufficient permissions",
  "code": "FORBIDDEN",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## Rate Limiting

API requests are subject to rate limiting based on the environment:

**Development:**
- Rate Limit: 500 requests/second
- Burst Limit: 1,000 requests
- Monthly Quota: 100,000 requests

**Production:**
- Rate Limit: 2,000 requests/second
- Burst Limit: 5,000 requests
- Monthly Quota: 1,000,000 requests

When rate limits are exceeded, the API returns a `429 Too Many Requests` response.

---

## CORS Configuration

All endpoints support CORS with the following configuration:

- **Allowed Origins:** All origins (configurable per environment)
- **Allowed Methods:** GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Allowed Headers:** Content-Type, Authorization, X-Api-Key
- **Credentials:** Enabled

---

## Authentication Headers

For authenticated endpoints, include the following header:

```
Authorization: Bearer {access-token}
```

For external integrations using API keys:

```
X-Api-Key: {api-key}
```

---

## Pagination

Endpoints that return lists support pagination using the following query parameters:

- `limit`: Number of items to return (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)
- `nextToken`: Token for fetching the next page (returned in response)

**Example Response with Pagination:**
```json
{
  "items": [ ... ],
  "total": 100,
  "limit": 20,
  "offset": 0,
  "nextToken": "pagination-token"
}
```

---

## Timestamps

All timestamps are in ISO 8601 format with UTC timezone:

```
2024-01-01T12:00:00Z
```

---

## API Versioning

The current API version is `v1`. The version is included in the base URL:

```
https://{api-id}.execute-api.{region}.amazonaws.com/{environment}/
```

Future versions will be accessible at `/v2/`, `/v3/`, etc.

