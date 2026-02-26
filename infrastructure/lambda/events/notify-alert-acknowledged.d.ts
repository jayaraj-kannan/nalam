import { EventBridgeEvent } from 'aws-lambda';
interface AlertAcknowledgedDetail {
    alertId: string;
    userId: string;
    acknowledgedBy: string;
    acknowledgedAt: string;
    careCircleMembers: string[];
}
export declare function handler(event: EventBridgeEvent<'AlertAcknowledged', AlertAcknowledgedDetail>): Promise<void>;
export {};
