import { HealthRecord, HealthRecordType } from '../types';
export declare function createHealthRecord(record: Omit<HealthRecord, 'id'>): Promise<string>;
export declare function getHealthRecord(userId: string, timestamp: string): Promise<HealthRecord | null>;
export declare function getHealthRecordsByUser(userId: string, startTime?: Date, endTime?: Date, limit?: number): Promise<HealthRecord[]>;
export declare function getHealthRecordsByType(type: HealthRecordType, startTime?: Date, endTime?: Date, limit?: number): Promise<HealthRecord[]>;
export declare function deleteHealthRecord(userId: string, timestamp: string): Promise<void>;
