import { WriteRecordsCommand, WriteRecordsCommandInput, _Record as TimestreamRecord, MeasureValueType } from '@aws-sdk/client-timestream-write';
import { QueryCommand, QueryCommandInput } from '@aws-sdk/client-timestream-query';
import { getTimestreamWriteClient, getTimestreamQueryClient } from './connection-pool';

/**
 * Timestream client configuration for healthcare monitoring app
 * Provides write and query capabilities for time-series health data
 * Performance: Uses connection pooling for optimal Lambda performance
 */

const TIMESTREAM_DATABASE = process.env.TIMESTREAM_DATABASE || 'healthcare-timeseries-dev';

// Use connection-pooled clients for better performance
const writeClient = getTimestreamWriteClient();
const queryClient = getTimestreamQueryClient();

/**
 * Table names for different types of health data
 */
export const TimestreamTables = {
  VITAL_SIGNS: 'vital-signs',
  DEVICE_READINGS: 'device-readings',
  SENSOR_DATA: 'sensor-data',
} as const;

/**
 * Write vital signs data to Timestream
 */
export async function writeVitalSigns(
  userId: string,
  vitals: {
    heartRate?: number;
    systolicBP?: number;
    diastolicBP?: number;
    temperature?: number;
    oxygenSaturation?: number;
    weight?: number;
  },
  timestamp?: Date,
  source: 'manual' | 'device' | 'wearable' = 'manual'
): Promise<void> {
  const currentTime = timestamp || new Date();
  const timeInMillis = currentTime.getTime().toString();

  const records: TimestreamRecord[] = [];

  // Create a record for each vital sign measurement
  if (vitals.heartRate !== undefined) {
    records.push(createRecord('heart_rate', vitals.heartRate, userId, source, timeInMillis));
  }
  if (vitals.systolicBP !== undefined) {
    records.push(createRecord('systolic_bp', vitals.systolicBP, userId, source, timeInMillis));
  }
  if (vitals.diastolicBP !== undefined) {
    records.push(createRecord('diastolic_bp', vitals.diastolicBP, userId, source, timeInMillis));
  }
  if (vitals.temperature !== undefined) {
    records.push(createRecord('temperature', vitals.temperature, userId, source, timeInMillis));
  }
  if (vitals.oxygenSaturation !== undefined) {
    records.push(createRecord('oxygen_saturation', vitals.oxygenSaturation, userId, source, timeInMillis));
  }
  if (vitals.weight !== undefined) {
    records.push(createRecord('weight', vitals.weight, userId, source, timeInMillis));
  }

  if (records.length === 0) {
    throw new Error('No vital signs data provided');
  }

  const params: WriteRecordsCommandInput = {
    DatabaseName: TIMESTREAM_DATABASE,
    TableName: TimestreamTables.VITAL_SIGNS,
    Records: records,
  };

  await writeClient.send(new WriteRecordsCommand(params));
}

/**
 * Write device readings to Timestream
 */
export async function writeDeviceReadings(
  deviceId: string,
  userId: string,
  readings: Array<{
    measureName: string;
    value: number;
    unit?: string;
  }>,
  timestamp?: Date,
  metadata?: {
    batteryLevel?: number;
    signalStrength?: number;
  }
): Promise<void> {
  const currentTime = timestamp || new Date();
  const timeInMillis = currentTime.getTime().toString();

  const records: TimestreamRecord[] = readings.map(reading => ({
    MeasureName: reading.measureName,
    MeasureValue: reading.value.toString(),
    MeasureValueType: MeasureValueType.DOUBLE,
    Time: timeInMillis,
    TimeUnit: 'MILLISECONDS',
    Dimensions: [
      { Name: 'device_id', Value: deviceId },
      { Name: 'user_id', Value: userId },
      { Name: 'unit', Value: reading.unit || 'unknown' },
    ],
  }));

  // Add metadata as separate records if provided
  if (metadata?.batteryLevel !== undefined) {
    records.push(createDeviceMetadataRecord('battery_level', metadata.batteryLevel, deviceId, userId, timeInMillis));
  }
  if (metadata?.signalStrength !== undefined) {
    records.push(createDeviceMetadataRecord('signal_strength', metadata.signalStrength, deviceId, userId, timeInMillis));
  }

  const params: WriteRecordsCommandInput = {
    DatabaseName: TIMESTREAM_DATABASE,
    TableName: TimestreamTables.DEVICE_READINGS,
    Records: records,
  };

  await writeClient.send(new WriteRecordsCommand(params));
}

