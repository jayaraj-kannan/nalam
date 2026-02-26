import { MedicationRecord, MedicationStatus } from '../types';
export declare function createMedicationRecord(record: Omit<MedicationRecord, 'id'>): Promise<string>;
export declare function getMedicationRecord(userId: string, medicationId: string): Promise<MedicationRecord | null>;
export declare function getMedicationsByUser(userId: string, limit?: number): Promise<MedicationRecord[]>;
export declare function updateMedicationStatus(userId: string, medicationId: string, status: MedicationStatus, takenTime?: Date, notes?: string): Promise<void>;
export declare function updateAdherenceScore(userId: string, medicationId: string, adherenceScore: number): Promise<void>;
export declare function deleteMedicationRecord(userId: string, medicationId: string): Promise<void>;
