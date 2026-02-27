import { EventBridgeEvent } from 'aws-lambda';
interface MissedAppointmentCheckEvent {
    source: string;
    'detail-type': string;
    detail?: {
        checkTime?: string;
    };
}
/**
 * Main handler for missed appointment check event
 */
export declare function handler(event: EventBridgeEvent<string, MissedAppointmentCheckEvent>): Promise<void>;
export {};
