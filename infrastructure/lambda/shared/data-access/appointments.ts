// Appointments Table Data Access Layer
// Requirements: 6.5, 8.1, 8.4

import { AppointmentRecord, AppointmentStatus } from '../types';
import { TABLES, putItem, getItem, queryItems, updateItem, deleteItem } from '../dynamodb-client';

// ============================================================================
// Appointment Operations
// ============================================================================

export async function createAppointment(
  appointment: Omit<AppointmentRecord, 'id'>
): Promise<string> {
  const appointmentId = `appt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const appointmentRecord: AppointmentRecord = {
    ...appointment,
    id: appointmentId,
  };

  await putItem(TABLES.APPOINTMENTS, {
    userId: appointmentRecord.userId,
    appointmentId,
    provider: appointmentRecord.provider,
    type: appointmentRecord.type,
    scheduledTime: appointmentRecord.scheduledTime.toISOString(),
    duration: appointmentRecord.duration,
    status: appointmentRecord.status,
    reminders: appointmentRecord.reminders,
    location: appointmentRecord.location,
    notes: appointmentRecord.notes,
    preparationInstructions: appointmentRecord.preparationInstructions,
  });

  return appointmentId;
}

export async function getAppointment(
  userId: string,
  appointmentId: string
): Promise<AppointmentRecord | null> {
  const result = await getItem<AppointmentRecord>(TABLES.APPOINTMENTS, {
    userId,
    appointmentId,
  });

  if (!result) return null;

  return {
    ...result,
    scheduledTime: new Date(result.scheduledTime),
  };
}

export async function getAppointmentsByUser(
  userId: string,
  limit?: number
): Promise<AppointmentRecord[]> {
  const results = await queryItems<AppointmentRecord>(
    TABLES.APPOINTMENTS,
    'userId = :userId',
    { ':userId': userId },
    undefined,
    undefined,
    limit
  );

  return results.map((record) => ({
    ...record,
    scheduledTime: new Date(record.scheduledTime),
  }));
}

export async function getUpcomingAppointments(
  userId: string,
  startTime?: Date,
  endTime?: Date,
  limit?: number
): Promise<AppointmentRecord[]> {
  let keyConditionExpression = 'userId = :userId';
  const expressionAttributeValues: Record<string, unknown> = { ':userId': userId };

  if (startTime && endTime) {
    keyConditionExpression += ' AND scheduledTime BETWEEN :startTime AND :endTime';
    expressionAttributeValues[':startTime'] = startTime.toISOString();
    expressionAttributeValues[':endTime'] = endTime.toISOString();
  } else if (startTime) {
    keyConditionExpression += ' AND scheduledTime >= :startTime';
    expressionAttributeValues[':startTime'] = startTime.toISOString();
  }

  const results = await queryItems<AppointmentRecord>(
    TABLES.APPOINTMENTS,
    keyConditionExpression,
    expressionAttributeValues,
    'scheduledTime-index',
    undefined,
    limit
  );

  return results.map((record) => ({
    ...record,
    scheduledTime: new Date(record.scheduledTime),
  }));
}

export async function updateAppointmentStatus(
  userId: string,
  appointmentId: string,
  status: AppointmentStatus,
  notes?: string
): Promise<void> {
  const updateExpressions = ['#status = :status'];
  const expressionAttributeValues: Record<string, unknown> = { ':status': status };
  const expressionAttributeNames: Record<string, string> = { '#status': 'status' };

  if (notes) {
    updateExpressions.push('notes = :notes');
    expressionAttributeValues[':notes'] = notes;
  }

  await updateItem(
    TABLES.APPOINTMENTS,
    { userId, appointmentId },
    `SET ${updateExpressions.join(', ')}`,
    expressionAttributeValues,
    expressionAttributeNames
  );
}

export async function updateAppointment(
  userId: string,
  appointmentId: string,
  updates: Partial<AppointmentRecord>
): Promise<void> {
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {};
  const expressionAttributeNames: Record<string, string> = {};

  Object.entries(updates).forEach(([key, value], index) => {
    if (key === 'userId' || key === 'id' || key === 'appointmentId') return;
    
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;
    updateExpressions.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    
    if (key === 'scheduledTime' && value instanceof Date) {
      expressionAttributeValues[attrValue] = value.toISOString();
    } else {
      expressionAttributeValues[attrValue] = value;
    }
  });

  if (updateExpressions.length === 0) return;

  await updateItem(
    TABLES.APPOINTMENTS,
    { userId, appointmentId },
    `SET ${updateExpressions.join(', ')}`,
    expressionAttributeValues,
    expressionAttributeNames
  );
}

export async function deleteAppointment(userId: string, appointmentId: string): Promise<void> {
  await deleteItem(TABLES.APPOINTMENTS, { userId, appointmentId });
}
