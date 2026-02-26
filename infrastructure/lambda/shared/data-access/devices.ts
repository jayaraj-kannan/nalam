// Devices Table Data Access Layer
// Requirements: 7.2, 8.1, 8.4

import { HealthDevice, DeviceStatus } from '../types';
import { TABLES, putItem, getItem, queryItems, updateItem, deleteItem } from '../dynamodb-client';

// ============================================================================
// Device Operations
// ============================================================================

export async function registerDevice(device: HealthDevice): Promise<void> {
  await putItem(TABLES.DEVICES, {
    deviceId: device.id,
    userId: device.userId,
    type: device.type,
    manufacturer: device.manufacturer,
    model: device.model,
    capabilities: device.capabilities,
    connectionType: device.connectionType,
    status: device.status,
    lastSync: device.lastSync?.toISOString(),
    batteryLevel: device.batteryLevel,
    firmwareVersion: device.firmwareVersion,
  });
}

export async function getDevice(deviceId: string): Promise<HealthDevice | null> {
  const result = await getItem<HealthDevice>(TABLES.DEVICES, { deviceId });

  if (!result) return null;

  return {
    ...result,
    lastSync: result.lastSync ? new Date(result.lastSync) : undefined,
  };
}

export async function getDevicesByUser(userId: string): Promise<HealthDevice[]> {
  const results = await queryItems<HealthDevice>(
    TABLES.DEVICES,
    'userId = :userId',
    { ':userId': userId },
    'userId-index'
  );

  return results.map((device) => ({
    ...device,
    lastSync: device.lastSync ? new Date(device.lastSync) : undefined,
  }));
}

export async function updateDeviceStatus(
  deviceId: string,
  status: DeviceStatus,
  lastSync?: Date
): Promise<void> {
  const updateExpressions = ['#status = :status'];
  const expressionAttributeValues: Record<string, unknown> = { ':status': status };
  const expressionAttributeNames: Record<string, string> = { '#status': 'status' };

  if (lastSync) {
    updateExpressions.push('lastSync = :lastSync');
    expressionAttributeValues[':lastSync'] = lastSync.toISOString();
  }

  await updateItem(
    TABLES.DEVICES,
    { deviceId },
    `SET ${updateExpressions.join(', ')}`,
    expressionAttributeValues,
    expressionAttributeNames
  );
}

export async function updateDeviceBattery(
  deviceId: string,
  batteryLevel: number
): Promise<void> {
  await updateItem(
    TABLES.DEVICES,
    { deviceId },
    'SET batteryLevel = :batteryLevel',
    { ':batteryLevel': batteryLevel }
  );
}

export async function updateDeviceSync(deviceId: string): Promise<void> {
  await updateItem(
    TABLES.DEVICES,
    { deviceId },
    'SET lastSync = :lastSync',
    { ':lastSync': new Date().toISOString() }
  );
}

export async function updateDevice(
  deviceId: string,
  updates: Partial<HealthDevice>
): Promise<void> {
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {};
  const expressionAttributeNames: Record<string, string> = {};

  Object.entries(updates).forEach(([key, value], index) => {
    if (key === 'id' || key === 'deviceId') return;
    
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;
    updateExpressions.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    
    if (key === 'lastSync' && value instanceof Date) {
      expressionAttributeValues[attrValue] = value.toISOString();
    } else {
      expressionAttributeValues[attrValue] = value;
    }
  });

  if (updateExpressions.length === 0) return;

  await updateItem(
    TABLES.DEVICES,
    { deviceId },
    `SET ${updateExpressions.join(', ')}`,
    expressionAttributeValues,
    expressionAttributeNames
  );
}

export async function deleteDevice(deviceId: string): Promise<void> {
  await deleteItem(TABLES.DEVICES, { deviceId });
}
