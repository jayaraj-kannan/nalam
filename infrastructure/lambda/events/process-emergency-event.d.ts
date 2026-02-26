import { EventBridgeEvent } from 'aws-lambda';
import { EmergencyType, EmergencySeverity, GeoLocation } from '../shared/types';
interface EmergencyEventDetail {
    emergencyId: string;
    alertId: string;
    userId: string;
    userName: string;
    type: EmergencyType;
    severity: EmergencySeverity;
    timestamp: string;
    location?: GeoLocation;
    symptoms?: string[];
    medicalHistory?: {
        conditions: unknown[];
        medications: unknown[];
        allergies: string[];
        emergencyContacts: unknown[];
        healthcareProviders: unknown[];
    };
    responders: string[];
}
export declare function handler(event: EventBridgeEvent<'EmergencyTriggered', EmergencyEventDetail>): Promise<void>;
export {};
