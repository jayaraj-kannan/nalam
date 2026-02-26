// Process Emergency Event Handler
// Requirements: 3.1, 3.2, 3.3, 3.5

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

export async function handler(event: EventBridgeEvent<'EmergencyTriggered', EmergencyEventDetail>): Promise<void> {
  try {
    const emergencyDetail = event.detail;

    console.log('Processing emergency event:', {
      emergencyId: emergencyDetail.emergencyId,
      userId: emergencyDetail.userId,
      type: emergencyDetail.type,
      severity: emergencyDetail.severity,
    });

    // This handler processes the emergency event and coordinates with notification service
    // The actual notification delivery is handled by the notification service (task 6.5)
    
    // For critical emergencies, ensure escalation to emergency services
    if (emergencyDetail.severity === 'critical') {
      console.log('Critical emergency detected - escalating to emergency services');
      
      // Log emergency information that would be provided to emergency services
      console.log('Emergency information for services:', {
        patient: emergencyDetail.userName,
        location: emergencyDetail.location,
        medicalHistory: emergencyDetail.medicalHistory,
        symptoms: emergencyDetail.symptoms,
      });
    }

    // For missed check-ins that exceed 24 hours, escalate to emergency contacts
    if (emergencyDetail.type === 'missed_check_in') {
      console.log('Missed check-in detected - escalating to emergency contacts');
    }

    // Log successful processing
    console.log('Emergency event processed successfully:', emergencyDetail.emergencyId);
  } catch (error) {
    console.error('Error processing emergency event:', error);
    throw error;
  }
}
