import { HealthDevice, DeviceStatus } from '../types';
export declare function registerDevice(device: HealthDevice): Promise<void>;
export declare function getDevice(deviceId: string): Promise<HealthDevice | null>;
export declare function getDevicesByUser(userId: string): Promise<HealthDevice[]>;
export declare function updateDeviceStatus(deviceId: string, status: DeviceStatus, lastSync?: Date): Promise<void>;
export declare function updateDeviceBattery(deviceId: string, batteryLevel: number): Promise<void>;
export declare function updateDeviceSync(deviceId: string): Promise<void>;
export declare function updateDevice(deviceId: string, updates: Partial<HealthDevice>): Promise<void>;
export declare function deleteDevice(deviceId: string): Promise<void>;
