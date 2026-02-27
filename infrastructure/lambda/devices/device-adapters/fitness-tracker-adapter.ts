// Fitness Tracker Adapter
// Requirements: 7.2

import { SensorReading } from '../../shared/types';

export interface FitnessTrackerReading {
  heartRate?: number;
  steps?: number;
  distance?: number; // meters
  calories?: number;
  activeMinutes?: number;
  sleepDuration?: number; // minutes
  timestamp: Date;
}

export class FitnessTrackerAdapter {
  /**
   * Convert raw fitness tracker data to standardized sensor readings
   */
  static convertToSensorReadings(data: FitnessTrackerReading): SensorReading[] {
    const readings: SensorReading[] = [];

    // Heart rate reading
    if (data.heartRate) {
      readings.push({
        type: 'heart_rate',
        value: data.heartRate,
        unit: 'bpm',
        accuracy: 90, // Fitness trackers typically less accurate than medical devices
      });
    }

    // Activity tracking readings (stored as custom sensor types)
    if (data.steps) {
      readings.push({
        type: 'accelerometer', // Using accelerometer as proxy for activity
        value: data.steps,
        unit: 'steps',
        accuracy: 95,
      });
    }

    return readings;
  }

  /**
   * Parse data from Fitbit devices
   */
  static parseFitbitData(rawData: Record<string, unknown>): FitnessTrackerReading {
    return {
      heartRate: rawData.heart_rate as number | undefined,
      steps: rawData.steps as number | undefined,
      distance: rawData.distance as number | undefined,
      calories: rawData.calories as number | undefined,
      activeMinutes: rawData.active_minutes as number | undefined,
      sleepDuration: rawData.sleep_duration as number | undefined,
      timestamp: new Date(rawData.timestamp as string),
    };
  }

  /**
   * Parse data from Apple Watch
   */
  static parseAppleWatchData(rawData: Record<string, unknown>): FitnessTrackerReading {
    return {
      heartRate: rawData.heartRate as number | undefined,
      steps: rawData.stepCount as number | undefined,
      distance: rawData.distanceWalkingRunning as number | undefined,
      calories: rawData.activeEnergyBurned as number | undefined,
      activeMinutes: rawData.appleExerciseTime as number | undefined,
      timestamp: new Date(rawData.timestamp as string),
    };
  }

  /**
   * Parse data from Garmin devices
   */
  static parseGarminData(rawData: Record<string, unknown>): FitnessTrackerReading {
    return {
      heartRate: rawData.heartRate as number | undefined,
      steps: rawData.steps as number | undefined,
      distance: rawData.distance as number | undefined,
      calories: rawData.calories as number | undefined,
      activeMinutes: rawData.moderateIntensityMinutes as number | undefined,
      timestamp: new Date((rawData.timestamp as number) * 1000),
    };
  }

  /**
   * Validate fitness tracker reading
   */
  static validate(reading: FitnessTrackerReading): boolean {
    // Heart rate validation if present
    if (reading.heartRate && (reading.heartRate < 30 || reading.heartRate > 220)) {
      return false;
    }

    // Steps validation if present (max 100,000 steps per day)
    if (reading.steps && (reading.steps < 0 || reading.steps > 100000)) {
      return false;
    }

    // Distance validation if present (max 100km)
    if (reading.distance && (reading.distance < 0 || reading.distance > 100000)) {
      return false;
    }

    // Calories validation if present (max 10,000 calories)
    if (reading.calories && (reading.calories < 0 || reading.calories > 10000)) {
      return false;
    }

    // Active minutes validation if present (max 1440 minutes in a day)
    if (reading.activeMinutes && (reading.activeMinutes < 0 || reading.activeMinutes > 1440)) {
      return false;
    }

    // Sleep duration validation if present (max 24 hours)
    if (reading.sleepDuration && (reading.sleepDuration < 0 || reading.sleepDuration > 1440)) {
      return false;
    }

    return true;
  }
}
