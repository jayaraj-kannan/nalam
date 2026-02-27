// Glucose Meter Adapter
// Requirements: 7.2

import { SensorReading } from '../../shared/types';

export interface GlucoseReading {
  glucose: number;
  unit: 'mg/dL' | 'mmol/L';
  timestamp: Date;
  mealContext?: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime';
  notes?: string;
}

export class GlucoseMeterAdapter {
  /**
   * Convert raw glucose meter data to standardized sensor readings
   */
  static convertToSensorReadings(data: GlucoseReading): SensorReading[] {
    const readings: SensorReading[] = [];

    // Convert to mg/dL if needed
    let glucoseValue = data.glucose;
    if (data.unit === 'mmol/L') {
      glucoseValue = data.glucose * 18.0182; // Convert mmol/L to mg/dL
    }

    readings.push({
      type: 'glucose',
      value: glucoseValue,
      unit: 'mg/dL',
      accuracy: 95, // Typical accuracy for glucose meters
    });

    return readings;
  }

  /**
   * Parse data from OneTouch glucose meters
   */
  static parseOneTouchData(rawData: string): GlucoseReading {
    // Example format: "GLU:120,UNIT:mg/dL,MEAL:fasting,TIME:2024-01-15T10:30:00Z"
    const parts = rawData.split(',');
    const data: Record<string, string> = {};

    parts.forEach((part) => {
      const [key, value] = part.split(':');
      data[key] = value;
    });

    return {
      glucose: parseInt(data.GLU, 10),
      unit: (data.UNIT as 'mg/dL' | 'mmol/L') || 'mg/dL',
      timestamp: new Date(data.TIME || Date.now()),
      mealContext: data.MEAL as GlucoseReading['mealContext'],
    };
  }

  /**
   * Parse data from Dexcom continuous glucose monitors
   */
  static parseDexcomData(rawData: Record<string, unknown>): GlucoseReading {
    return {
      glucose: rawData.value as number,
      unit: (rawData.unit as 'mg/dL' | 'mmol/L') || 'mg/dL',
      timestamp: new Date((rawData.timestamp as number) * 1000),
      mealContext: rawData.meal_context as GlucoseReading['mealContext'],
    };
  }

  /**
   * Parse data from Abbott FreeStyle Libre
   */
  static parseFreestyleLibreData(rawData: Record<string, unknown>): GlucoseReading {
    return {
      glucose: rawData.glucose as number,
      unit: 'mg/dL',
      timestamp: new Date(rawData.timestamp as string),
      notes: rawData.notes as string | undefined,
    };
  }

  /**
   * Validate glucose reading
   */
  static validate(reading: GlucoseReading): boolean {
    let glucoseValue = reading.glucose;

    // Convert to mg/dL for validation
    if (reading.unit === 'mmol/L') {
      glucoseValue = reading.glucose * 18.0182;
    }

    // Glucose should be between 20-600 mg/dL
    if (glucoseValue < 20 || glucoseValue > 600) {
      return false;
    }

    return true;
  }

  /**
   * Classify glucose level
   */
  static classifyLevel(reading: GlucoseReading): 'low' | 'normal' | 'high' | 'very_high' {
    let glucoseValue = reading.glucose;

    // Convert to mg/dL for classification
    if (reading.unit === 'mmol/L') {
      glucoseValue = reading.glucose * 18.0182;
    }

    if (glucoseValue < 70) {
      return 'low';
    } else if (glucoseValue <= 140) {
      return 'normal';
    } else if (glucoseValue <= 200) {
      return 'high';
    } else {
      return 'very_high';
    }
  }
}
