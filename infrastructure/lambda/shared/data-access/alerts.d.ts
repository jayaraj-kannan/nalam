import { HealthAlert } from '../types';
export declare function createAlert(alert: Omit<HealthAlert, 'id'>): Promise<string>;
export declare function getAlert(alertId: string, timestamp: string): Promise<HealthAlert | null>;
export declare function getAlertsByUser(userId: string, startTime?: Date, endTime?: Date, limit?: number): Promise<HealthAlert[]>;
export declare function getAlertsByStatus(status: string, startTime?: Date, endTime?: Date, limit?: number): Promise<HealthAlert[]>;
export declare function acknowledgeAlert(alertId: string, timestamp: string, acknowledgedBy: string): Promise<void>;
export declare function escalateAlert(alertId: string, timestamp: string, escalationLevel: string): Promise<void>;
export declare function deleteAlert(alertId: string, timestamp: string): Promise<void>;
