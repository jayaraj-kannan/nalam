import { SensorReading } from '../../shared/types';
export interface BloodPressureReading {
    systolic: number;
    diastolic: number;
    heartRate?: number;
    timestamp: Date;
    unit?: string;
}
export declare class BloodPressureAdapter {
    /**
     * Convert raw blood pressure monitor data to standardized sensor readings
     */
    static convertToSensorReadings(data: BloodPressureReading): SensorReading[];
    /**
     * Parse data from Omron blood pressure monitors
     */
    static parseOmronData(rawData: string): BloodPressureReading;
    /**
     * Parse data from Withings blood pressure monitors
     */
    static parseWithingsData(rawData: Record<string, unknown>): BloodPressureReading;
    /**
     * Validate blood pressure reading
     */
    static validate(reading: BloodPressureReading): boolean;
}
