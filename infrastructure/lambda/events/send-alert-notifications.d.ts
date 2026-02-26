import { EventBridgeEvent } from 'aws-lambda';
import { HealthAlert } from '../shared/types';
interface AlertEventDetail {
    alert: HealthAlert;
    userId: string;
}
export declare function handler(event: EventBridgeEvent<'AlertCreated', AlertEventDetail>): Promise<void>;
export {};
