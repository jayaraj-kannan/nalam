// Medications Table Data Access Layer
// Requirements: 2.4, 8.1, 8.4

import { MedicationRecord, MedicationStatus } from '../types';
import { TABLES, putItem, getItem, queryItems, updateItem, deleteItem } from '../dynamodb-client';

// ============================================================================
// Medication Operations
// ============================================================================

export async function createMedicationRecord(
  record: Omit<MedicationRecord, 'id'>
): Promise<string> {
  const medicationId = `med-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const medicationRecord: MedicationRecord = {
    ...record,
    id: medicationId,
  };

  await putItem(TABLES.MEDICATIONS, {
    userId: medicationRecord.userId,
    medicationId,
    medication: medicationRecord.medication,
    scheduledTime: medicationRecord.scheduledTime.toISOString(),
    takenTime: medicationRecord.takenTime?.toISOString(),
    status: medicationRecord.status,
    adherenceScore: medicationRecord.adherenceScore,
    notes: medicationRecord.notes,
  });

  return medicationId;
}

export async function getMedicationRecord(
  userId: string,
  medicationId: string
): Promise<MedicationRecord | null> {
  const result = await getItem<MedicationRecord>(TABLES.MEDICATIONS, {
    userId,
    medicationId,
  });

  if (!result) return null;

  return {
    ...result,
    scheduledTime: new Date(result.scheduledTime),
    takenTime: result.takenTime ? new Date(result.takenTime) : undefined,
  };
}

export async function getMedicationsByUser(
  userId: string,
  limit?: number
): Promise<MedicationRecord[]> {
  const results = await queryItems<MedicationRecord>(
    TABLES.MEDICATIONS,
    'userId = :userId',
    { ':userId': userId },
    undefined,
    undefined,
    limit
  );

  return results.map((record) => ({
    ...record,
    scheduledTime: new Date(record.scheduledTime),
    takenTime: record.takenTime ? new Date(record.takenTime) : undefined,
  }));
}

export async function updateMedicationStatus(
  userId: string,
  medicationId: string,
  status: MedicationStatus,
  takenTime?: Date,
  notes?: string
): Promise<void> {
  const updateExpressions = ['#status = :status'];
  const expressionAttributeValues: Record<string, unknown> = { ':status': status };
  const expressionAttributeNames: Record<string, string> = { '#status': 'status' };

  if (takenTime) {
    updateExpressions.push('takenTime = :takenTime');
    expressionAttributeValues[':takenTime'] = takenTime.toISOString();
  }

  if (notes) {
    updateExpressions.push('notes = :notes');
    expressionAttributeValues[':notes'] = notes;
  }

  await updateItem(
    TABLES.MEDICATIONS,
    { userId, medicationId },
    `SET ${updateExpressions.join(', ')}`,
    expressionAttributeValues,
    expressionAttributeNames
  );
}

export async function updateAdherenceScore(
  userId: string,
  medicationId: string,
  adherenceScore: number
): Promise<void> {
  await updateItem(
    TABLES.MEDICATIONS,
    { userId, medicationId },
    'SET adherenceScore = :adherenceScore',
    { ':adherenceScore': adherenceScore }
  );
}

export async function deleteMedicationRecord(
  userId: string,
  medicationId: string
): Promise<void> {
  await deleteItem(TABLES.MEDICATIONS, { userId, medicationId });
}
