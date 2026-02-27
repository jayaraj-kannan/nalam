# Device Integration Service

## Overview

The Device Integration Service enables seamless connectivity between health monitoring devices and the Healthcare Monitoring App. It supports automatic data ingestion, validation, and processing from various health devices including blood pressure monitors, glucose meters, pulse oximeters, and fitness trackers.

**Requirements:** 7.1, 7.2, 7.3, 7.4, 7.5, 1.2

## Architecture

### AWS IoT Core Setup

The service uses AWS IoT Core for secure device connectivity:

- **Thing Types**: Separate thing types for each device category (blood pressure, glucose, pulse oximeter, fitness tracker, fall detector, weight scale)
- **MQTT Topics**: 
  - `healthcare/devices/{deviceId}/data` - Device data ingestion
  - `healthcare/devices/{deviceId}/status` - Device status updates
  - `healthcare/devices/{deviceId}/commands` - Device commands
- **Security**: Certificate-based authentication with IoT policies

### Lambda Functions

#### 1. Device Registration (`register-device.ts`)

Handles device registration and provisioning:

- Creates IoT Thing with appropriate thing type
- Generates device certificates and keys
- Attaches IoT policies for secure communication
- Stores device metadata in DynamoDB

**API Endpoint**: `POST /api/v1/devices/register`

**Request Body**:
```json
{
  "userId": "user-123",
  "type": "blood_pressure",
  "manufacturer": "Omron",
  "model": "BP7250",
  "capabilities": ["blood_pressure", "heart_rate"],
  "connectionType": "bluetooth",
  "firmwareVersion": "1.2.3"
}
```

**Response**:
```json
{
  "deviceId": "blood_pressure-user-123-1234567890",
  "certificateArn": "arn:aws:iot:...",
  "certificatePem": "-----BEGIN CERTIFICATE-----...",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----...",
  "publicKey": "-----BEGIN PUBLIC KEY-----...",
  "iotEndpoint": "data.iot.us-east-1.amazonaws.com"
}
```

#### 2. Device Management (`get-devices.ts`, `update-device.ts`, `delete-device.ts`)

CRUD operations for device management:

- **Get Devices**: Retrieve device by ID or all devices for a user
- **Update Device**: Update device metadata and settings
- **Delete Device**: Remove device and clean up IoT resources

**API Endpoints**:
- `GET /api/v1/devices/{deviceId}` - Get specific device
- `GET /api/v1/devices?userId={userId}` - Get all devices for user
- `PUT /api/v1/devices/{deviceId}` - Update device
- `DELETE /api/v1/devices/{deviceId}` - Delete device

#### 3. Device Data Processing (`process-device-data.ts`)

Processes incoming device data from IoT Core:

- Validates device readings against acceptable ranges
- Stores validated data in Timestream
- Updates device sync time and battery level
- Publishes events for anomaly detection
- Prioritizes device data over manual entries

**Validation Ranges**:
- Heart Rate: 30-220 bpm
- Blood Pressure: Systolic 60-250 mmHg, Diastolic 30-150 mmHg
- Temperature: 32-43°C
- Oxygen Saturation: 70-100%
- Glucose: 20-600 mg/dL
- Weight: 20-300 kg

**IoT Topic**: `healthcare/devices/+/data`

**Message Format**:
```json
{
  "deviceId": "blood_pressure-user-123-1234567890",
  "timestamp": "2024-01-15T10:30:00Z",
  "readings": [
    {
      "type": "blood_pressure",
      "value": 120,
      "unit": "mmHg",
      "accuracy": 95
    },
    {
      "type": "heart_rate",
      "value": 72,
      "unit": "bpm",
      "accuracy": 95
    }
  ],
  "batteryLevel": 85,
  "signalStrength": -45
}
```

#### 4. Connectivity Monitoring (`monitor-connectivity.ts`)

Monitors device connectivity and detects disconnections:

- Checks all devices every 15 minutes
- Marks devices as disconnected if no sync for 20 minutes
- Sends notifications for connectivity issues
- Provides manual entry fallback options

**EventBridge Schedule**: Every 15 minutes

**Events Published**:
- `device.connectivity.lost` - Device hasn't synced in 20+ minutes
- `device.connectivity.restored` - Previously disconnected device reconnected
- `device.battery.low` - Device battery below 20%

## Device Adapters

The service includes adapters for common health device SDKs:

### 1. Blood Pressure Monitor Adapter

Supports:
- Omron blood pressure monitors
- Withings blood pressure monitors
- Generic Bluetooth BP monitors

**Features**:
- Systolic/diastolic pressure conversion
- Heart rate extraction
- Data validation (systolic > diastolic, reasonable ranges)

### 2. Glucose Meter Adapter

Supports:
- OneTouch glucose meters
- Dexcom continuous glucose monitors
- Abbott FreeStyle Libre

**Features**:
- Unit conversion (mmol/L ↔ mg/dL)
- Meal context tracking (fasting, before/after meal, bedtime)
- Glucose level classification (low, normal, high, very high)

### 3. Pulse Oximeter Adapter

Supports:
- Masimo pulse oximeters
- Generic Bluetooth pulse oximeters

**Features**:
- SpO2 and heart rate extraction
- Perfusion index tracking
- SpO2 level classification (critical, low, normal)

### 4. Fitness Tracker Adapter

Supports:
- Fitbit devices
- Apple Watch
- Garmin devices

**Features**:
- Heart rate monitoring
- Activity tracking (steps, distance, calories)
- Sleep duration tracking
- Active minutes calculation

## Data Flow

1. **Device Registration**:
   - User registers device via API
   - IoT Thing created with certificates
   - Device credentials returned to user
   - Device stored in DynamoDB

2. **Data Ingestion**:
   - Device publishes data to MQTT topic
   - IoT Rule triggers Lambda function
   - Data validated and processed
   - Stored in Timestream for time-series analysis
   - Events published for anomaly detection

3. **Connectivity Monitoring**:
   - Scheduled check every 15 minutes
   - Compare last sync time with threshold
   - Update device status
   - Send notifications for issues

4. **Manual Fallback**:
   - If device disconnected, notify user
   - Provide manual entry option in UI
   - Flag discrepancies between device and manual data

## Integration with Other Services

### Health Monitoring Service
- Device data triggers anomaly detection
- Vital signs extracted from device readings
- Alerts generated for abnormal values

### Alert Management Service
- Connectivity issues trigger alerts
- Low battery notifications
- Device disconnection alerts to care circle

### Timestream Database
- All device readings stored with timestamps
- Efficient querying for trend analysis
- 7-year retention for HIPAA compliance

## Security

- **Certificate-based authentication**: Each device has unique certificate
- **IoT Policies**: Restrict device access to specific topics
- **Encryption**: All data encrypted in transit (TLS) and at rest (KMS)
- **Audit logging**: All device operations logged to CloudTrail

## Testing

See device integration tests in `__tests__/device-integration.test.ts`

## Troubleshooting

### Device Won't Connect
1. Verify device certificate is active
2. Check IoT policy is attached
3. Verify MQTT endpoint is correct
4. Check device has internet connectivity

### Data Not Appearing
1. Check device is publishing to correct topic
2. Verify data format matches expected schema
3. Check Lambda function logs for validation errors
4. Verify Timestream write permissions

### Connectivity Alerts
1. Check device last sync time
2. Verify device is powered on
3. Check device battery level
4. Verify network connectivity
