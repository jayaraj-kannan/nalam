import { EventBridgeEvent } from 'aws-lambda';
interface AppointmentReminderEvent {
    source: string;
    'detail-type': string;
    detail?: {
        checkTime?: string;
    };
}
/**
 * Main handler for appointment reminder event
 */
export declare function handler(event: EventBridgeEvent<string, AppointmentReminderEvent>): Promise<void>;
export {};
