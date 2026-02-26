import { EventBridgeEvent } from 'aws-lambda';
interface AdherenceCheckEvent {
    source: string;
    'detail-type': string;
    detail?: {
        checkTime?: string;
    };
}
/**
 * Main handler for adherence check event
 */
export declare function handler(event: EventBridgeEvent<string, AdherenceCheckEvent>): Promise<void>;
export {};
