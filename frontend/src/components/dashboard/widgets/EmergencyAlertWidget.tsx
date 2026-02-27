import React, { useState } from 'react';
import { Button, Text } from '../../accessible';
import { EmergencyContact } from '../../../types';
import { config } from '../../../config/environments';
import './EmergencyAlertWidget.css';

export interface EmergencyAlertWidgetProps {
  userId: string;
  emergencyContacts?: EmergencyContact[];
  onEmergencyAlert?: () => void;
}

interface EmergencyAlertResponse {
  emergencyId: string;
  alertId: string;
  message: string;
  responders: number;
}

/**
 * Emergency Alert Widget - Prominent emergency button
 * One-tap emergency alert activation with confirmation and status
 * Displays emergency contact information
 * Requirements: 3.3, 5.2
 */
export const EmergencyAlertWidget: React.FC<EmergencyAlertWidgetProps> = ({
  userId,
  emergencyContacts = [],
  onEmergencyAlert,
}) => {
  const [alertSent, setAlertSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertResponse, setAlertResponse] = useState<EmergencyAlertResponse | null>(null);

  const handleEmergencyClick = async () => {
    setSending(true);
    setError(null);
    
    try {
      // Get user's location if available
      let location;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
        } catch (geoError) {
          console.warn('Could not get location:', geoError);
          // Continue without location
        }
      }

      // Call emergency alert API
      const response = await fetch(`${config.apiUrl}/api/v1/health/emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add authentication token
          // 'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          userId,
          type: 'manual_alert',
          severity: 'critical',
          location,
          notes: 'Manual emergency alert triggered by user',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send emergency alert: ${response.statusText}`);
      }

      const data: EmergencyAlertResponse = await response.json();
      setAlertResponse(data);
      setAlertSent(true);
      
      if (onEmergencyAlert) {
        onEmergencyAlert();
      }

      // Reset after 10 seconds
      setTimeout(() => {
        setAlertSent(false);
        setAlertResponse(null);
      }, 10000);
    } catch (err) {
      console.error('Failed to send emergency alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to send emergency alert');
    } finally {
      setSending(false);
    }
  };

  const primaryContact = emergencyContacts.find(c => c.isPrimary);
  const otherContacts = emergencyContacts.filter(c => !c.isPrimary);

  return (
    <div className="emergency-alert-widget">
      {alertSent && alertResponse ? (
        <div className="emergency-confirmation">
          <div className="emergency-confirmation-icon">✓</div>
          <Text variant="heading" size="extra-large" weight="bold" color="success" as="h2">
            Emergency Alert Sent
          </Text>
          <Text variant="body" size="large" color="secondary">
            {alertResponse.responders} {alertResponse.responders === 1 ? 'person has' : 'people have'} been notified
          </Text>
          <Text variant="body" size="normal" color="secondary" className="emergency-id">
            Alert ID: {alertResponse.emergencyId.slice(0, 16)}...
          </Text>
        </div>
      ) : error ? (
        <div className="emergency-error">
          <Text variant="heading" size="large" weight="bold" color="error" as="h2">
            Alert Failed
          </Text>
          <Text variant="body" size="normal" color="error">
            {error}
          </Text>
          <Button
            variant="emergency"
            size="large"
            onClick={handleEmergencyClick}
            className="emergency-retry-button"
          >
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <Button
            variant="emergency"
            size="extra-large"
            onClick={handleEmergencyClick}
            disabled={sending}
            className="emergency-button"
            ariaLabel="Emergency Alert - Press to notify family and emergency contacts immediately"
          >
            {sending ? (
              <>
                <span className="emergency-icon">⏳</span>
                <span>Sending Alert...</span>
              </>
            ) : (
              <>
                <span className="emergency-icon">🚨</span>
                <span>EMERGENCY</span>
              </>
            )}
          </Button>
          <Text variant="body" size="large" color="secondary" className="emergency-help-text">
            Press for immediate help
          </Text>

          {/* Display emergency contacts */}
          {emergencyContacts.length > 0 && (
            <div className="emergency-contacts">
              <Text variant="label" size="normal" weight="semibold" color="secondary" as="h3">
                Emergency Contacts
              </Text>
              
              {primaryContact && (
                <div className="emergency-contact primary-contact">
                  <div className="contact-icon">★</div>
                  <div className="contact-info">
                    <Text variant="body" size="normal" weight="bold" color="primary">
                      {primaryContact.name}
                    </Text>
                    <Text variant="caption" size="normal" color="secondary">
                      {primaryContact.relationship}
                    </Text>
                    <Text variant="body" size="normal" color="primary" className="contact-phone">
                      {primaryContact.phone}
                    </Text>
                  </div>
                </div>
              )}

              {otherContacts.slice(0, 2).map((contact, index) => (
                <div key={index} className="emergency-contact">
                  <div className="contact-icon">👤</div>
                  <div className="contact-info">
                    <Text variant="body" size="normal" weight="semibold" color="primary">
                      {contact.name}
                    </Text>
                    <Text variant="caption" size="normal" color="secondary">
                      {contact.relationship}
                    </Text>
                    <Text variant="body" size="normal" color="primary" className="contact-phone">
                      {contact.phone}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
