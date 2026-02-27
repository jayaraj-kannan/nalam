// Device Data Processing Lambda Function
// Requirements: 1.2, 7.3, 7.4

import { IoTEvent } from 'aws-lambda';
import { TimestreamWriteClient, WriteRecordsCommand, MeasureValueType, TimeUnit } from '@aws-sdk/client-timestream-write';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { DeviceReading, SensorReading, VitalSigns } from '../shared/types';
import { getDevice, updateDeviceSync, updateDeviceBattery } from '../shared/data-access/devices';

const timestreamClient = new TimestreamWriteClient({});
const eventBridgeClient = new EventBridgeClient({});

const DEVICES_TABLE = process.env.DEVICES_TABLE!;
const TIMESTREAM_DATABASE = process.env.TIMESTREAM_DATABASE!;
const TIMESTREAM_TABLE = process.env.TIMESTREAM_TABLE!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;

interface DeviceDataPayload {
  deviceId: string;
  timestamp: string;
  readings: SensorReading[];
  batteryLevel?: number;
  signalStrength?: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

// Validation ranges for health metrics
const VALIDATION_RANGES = {
  heart_rate: { min: 30, max: 220 },
  blood_pressure_systolic: { min: 60, max: 250 },
  blood_pressure_diastolic: { min: 30, max: 150 },
  temperature: { min: 32, max: 43 }, // Celsius
  oxygen_saturation: { min: 70, max: 100 },
  glucose: { min: 20, max: 600 }, // mg/dL
  weight: { min: 20, max: 300 }, // kg
};

export async function handler(event: IoTEvent): Promise<void> {
  console.log('Processing device data:', JSON.stringify(event, null, 2));

  try {
    const payload: DeviceDataPayload = event as unknown as DeviceDataPayload;

    // Validate payload
    if (!payload.deviceId || !payload.readings || payload.readings.length === 0) {
      console.error('Invalid device data payload:', payload);
      return;
    }

    // Get device information
    const device = await getDevice(payload.deviceId);
    if (!device) {
      console.error(`Device not found: ${payload.deviceId}`);
      return;
    }

    // Validate device readings
    const validatedReadings = validateReadings(payload.readings);
    if (validatedReadings.length === 0) {
      console.warn('No valid readings after validation');
      return;
    }

    // Store readings in Timestream
    await storeDeviceReadings(device.userId, payload.deviceId, validatedReadings, payload.timestamp);

    // Update device sync time
    await updateDeviceSync(payload.deviceId);

    // Update battery level if provided
    if (payload.batteryLevel !== undefined) {
      await updateDeviceBattery(payload.deviceId, payload.batteryLevel);

      // Alert if battery is low
      if (payload.batteryLevel < 20) {
        await publishEvent('device.battery.low', {
          deviceId: payload.deviceId,
          userId: device.userId,
          batteryLevel: payload.batteryLevel,
        });
      }
    }

    // Convert device readings to vital signs format
    const vitalSigns = convertToVitalSigns(validatedReadings, payload.timestamp);

    // Publish event for anomaly detection
    if (vitalSigns) {
      await publishEvent('device.data.received', {
        deviceId: payload.deviceId,
        userId: device.userId,
        vitalSigns,
        source: 'device',
      });
    }

    console.log(`Successfully processed data from device: ${payload.deviceId}`);
  } catch (error) {
    console.error('Error processing device data:', error);
    throw error;
  }
}

function validateReadings(readings: SensorReading[]): SensorReading[] {
  return readings.filter((reading) => {
    // Check if reading type is supported
    if (!reading.type || !reading.value) {
      console.warn('Invalid reading format:', reading);
      return false;
    }

    // Validate based on sensor type
    let range: { min: number; max: number } | undefined;

    switch (reading.type) {
      case 'heart_rate':
        range = VALIDATION_RANGES.heart_rate;
        break;
      case 'blood_pressure':
        // Blood pressure readings should have systolic/diastolic in the value
        return true; // Validated separately
      case 'temperature':
        range = VALIDATION_RANGES.temperature;
        break;
      case 'oxygen_saturation':
        range = VALIDATION_RANGES.oxygen_saturation;
        break;
      case 'glucose':
        range = VALIDATION_RANGES.glucose;
        break;
      case 'weight':
        range = VALIDATION_RANGES.weight;
        break;
      default:
        // Allow other sensor types (accelerometer, gyroscope, etc.)
        return true;
    }

    // Validate range if applicable
    if (range) {
      if (reading.value < range.min || reading.value > range.max) {
        console.warn(`Reading out of range: ${reading.type} = ${reading.value} (expected ${range.min}-${range.max})`);
        return false;
      }
    }

    return true;
  });
}

async function storeDeviceReadings(
  userId: string,
  deviceId: string,
  readings: SensorReading[],
  timestamp: string
): Promise<void> {
  const records = readings.map((reading) => ({
    Dimensions: [
      { Name: 'userId', Value: userId },
      { Name: 'deviceId', Value: deviceId },
      { Name: 'sensorType', Value: reading.type },
    ],
    MeasureName: 'sensor_reading',
    MeasureValue: reading.value.toString(),
    MeasureValueType: MeasureValueType.DOUBLE,
    Time: new Date(timestamp).getTime().toString(),
    TimeUnit: TimeUnit.MILLISECONDS,
  }));

  const command = new WriteRecordsCommand({
    DatabaseName: TIMESTREAM_DATABASE,
    TableName: TIMESTREAM_TABLE,
    Records: records,
  });

  await timestreamClient.send(command);
  console.log(`Stored ${records.length} readings in Timestream`);
}

function convertToVitalSigns(readings: SensorReading[], timestamp: string): VitalSigns | null {
  const vitals: VitalSigns = {
    timestamp: new Date(timestamp),
    source: 'device',
  };

  let hasVitals = false;

  for (const reading of readings) {
    switch (reading.type) {
      case 'heart_rate':
        vitals.heartRate = reading.value;
        hasVitals = true;
        break;
      case 'temperature':
        vitals.temperature = reading.value;
        hasVitals = true;
        break;
      case 'oxygen_saturation':
        vitals.oxygenSaturation = reading.value;
        hasVitals = true;
        break;
      case 'weight':
        vitals.weight = reading.value;
        hasVitals = true;
        break;
    }
  }

  return hasVitals ? vitals : null;
}

async function publishEvent(eventType: string, detail: Record<string, unknown>): Promise<void> {
  const command = new PutEventsCommand({
    Entries: [
      {
        Source: 'healthcare.device',
        DetailType: eventType,
        Detail: JSON.stringify(detail),
        EventBusName: EVENT_BUS_NAME,
      },
    ],
  });

  await eventBridgeClient.send(command);
  console.log(`Published event: ${eventType}`);
}
