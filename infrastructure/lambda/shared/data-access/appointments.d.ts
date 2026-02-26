import { AppointmentRecord, AppointmentStatus } from '../types';
export declare function createAppointment(appointment: Omit<AppointmentRecord, 'id'>): Promise<string>;
export declare function getAppointment(userId: string, appointmentId: string): Promise<AppointmentRecord | null>;
export declare function getAppointmentsByUser(userId: string, limit?: number): Promise<AppointmentRecord[]>;
export declare function getUpcomingAppointments(userId: string, startTime?: Date, endTime?: Date, limit?: number): Promise<AppointmentRecord[]>;
export declare function updateAppointmentStatus(userId: string, appointmentId: string, status: AppointmentStatus, notes?: string): Promise<void>;
export declare function updateAppointment(userId: string, appointmentId: string, updates: Partial<AppointmentRecord>): Promise<void>;
export declare function deleteAppointment(userId: string, appointmentId: string): Promise<void>;
