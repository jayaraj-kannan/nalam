// Device Connectivity Monitoring Lambda Function
// Requirements: 7.1, 7.5

import { EventBridgeEvent } from 'aws-lambda';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { HealthDevice } from '../shared/types';
import { updateDeviceStatus } from '../shared/data-access/devices';

const eventBridgeClient = new EventBridgeClient({});
const dynamoClient = new DynamoDBClient({});

const DEVICES_TABLE = process.env.DEVICES_TABLE!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;

// 15 minutes in milliseconds
const SYNC_INTERVAL_MS = 15 * 60 * 1000;

// Grace period before marking as disconnected (20 minutes)
const DISCONNECT_THRESHOLD_MS = 20 * 60 * 1000;

interface DeviceStatusPayload {
  deviceId: string;
  status: 'connected' | 'disconnected';
  timestamp: string;
}

export async function handler(event: EventBridgeEvent<string, unknown> | DeviceStatusPayload): Promise<void> {
  console.log('Connectivity monitoring triggered:', JSON.stringify(event, null, 2));

  try {
    // Check if this is a device status update from IoT
    if ('deviceId' in event && 'status' in event) {
      await handleDeviceStatusUpdate(event as DeviceStatusPayload);
      return;
    }

    // Otherwise, this is a scheduled check
    await checkAllDeviceConnectivity();
  } catch (error) {
    console.error('Error monitoring device connectivity:', error);
    throw error;
  }
}

async function handleDeviceStatusUpdate(payload: DeviceStatusPayload): Promise<void> {
  console.log(`Device status update: ${payload.deviceId} - ${payload.status}`);

  // Update device status in database
  await updateDeviceStatus(payload.deviceId, payload.status, new Date(payload.timestamp));

  // If device disconnected, send notification
  if (payload.status === 'disconnected') {
    await publishEvent('device.disconnected', {
      deviceId: payload.deviceId,
      timestamp: payload.timestamp,
    });
  } else if (payload.status === 'connected') {
    await publishEvent('device.connected', {
      deviceId: payload.deviceId,
      timestamp: payload.timestamp,
    });
  }
}

async function checkAllDeviceConnectivity(): Promise<void> {
  console.log('Checking connectivity for all devices');

  // Scan all devices
  const scanCommand = new ScanCommand({
    TableName: DEVICES_TABLE,
  });

  const result = await dynamoClient.send(scanCommand);

  if (!result.Items || result.Items.length === 0) {
    console.log('No devices found');
    return;
  }

  const devices = result.Items.map((item) => unmarshall(item) as HealthDevice);
  const now = Date.now();
  let disconnectedCount = 0;
  let reconnectedCount = 0;

  for (const device of devices) {
    // Skip devices that are already in error state
    if (device.status === 'error') {
      continue;
    }

    // Check last sync time
    const lastSync = device.lastSync ? new Date(device.lastSync).getTime() : 0;
    const timeSinceSync = now - lastSync;

    // Device should sync every 15 minutes
    if (timeSinceSync > DISCONNECT_THRESHOLD_MS) {
      // Device hasn't synced in over 20 minutes - mark as disconnected
      if (device.status !== 'disconnected') {
        console.log(`Device ${device.id} is disconnected (last sync: ${new Date(lastSync).toISOString()})`);
        await updateDeviceStatus(device.id, 'disconnected');
        disconnectedCount++;

        // Send notification
        await publishEvent('device.connectivity.lost', {
          deviceId: device.id,
          userId: device.userId,
          lastSync: device.lastSync,
          timeSinceSync: Math.floor(timeSinceSync / 1000 / 60), // minutes
        });
      }
    } else {
      // Device is syncing regularly
      if (device.status === 'disconnected') {
        console.log(`Device ${device.id} has reconnected`);
        await updateDeviceStatus(device.id, 'connected');
        reconnectedCount++;

        // Send notification
        await publishEvent('device.connectivity.restored', {
          deviceId: device.id,
          userId: device.userId,
          lastSync: device.lastSync,
        });
      }
    }
  }

  console.log(`Connectivity check complete: ${disconnectedCount} disconnected, ${reconnectedCount} reconnected`);
}

async function publishEvent(eventType: string, detail: Record<string, unknown>): Promise<void> {
  const command = new PutEventsCommand({
    Entries: [
      {
        Source: 'healthcare.device.connectivity',
        DetailType: eventType,
        Detail: JSON.stringify(detail),
        EventBusName: EVENT_BUS_NAME,
      },
    ],
  });

  await eventBridgeClient.send(command);
  console.log(`Published event: ${eventType}`);
}
