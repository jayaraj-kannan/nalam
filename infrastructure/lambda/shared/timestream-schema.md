# Timestream Database Schema

## Overview

The Healthcare Monitoring App uses Amazon Timestream for storing time-series health data. Timestream is optimized for time-series data with automatic tiering between memory and magnetic storage, making it ideal for health monitoring applications that require both real-time queries and long-term data retention.

## Database Structure

**Database Name:** `healthcare-timeseries-{environment}`

The database contains three tables, each optimized for different types of health data:

### 1. Vital Signs Table

**Table Name:** `vital-signs`

**Purpose:** Stores manually entered and device-captured vital signs measurements.

**Retention Policy:**
- Memory Store: 24 hours (for fast queries on recent data)
- Magnetic Store: 7 years (2555 days) - HIPAA compliance requirement

**Measures:**
- `heart_rate` - Heart rate in beats per minute (bpm)
- `systolic_bp` - Systolic blood pressure in mmHg
- `diastolic_bp` - Diastolic blood pressure in mmHg
- `temperature` - Body temperature in Fahrenheit or Celsius
- `oxygen_saturation` - Blood oxygen saturation percentage (SpO2)
- `weight` - Body weight in pounds or kilograms

**Dimensions:**
- `user_id` - Unique identifier for the user
- `source` - Data source: 'manual', 'device', or 'wearable'

**Example Record:**
```json
{
  "time": "2024-01-15T10:30:00.000Z",
  "measure_name": "heart_rate",
  "measure_value": 72,
  "user_id": "user-123",
  "source": "device"
}
```

### 2. Device Readings Table

**Table Name:** `device-readings`

**Purpose:** Stores raw data from health monitoring devices and wearables with device metadata.

**Retention Policy:**
- Memory Store: 48 hours (for more frequent queries on device data)
- Magnetic Store: 7 years (2555 days) - HIPAA compliance requirement

**Measures:**
- Dynamic measure names based on device capabilities
- `battery_level` - Device battery percentage
- `signal_strength` - Connection signal strength

**Dimensions:**
- `device_id` - Unique identifier for the device
- `user_id` - Unique identifier for the user
- `unit` - Measurement unit (e.g., 'bpm', 'mmHg', '%')
- `type` - Record type ('reading' or 'metadata')

**Example Record:**
```json
{
  "time": "2024-01-15T10:30:00.000Z",
  "measure_name": "heart_rate",
  "measure_value": 72,
  "device_id": "device-abc-123",
  "user_id": "user-123",
  "unit": "bpm"
}
```

### 3. Sensor Data Table

**Table Name:** `sensor-data`

**Purpose:** Stores continuous monitoring data from IoT sensors (e.g., fall detection, motion sensors, environmental sensors).

**Retention Policy:**
- Memory Store: 12 hours (for high-frequency sensor data)
- Magnetic Store: 1 year (365 days) - sensor data is less critical for long-term storage

**Measures:**
- Dynamic measure names based on sensor type
- Examples: `motion_detected`, `fall_detected`, `room_temperature`, `ambient_light`

**Dimensions:**
- `sensor_id` - Unique identifier for the sensor
- `user_id` - Unique identifier for the user
- `unit` - Measurement unit

**Example Record:**
```json
{
  "time": "2024-01-15T10:30:00.000Z",
  "measure_name": "motion_detected",
  "measure_value": 1,
  "sensor_id": "sensor-xyz-789",
  "user_id": "user-123",
  "unit": "boolean"
}
```

## Data Retention Strategy

### Memory Store
- Optimized for fast queries on recent data
- Automatically managed by Timestream
- Different retention periods based on query patterns:
  - Vital Signs: 24 hours (daily health checks)
  - Device Readings: 48 hours (more frequent monitoring)
  - Sensor Data: 12 hours (high-frequency data)

### Magnetic Store
- Cost-effective long-term storage
- Automatically tiered from memory store
- HIPAA compliance requires 7-year retention for health data
- Sensor data retained for 1 year (less critical)

## Query Patterns

### Common Queries

**Get recent vital signs for a user:**
```sql
SELECT time, measure_name, measure_value::double as value, source
FROM "healthcare-timeseries-dev"."vital-signs"
WHERE user_id = 'user-123'
  AND time > ago(24h)
ORDER BY time DESC
```

**Get heart rate trend over the last week:**
```sql
SELECT 
  bin(time, 1h) as hour,
  AVG(measure_value::double) as avg_heart_rate,
  MIN(measure_value::double) as min_heart_rate,
  MAX(measure_value::double) as max_heart_rate
FROM "healthcare-timeseries-dev"."vital-signs"
WHERE user_id = 'user-123'
  AND measure_name = 'heart_rate'
  AND time > ago(7d)
GROUP BY bin(time, 1h)
ORDER BY hour DESC
```

**Get device readings with battery status:**
```sql
SELECT time, measure_name, measure_value::double as value, device_id
FROM "healthcare-timeseries-dev"."device-readings"
WHERE device_id = 'device-abc-123'
  AND time > ago(24h)
ORDER BY time DESC
```

**Detect anomalies in vital signs:**
```sql
SELECT time, measure_name, measure_value::double as value
FROM "healthcare-timeseries-dev"."vital-signs"
WHERE user_id = 'user-123'
  AND measure_name = 'heart_rate'
  AND measure_value::double > 100  -- Threshold for high heart rate
  AND time > ago(24h)
ORDER BY time DESC
```

## Security and Compliance

### Encryption
- All data encrypted at rest using AWS KMS customer-managed keys
- Encryption key rotation enabled
- Data encrypted in transit using TLS 1.3

### HIPAA Compliance
- 7-year data retention for vital signs and device readings
- Audit logging enabled via CloudTrail
- Access control via IAM policies
- Data isolation per user via user_id dimension

### Access Control
- Lambda functions granted specific IAM permissions
- Read/write access separated by function role
- Query access restricted to authorized users only

## Usage in Lambda Functions

The `timestream-client.ts` module provides helper functions for common operations:

```typescript
import { writeVitalSigns, queryVitalSigns } from './timestream-client';

// Write vital signs
await writeVitalSigns('user-123', {
  heartRate: 72,
  systolicBP: 120,
  diastolicBP: 80,
  temperature: 98.6,
  oxygenSaturation: 98
}, new Date(), 'device');

// Query vital signs
const vitals = await queryVitalSigns(
  'user-123',
  new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  new Date(),
  ['heart_rate', 'systolic_bp', 'diastolic_bp']
);
```

## Performance Considerations

1. **Batch Writes:** Write multiple records in a single request when possible
2. **Query Optimization:** Use time range filters to limit data scanned
3. **Dimension Cardinality:** Keep dimension values reasonable to avoid performance issues
4. **Memory Store:** Most queries should target memory store for best performance
5. **Aggregations:** Use Timestream's built-in aggregation functions for efficiency

## Monitoring and Maintenance

- CloudWatch metrics track write throughput and query performance
- Automatic data tiering requires no manual intervention
- Monitor rejected records and adjust write patterns if needed
- Review query patterns and adjust memory store retention if needed
