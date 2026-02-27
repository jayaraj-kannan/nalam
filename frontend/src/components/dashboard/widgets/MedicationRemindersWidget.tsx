import React, { useState, useEffect } from 'react';
import { Button, Text } from '../../accessible';
import { MedicationRecord } from '../../../types';
import { config } from '../../../config/environments';
import './MedicationRemindersWidget.css';

export interface MedicationRemindersWidgetProps {
  userId: string;
  onViewAll?: () => void;
}

/**
 * Medication Reminders Widget - Shows upcoming and due medications
 * Allows users to confirm taking medications
 * Requirements: 2.1, 2.2, 5.2
 */
export const MedicationRemindersWidget: React.FC<MedicationRemindersWidgetProps> = ({ 
  userId,
  onViewAll 
}) => {
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedications();
  }, [userId]);

  const fetchMedications = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${config.apiUrl}/api/v1/medications/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add authentication token
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch medications');
      }

      const data = await response.json();
      
      // Filter to show only today's medications
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysMedications = (data.medications || []).filter((med: MedicationRecord) => {
        const medDate = new Date(med.scheduledTime);
        return medDate >= today && medDate < tomorrow;
      });

      setMedications(todaysMedications);
    } catch (err) {
      console.error('Error fetching medications:', err);
      // Use mock data as fallback for development
      setMedications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMedication = async (medicationId: string) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/v1/medications/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add authentication token
        },
        body: JSON.stringify({
          userId,
          medicationId,
          takenTime: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm medication');
      }

      // Update local state
      setMedications(prev =>
        prev.map(med =>
          med.id === medicationId
            ? { ...med, status: 'taken' as const, takenTime: new Date() }
            : med
        )
      );
    } catch (err) {
      console.error('Error confirming medication:', err);
    }
  };

  if (loading) {
    return (
      <div className="medication-reminders-widget">
        <Text variant="heading" size="large" weight="bold" as="h2">
          Medications
        </Text>
        <Text variant="body" size="large">Loading...</Text>
      </div>
    );
  }

  return (
    <div className="medication-reminders-widget">
      <div className="widget-header">
        <Text variant="heading" size="large" weight="bold" as="h2" className="widget-title">
          Today's Medications
        </Text>
        {onViewAll && (
          <Button
            variant="secondary"
            size="large"
            onClick={onViewAll}
            ariaLabel="View all medications"
          >
            View All
          </Button>
        )}
      </div>

      <div className="medication-list">
        {medications.length === 0 ? (
          <Text variant="body" size="large" color="secondary">
            No medications scheduled for today
          </Text>
        ) : (
          medications.map(med => (
            <div key={med.id} className="medication-item">
              <div className="medication-info">
                <Text variant="body" size="large" weight="bold">
                  {med.medication.name}
                </Text>
                <Text variant="body" size="normal" color="secondary">
                  {med.medication.dosage} - {new Date(med.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </div>
              
              {med.status === 'scheduled' ? (
                <Button
                  variant="success"
                  size="large"
                  onClick={() => handleConfirmMedication(med.id)}
                  ariaLabel={`Confirm taken ${med.medication.name}`}
                >
                  ✓ Taken
                </Button>
              ) : (
                <div className="medication-status">
                  <Text variant="body" size="normal" color="success">
                    ✓ Confirmed
                  </Text>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