/**
 * Write sensor data to Timestream
 */
export async function writeSensorData(
  sensorId: string,
  userId: string,
  sensorType: string,
  value: number,
  unit: string,
  timestamp?: Date
): Promise<void> {
  const currentTime = timestamp || new Date();
  const timeInMillis = currentTime.getTime().toString();

  const record: TimestreamRecord = {
    MeasureName: sensorType,
    MeasureValue: value.toString(),
    MeasureValueType: MeasureValueType.DOUBLE,
    Time: timeInMillis,
    TimeUnit: 'MILLISECONDS',
    Dimensions: [
      { Name: 'sensor_id', Value: sensorId },
      { Name: 'user_id', Value: userId },
      { Name: 'unit', Value: unit },
    ],
  };

  const params: WriteRecordsCommandInput = {
    DatabaseName: TIMESTREAM_DATABASE,
    TableName: TimestreamTables.SENSOR_DATA,
    Records: [record],
  };

  await writeClient.send(new WriteRecordsCommand(params));
}

/**
 * Query vital signs for a user within a time range
 */
export async function queryVitalSigns(
  userId: string,
  startTime: Date,
  endTime: Date,
  measureNames?: string[]
): Promise<any[]> {
  const measureFilter = measureNames && measureNames.length > 0
    ? `AND measure_name IN (${measureNames.map(m => `'${m}'`).join(', ')})`
    : '';

  const query = `
    SELECT 
      time, 
      measure_name, 
      measure_value::double as value,
      source
    FROM "${TIMESTREAM_DATABASE}"."${TimestreamTables.VITAL_SIGNS}"
    WHERE user_id = '${userId}'
      AND time BETWEEN from_milliseconds(${startTime.getTime()}) 
      AND from_milliseconds(${endTime.getTime()})
      ${measureFilter}
    ORDER BY time DESC
  `;

  const params: QueryCommandInput = {
    QueryString: query,
  };

  const response = await queryClient.send(new QueryCommand(params));
  return parseQueryResults(response);
}

/**
 * Query device readings for a device within a time range
 */
export async function queryDeviceReadings(
  deviceId: string,
  startTime: Date,
  endTime: Date
): Promise<any[]> {
  const query = `
    SELECT 
      time, 
      measure_name, 
      measure_value::double as value,
      device_id,
      user_id,
      unit
    FROM "${TIMESTREAM_DATABASE}"."${TimestreamTables.DEVICE_READINGS}"
    WHERE device_id = '${deviceId}'
      AND time BETWEEN from_milliseconds(${startTime.getTime()}) 
      AND from_milliseconds(${endTime.getTime()})
    ORDER BY time DESC
  `;

  const params: QueryCommandInput = {
    QueryString: query,
  };

  const response = await queryClient.send(new QueryCommand(params));
  return parseQueryResults(response);
}

/**
 * Helper function to create a vital signs record
 */
function createRecord(
  measureName: string,
  value: number,
  userId: string,
  source: string,
  timeInMillis: string
): TimestreamRecord {
  return {
    MeasureName: measureName,
    MeasureValue: value.toString(),
    MeasureValueType: MeasureValueType.DOUBLE,
    Time: timeInMillis,
    TimeUnit: 'MILLISECONDS',
    Dimensions: [
      { Name: 'user_id', Value: userId },
      { Name: 'source', Value: source },
    ],
  };
}

/**
 * Helper function to create a device metadata record
 */
function createDeviceMetadataRecord(
  measureName: string,
  value: number,
  deviceId: string,
  userId: string,
  timeInMillis: string
): TimestreamRecord {
  return {
    MeasureName: measureName,
    MeasureValue: value.toString(),
    MeasureValueType: MeasureValueType.DOUBLE,
    Time: timeInMillis,
    TimeUnit: 'MILLISECONDS',
    Dimensions: [
      { Name: 'device_id', Value: deviceId },
      { Name: 'user_id', Value: userId },
      { Name: 'type', Value: 'metadata' },
    ],
  };
}

/**
 * Parse Timestream query results into a more usable format
 */
function parseQueryResults(response: any): any[] {
  if (!response.Rows || response.Rows.length === 0) {
    return [];
  }

  const columnInfo = response.ColumnInfo || [];
  const results: any[] = [];

  for (const row of response.Rows) {
    const record: any = {};
    row.Data.forEach((data: any, index: number) => {
      const columnName = columnInfo[index]?.Name;
      record[columnName] = data.ScalarValue;
    });
    results.push(record);
  }

  return results;
}

export { writeClient, queryClient };
