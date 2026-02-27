// Offline Emergency Button Component
// Works even when offline using SMS fallback

import React, { useState, useEffect } from 'react';
import { offlineEmergencyService, EmergencyContact } from '../../services/OfflineEmergencyService';
import './OfflineEmergencyButton.css';

interface OfflineEmergencyButtonProps {
  userId: string;
  className?: string;
}

export const OfflineEmergencyButton: React.FC<OfflineEmergencyButtonProps> = ({
  userId,
  className = '',
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Initialize emergency service
    offlineEmergencyService.init(userId).then(() => {
      setContacts(offlineEmergencyService.getEmergencyContacts());
    });

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId]);

  const handleEmergencyClick = () => {
    setIsConfirming(true);
  };

  const handleConfirm = async () => {
    setIsConfirming(false);
    setIsSending(true);

    try {
      await offlineEmergencyService.triggerEmergencyAlert(userId, 'critical', {
        includeLocation: true,
      });

      // Show success message
      alert(
        isOnline
          ? 'Emergency alert sent to your care circle!'
          : 'Emergency alert queued! SMS sent to emergency contacts. Alert will sync when online.'
      );
    } catch (error) {
      console.error('[Emergency] Failed to send alert:', error);
      alert('Failed to send emergency alert. Please call emergency services directly.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    setIsConfirming(false);
  };

  return (
    <>
      <button
        className={`offline-emergency-button ${className}`}
        onClick={handleEmergencyClick}
        disabled={isSending}
        aria-label="Emergency alert button"
      >
        {isSending ? (
          <>
            <span className="emergency-spinner" />
            <span>Sending...</span>
          </>
        ) : (
          <>
            <span className="emergency-icon">🚨</span>
            <span className="emergency-text">EMERGENCY</span>
          </>
        )}
      </button>

      {!isOnline && (
        <div className="offline-indicator" role="status" aria-live="polite">
          <span className="offline-icon">📡</span>
          <span className="offline-text">Offline - SMS fallback enabled</span>
        </div>
      )}

      {isConfirming && (
        <div
          className="emergency-confirmation-overlay"
          role="dialog"
          aria-labelledby="emergency-confirm-title"
          aria-modal="true"
        >
          <div className="emergency-confirmation-dialog">
            <h2 id="emergency-confirm-title" className="emergency-confirm-title">
              Send Emergency Alert?
            </h2>

            <p className="emergency-confirm-message">
              {isOnline ? (
                <>
                  This will immediately notify your care circle and emergency contacts.
                  Your location will be shared.
                </>
              ) : (
                <>
                  <strong>You are offline.</strong> This will:
                  <br />
                  • Open SMS to send alerts to emergency contacts
                  <br />
                  • Queue alert to sync when online
                  <br />• Share your location
                </>
              )}
            </p>

            {contacts.length > 0 && (
              <div className="emergency-contacts-list">
                <h3>Emergency Contacts:</h3>
                <ul>
                  {contacts.slice(0, 3).map((contact) => (
                    <li key={contact.id}>
                      {contact.name} ({contact.relationship})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {contacts.length === 0 && (
              <div className="emergency-warning">
                ⚠️ No emergency contacts configured. Alert will be queued for sync.
              </div>
            )}

            <div className="emergency-confirm-actions">
              <button
                className="emergency-confirm-button"
                onClick={handleConfirm}
                autoFocus
              >
                Yes, Send Alert
              </button>
              <button className="emergency-cancel-button" onClick={handleCancel}>
                Cancel
              </button>
            </div>

            <p className="emergency-911-note">
              For life-threatening emergencies, call 911 immediately.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
