import { TimestreamWriteClient } from '@aws-sdk/client-timestream-write';
import { TimestreamQueryClient } from '@aws-sdk/client-timestream-query';
declare const writeClient: TimestreamWriteClient;
declare const queryClient: TimestreamQueryClient;
/**
 * Table names for different types of health data
 */
export declare const TimestreamTables: {
    readonly VITAL_SIGNS: "vital-signs";
    readonly DEVICE_READINGS: "device-readings";
    readonly SENSOR_DATA: "sensor-data";
};
/**
 * Write vital signs data to Timestream
 */
export declare function writeVitalSigns(userId: string, vitals: {
    heartRate?: number;
    systolicBP?: number;
    diastolicBP?: number;
    temperature?: number;
    oxygenSaturation?: number;
    weight?: number;
}, timestamp?: Date, source?: 'manual' | 'device' | 'wearable'): Promise<void>;
/**
 * Write device readings to Timestream
 */
export declare function writeDeviceReadings(deviceId: string, userId: string, readings: Array<{
    measureName: string;
    value: number;
    unit?: string;
}>, timestamp?: Date, metadata?: {
    batteryLevel?: number;
    signalStrength?: number;
}): Promise<void>;
/**
 * Write sensor data to Timestream
 */
export declare function writeSensorData(sensorId: string, userId: string, sensorType: string, value: number, unit: string, timestamp?: Date): Promise<void>;
/**
 * Query vital signs for a user within a time range
 */
export declare function queryVitalSigns(userId: string, startTime: Date, endTime: Date, measureNames?: string[]): Promise<any[]>;
/**
 * Query device readings for a device within a time range
 */
export declare function queryDeviceReadings(deviceId: string, startTime: Date, endTime: Date): Promise<any[]>;
export { writeClient, queryClient };
