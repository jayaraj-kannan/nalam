import React, { useState, useEffect } from 'react';
import { Button, Text } from '../accessible';
import { MedicationRecord } from '../../types';
import { config } from '../../config/environments';
import './MedicationManagement.css';

export interface MedicationManagementProps {
  userId: string;
}

/**
 * Medication Management Interface - Full page view for medication tracking
 * Features:
 * - Large text medication list
 * - Visual medication schedule
 * - Simple "Taken" confirmation
 * - Medication reminder notifications
 * Requirements: 2.1, 2.2
 */
export const MedicationManagement: React.FC<MedicationManagementProps> = ({ userId }) => {
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMedications();
  }, [userId]);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      setError(null);

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
      setMedications(data.medications || []);
    } catch (err) {
      console.error('Error fetching medications:', err);
      setError('Unable to load medications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMedication = async (medicationId: string) => {
    try {
      setConfirmingId(medicationId);

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
      setError('Unable to confirm medication. Please try again.');
    } finally {
      setConfirmingId(null);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTimeStatus = (scheduledTime: Date, status: string) => {
    if (status === 'taken') return 'taken';
    
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const diffMinutes = (now.getTime() - scheduled.getTime()) / (1000 * 60);

    if (diffMinutes > 30) return 'overdue';
    if (diffMinutes > 0) return 'due';
    if (diffMinutes > -60) return 'upcoming';
    return 'scheduled';
  };

  // Group medications by date
  const groupedMedications = medications.reduce((groups, med) => {
    const dateKey = formatDate(med.scheduledTime);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(med);
    return groups;
  }, {} as Record<string, MedicationRecord[]>);

  // Sort medications within each group by time
  Object.keys(groupedMedications).forEach(dateKey => {
    groupedMedications[dateKey].sort((a, b) => 
      new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  });

  if (loading) {
    return (
      <div className="medication-management">
        <div className="medication-header">
          <Text variant="heading" size="extra-large" weight="bold" as="h1">
            My Medications
          </Text>
        </div>
        <div className="medication-loading">
          <Text variant="body" size="large">Loading your medications...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="medication-management">
        <div className="medication-header">
          <Text variant="heading" size="extra-large" weight="bold" as="h1">
            My Medications
          </Text>
        </div>
        <div className="medication-error">
          <Text variant="body" size="large" color="error">
            {error}
          </Text>
          <Button
            variant="primary"
            size="large"
            onClick={fetchMedications}
            ariaLabel="Try again to load medications"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="medication-management">
      <div className="medication-header">
        <Text variant="heading" size="extra-large" weight="bold" as="h1">
          My Medications
        </Text>
        <Text variant="body" size="large" color="secondary">
          Track your medication schedule
        </Text>
      </div>

      {medications.length === 0 ? (
        <div className="medication-empty">
          <Text variant="body" size="large" color="secondary">
            No medications scheduled
          </Text>
          <Text variant="body" size="normal" color="secondary">
            Your medication schedule will appear here
          </Text>
        </div>
      ) : (
        <div className="medication-schedule">
          {Object.entries(groupedMedications).map(([dateKey, meds]) => (
            <div key={dateKey} className="medication-day-group">
              <div className="medication-day-header">
                <Text variant="heading" size="large" weight="bold" as="h2">
                  {dateKey}
                </Text>
              </div>

              <div className="medication-list">
                {meds.map(med => {
                  const timeStatus = getTimeStatus(med.scheduledTime, med.status);
                  
                  return (
                    <div 
                      key={med.id} 
                      className={`medication-card medication-card--${timeStatus}`}
                    >
                      <div className="medication-time-indicator">
                        <Text variant="heading" size="large" weight="bold">
                          {formatTime(med.scheduledTime)}
                        </Text>
                        {timeStatus === 'overdue' && (
                          <span className="medication-badge medication-badge--overdue">
                            Overdue
                          </span>
                        )}
                        {timeStatus === 'due' && (
                          <span className="medication-badge medication-badge--due">
                            Due Now
                          </span>
                        )}
                        {timeStatus === 'upcoming' && (
                          <span className="medication-badge medication-badge--upcoming">
                            Coming Up
                          </span>
                        )}
                      </div>

                      <div className="medication-details">
                        <Text variant="heading" size="large" weight="bold">
                          {med.medication.name}
                        </Text>
                        <Text variant="body" size="large" color="secondary">
                          {med.medication.dosage}
                        </Text>
                        {med.medication.specialInstructions && (
                          <Text variant="body" size="normal" color="secondary">
                            {med.medication.specialInstructions}
                          </Text>
                        )}
                      </div>

                      <div className="medication-action">
                        {med.status === 'taken' ? (
                          <div className="medication-confirmed">
                            <div className="medication-checkmark">✓</div>
                            <div>
                              <Text variant="body" size="large" weight="bold" color="success">
                                Taken
                              </Text>
                              {med.takenTime && (
                                <Text variant="body" size="normal" color="secondary">
                                  at {formatTime(med.takenTime)}
                                </Text>
                              )}
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="success"
                            size="extra-large"
                            onClick={() => handleConfirmMedication(med.id)}
                            disabled={confirmingId === med.id}
                            ariaLabel={`Mark ${med.medication.name} as taken`}
                          >
                            {confirmingId === med.id ? 'Confirming...' : '✓ Taken'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
