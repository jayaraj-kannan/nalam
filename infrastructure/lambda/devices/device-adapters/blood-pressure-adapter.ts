// Blood Pressure Monitor Adapter
// Requirements: 7.2

import { SensorReading } from '../../shared/types';

export interface BloodPressureReading {
  systolic: number;
  diastolic: number;
  heartRate?: number;
  timestamp: Date;
  unit?: string;
}

export class BloodPressureAdapter {
  /**
   * Convert raw blood pressure monitor data to standardized sensor readings
   */
  static convertToSensorReadings(data: BloodPressureReading): SensorReading[] {
    const readings: SensorReading[] = [];

    // Blood pressure reading (stored as systolic value, diastolic in metadata)
    readings.push({
      type: 'blood_pressure',
      value: data.systolic,
      unit: data.unit || 'mmHg',
      accuracy: 95, // Typical accuracy for home BP monitors
    });

    // Heart rate if available
    if (data.heartRate) {
      readings.push({
        type: 'heart_rate',
        value: data.heartRate,
        unit: 'bpm',
        accuracy: 95,
      });
    }

    return readings;
  }

  /**
   * Parse data from Omron blood pressure monitors
   */
  static parseOmronData(rawData: string): BloodPressureReading {
    // Example format: "SYS:120,DIA:80,HR:72,TIME:2024-01-15T10:30:00Z"
    const parts = rawData.split(',');
    const data: Record<string, string> = {};

    parts.forEach((part) => {
      const [key, value] = part.split(':');
      data[key] = value;
    });

    return {
      systolic: parseInt(data.SYS, 10),
      diastolic: parseInt(data.DIA, 10),
      heartRate: data.HR ? parseInt(data.HR, 10) : undefined,
      timestamp: new Date(data.TIME || Date.now()),
      unit: 'mmHg',
    };
  }

  /**
   * Parse data from Withings blood pressure monitors
   */
  static parseWithingsData(rawData: Record<string, unknown>): BloodPressureReading {
    return {
      systolic: rawData.systolic as number,
      diastolic: rawData.diastolic as number,
      heartRate: rawData.heart_rate as number | undefined,
      timestamp: new Date((rawData.timestamp as number) * 1000), // Unix timestamp
      unit: 'mmHg',
    };
  }

  /**
   * Validate blood pressure reading
   */
  static validate(reading: BloodPressureReading): boolean {
    // Systolic should be between 60-250 mmHg
    if (reading.systolic < 60 || reading.systolic > 250) {
      return false;
    }

    // Diastolic should be between 30-150 mmHg
    if (reading.diastolic < 30 || reading.diastolic > 150) {
      return false;
    }

    // Systolic should be higher than diastolic
    if (reading.systolic <= reading.diastolic) {
      return false;
    }

    // Heart rate validation if present
    if (reading.heartRate && (reading.heartRate < 30 || reading.heartRate > 220)) {
      return false;
    }

    return true;
  }
}
