import { SensorReading } from '../../shared/types';
export interface PulseOximeterReading {
    oxygenSaturation: number;
    heartRate: number;
    perfusionIndex?: number;
    timestamp: Date;
}
export declare class PulseOximeterAdapter {
    /**
     * Convert raw pulse oximeter data to standardized sensor readings
     */
    static convertToSensorReadings(data: PulseOximeterReading): SensorReading[];
    /**
     * Parse data from generic pulse oximeters
     */
    static parseGenericData(rawData: string): PulseOximeterReading;
    /**
     * Parse data from Masimo pulse oximeters
     */
    static parseMasimoData(rawData: Record<string, unknown>): PulseOximeterReading;
    /**
     * Validate pulse oximeter reading
     */
    static validate(reading: PulseOximeterReading): boolean;
    /**
     * Classify oxygen saturation level
     */
    static classifySpO2Level(spo2: number): 'critical' | 'low' | 'normal';
}
