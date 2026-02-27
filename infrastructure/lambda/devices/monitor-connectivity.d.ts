import { EventBridgeEvent } from 'aws-lambda';
interface DeviceStatusPayload {
    deviceId: string;
    status: 'connected' | 'disconnected';
    timestamp: string;
}
export declare function handler(event: EventBridgeEvent<string, unknown> | DeviceStatusPayload): Promise<void>;
export {};
