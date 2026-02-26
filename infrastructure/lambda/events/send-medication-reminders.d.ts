import { EventBridgeEvent } from 'aws-lambda';
interface MedicationReminderEvent {
    source: string;
    'detail-type': string;
    detail?: {
        checkTime?: string;
    };
}
/**
 * Main handler for medication reminder event
 */
export declare function handler(event: EventBridgeEvent<string, MedicationReminderEvent>): Promise<void>;
export {};
