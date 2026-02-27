import React, { useState } from 'react';
import { Button, Text } from '../../accessible';
import './EmergencyAlertWidget.css';

export interface EmergencyAlertWidgetProps {
  userId: string;
  onEmergencyAlert?: () => void;
}

/**
 * Emergency Alert Widget - Prominent emergency button
 * One-tap emergency alert activation
 * Requirements: 3.3, 5.2
 */
export const EmergencyAlertWidget: React.FC<EmergencyAlertWidgetProps> = ({
  userId,
  onEmergencyAlert,
}) => {
  const [alertSent, setAlertSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleEmergencyClick = async () => {
    setSending(true);
    
    try {
      // TODO: Call emergency alert API
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAlertSent(true);
      
      if (onEmergencyAlert) {
        onEmergencyAlert();
      }

      // Reset after 5 seconds
      setTimeout(() => {
        setAlertSent(false);
      }, 5000);
    } catch (error) {
      console.error('Failed to send emergency alert:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="emergency-alert-widget">
      {alertSent ? (
        <div className="emergency-confirmation">
          <Text variant="heading" size="extra-large" weight="bold" color="success" as="h2">
            ✓ Emergency Alert Sent
          </Text>
          <Text variant="body" size="large" color="secondary">
            Your family and emergency contacts have been notified
          </Text>
        </div>
      ) : (
        <>
          <Button
            variant="emergency"
            size="extra-large"
            onClick={handleEmergencyClick}
            disabled={sending}
            className="emergency-button"
            ariaLabel="Emergency Alert - Press to notify family and emergency contacts"
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
          <Text variant="body" size="normal" color="secondary" className="emergency-help-text">
            Press for immediate help
          </Text>
        </>
      )}
    </div>
  );
};
