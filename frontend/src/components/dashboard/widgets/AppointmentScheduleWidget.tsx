import React, { useState, useEffect } from 'react';
import { Text } from '../../accessible';
import { AppointmentRecord } from '../../../types';
import './AppointmentScheduleWidget.css';

export interface AppointmentScheduleWidgetProps {
  userId: string;
}

/**
 * Appointment Schedule Widget - Shows upcoming appointments
 * Displays appointment details in clear, visual format
 * Requirements: 6.1, 6.2, 5.2
 */
export const AppointmentScheduleWidget: React.FC<AppointmentScheduleWidgetProps> = ({ userId }) => {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch appointments from API
    // Mock data for now
    const mockAppointments: AppointmentRecord[] = [
      {
        id: '1',
        userId,
        provider: {
          name: 'Dr. Sarah Johnson',
          specialty: 'Primary Care',
          phone: '555-0123',
        },
        type: 'checkup',
        scheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        duration: 30,
        status: 'scheduled',
        reminders: {
          enabled: true,
          times: [24, 2],
          channels: ['push', 'sms'],
        },
        location: 'Main Street Clinic',
      },
      {
        id: '2',
        userId,
        provider: {
          name: 'Dr. Michael Chen',
          specialty: 'Cardiology',
          phone: '555-0456',
        },
        type: 'specialist',
        scheduledTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        duration: 45,
        status: 'scheduled',
        reminders: {
          enabled: true,
          times: [24, 2],
          channels: ['push', 'sms'],
        },
        location: 'Heart Health Center',
      },
    ];

    setTimeout(() => {
      setAppointments(mockAppointments);
      setLoading(false);
    }, 500);
  }, [userId]);

  const formatAppointmentDate = (date: Date) => {
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="appointment-schedule-widget">
        <Text variant="heading" size="large" weight="bold" as="h2">
          Appointments
        </Text>
        <Text variant="body" size="large">Loading...</Text>
      </div>
    );
  }

  return (
    <div className="appointment-schedule-widget">
      <Text variant="heading" size="large" weight="bold" as="h2" className="widget-title">
        Appointments
      </Text>

      <div className="appointment-list">
        {appointments.length === 0 ? (
          <Text variant="body" size="large" color="secondary">
            No upcoming appointments
          </Text>
        ) : (
          appointments.map(apt => (
            <div key={apt.id} className="appointment-item">
              <div className="appointment-date">
                <Text variant="body" size="large" weight="bold" color="primary">
                  {formatAppointmentDate(new Date(apt.scheduledTime))}
                </Text>
                <Text variant="body" size="normal" color="secondary">
                  {new Date(apt.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </div>
              
              <div className="appointment-details">
                <Text variant="body" size="large" weight="semibold">
                  {apt.provider.name}
                </Text>
                <Text variant="body" size="normal" color="secondary">
                  {apt.provider.specialty}
                </Text>
                {apt.location && (
                  <Text variant="body" size="normal" color="secondary">
                    📍 {apt.location}
                  </Text>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
