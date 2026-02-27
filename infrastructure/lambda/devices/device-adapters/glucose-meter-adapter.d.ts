import { SensorReading } from '../../shared/types';
export interface GlucoseReading {
    glucose: number;
    unit: 'mg/dL' | 'mmol/L';
    timestamp: Date;
    mealContext?: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime';
    notes?: string;
}
export declare class GlucoseMeterAdapter {
    /**
     * Convert raw glucose meter data to standardized sensor readings
     */
    static convertToSensorReadings(data: GlucoseReading): SensorReading[];
    /**
     * Parse data from OneTouch glucose meters
     */
    static parseOneTouchData(rawData: string): GlucoseReading;
    /**
     * Parse data from Dexcom continuous glucose monitors
     */
    static parseDexcomData(rawData: Record<string, unknown>): GlucoseReading;
    /**
     * Parse data from Abbott FreeStyle Libre
     */
    static parseFreestyleLibreData(rawData: Record<string, unknown>): GlucoseReading;
    /**
     * Validate glucose reading
     */
    static validate(reading: GlucoseReading): boolean;
    /**
     * Classify glucose level
     */
    static classifyLevel(reading: GlucoseReading): 'low' | 'normal' | 'high' | 'very_high';
}
