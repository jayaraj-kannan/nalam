import React, { useEffect, useState } from 'react';
import { Button, Text } from '../accessible';
import { MedicationRecord } from '../../types';
import './MedicationNotification.css';

export interface MedicationNotificationProps {
  medication: MedicationRecord;
  onConfirm: (medicationId: string) => void;
  onDismiss: () => void;
  autoPlaySound?: boolean;
}

/**
 * Medication Reminder Notification Component
 * Features:
 * - Large, prominent notification display
 * - Audio alert for medication reminders
 * - Simple confirm/dismiss actions
 * - Accessible for elderly users
 * Requirements: 2.1
 */
export const MedicationNotification: React.FC<MedicationNotificationProps> = ({
  medication,
  onConfirm,
  onDismiss,
  autoPlaySound = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setIsVisible(true);

    // Play notification sound
    if (autoPlaySound) {
      playNotificationSound();
    }

    // Auto-dismiss after 5 minutes if not interacted with
    const timeout = setTimeout(() => {
      handleDismiss();
    }, 5 * 60 * 1000);

    return () => clearTimeout(timeout);
  }, []);

  const playNotificationSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const handleConfirm = () => {
    setIsVisible(false);
    setTimeout(() => {
      onConfirm(medication.id);
    }, 300);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className={`medication-notification ${isVisible ? 'medication-notification--visible' : ''}`}>
      <div className="medication-notification-content">
        <div className="medication-notification-icon">
          💊
        </div>

        <div className="medication-notification-details">
          <Text variant="heading" size="extra-large" weight="bold" as="h2">
            Time for Your Medication
          </Text>

          <div className="medication-notification-info">
            <Text variant="heading" size="large" weight="bold">
              {medication.medication.name}
            </Text>
            <Text variant="body" size="large" color="secondary">
              {medication.medication.dosage}
            </Text>
            <Text variant="body" size="large" color="secondary">
              Scheduled: {formatTime(medication.scheduledTime)}
            </Text>
          </div>

          {medication.medication.specialInstructions && (
            <div className="medication-notification-instructions">
              <Text variant="body" size="normal" weight="semibold">
                Instructions:
              </Text>
              <Text variant="body" size="normal">
                {medication.medication.specialInstructions}
              </Text>
            </div>
          )}
        </div>

        <div className="medication-notification-actions">
          <Button
            variant="success"
            size="extra-large"
            onClick={handleConfirm}
            ariaLabel={`Confirm taken ${medication.medication.name}`}
          >
            ✓ I Took It
          </Button>
          <Button
            variant="secondary"
            size="large"
            onClick={handleDismiss}
            ariaLabel="Dismiss medication reminder"
          >
            Remind Me Later
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Medication Notification Manager
 * Manages multiple medication notifications and prevents overlapping
 */
export interface MedicationNotificationManagerProps {
  medications: MedicationRecord[];
  onConfirm: (medicationId: string) => void;
}

export const MedicationNotificationManager: React.FC<MedicationNotificationManagerProps> = ({
  medications,
  onConfirm,
}) => {
  const [activeNotifications, setActiveNotifications] = useState<MedicationRecord[]>([]);

  useEffect(() => {
    // Check for due medications every minute
    const checkInterval = setInterval(() => {
      checkDueMedications();
    }, 60 * 1000);

    // Initial check
    checkDueMedications();

    return () => clearInterval(checkInterval);
  }, [medications]);

  const checkDueMedications = () => {
    const now = new Date();
    const dueMedications = medications.filter(med => {
      if (med.status !== 'scheduled') return false;

      const scheduledTime = new Date(med.scheduledTime);
      const diffMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);

      // Show notification if within 5 minutes before or 30 minutes after scheduled time
      return diffMinutes >= -5 && diffMinutes <= 30;
    });

    setActiveNotifications(dueMedications);
  };

  const handleDismiss = (medicationId: string) => {
    setActiveNotifications(prev => prev.filter(med => med.id !== medicationId));
  };

  const handleConfirm = (medicationId: string) => {
    setActiveNotifications(prev => prev.filter(med => med.id !== medicationId));
    onConfirm(medicationId);
  };

  if (activeNotifications.length === 0) {
    return null;
  }

  // Show only the first notification to avoid overwhelming the user
  const currentNotification = activeNotifications[0];

  return (
    <MedicationNotification
      medication={currentNotification}
      onConfirm={handleConfirm}
      onDismiss={() => handleDismiss(currentNotification.id)}
    />
  );
};
