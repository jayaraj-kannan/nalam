import { SensorReading } from '../../shared/types';
export interface FitnessTrackerReading {
    heartRate?: number;
    steps?: number;
    distance?: number;
    calories?: number;
    activeMinutes?: number;
    sleepDuration?: number;
    timestamp: Date;
}
export declare class FitnessTrackerAdapter {
    /**
     * Convert raw fitness tracker data to standardized sensor readings
     */
    static convertToSensorReadings(data: FitnessTrackerReading): SensorReading[];
    /**
     * Parse data from Fitbit devices
     */
    static parseFitbitData(rawData: Record<string, unknown>): FitnessTrackerReading;
    /**
     * Parse data from Apple Watch
     */
    static parseAppleWatchData(rawData: Record<string, unknown>): FitnessTrackerReading;
    /**
     * Parse data from Garmin devices
     */
    static parseGarminData(rawData: Record<string, unknown>): FitnessTrackerReading;
    /**
     * Validate fitness tracker reading
     */
    static validate(reading: FitnessTrackerReading): boolean;
}
