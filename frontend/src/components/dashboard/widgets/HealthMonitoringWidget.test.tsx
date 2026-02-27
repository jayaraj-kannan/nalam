import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HealthMonitoringWidget } from './HealthMonitoringWidget';
import { HealthTrend, VitalSigns, MedicationRecord, AppointmentRecord } from '../../../types';

describe('HealthMonitoringWidget', () => {
  // Use recent dates that will pass the time range filter
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(now.getDate() - 2);

  const mockHealthTrends: HealthTrend[] = [
    {
      metric: 'heartRate',
      timeRange: { start: twoDaysAgo, end: now },
      dataPoints: [
        { timestamp: twoDaysAgo, value: 72, source: 'device' },
        { timestamp: yesterday, value: 75, source: 'device' },
      ],
      trend: 'stable',
      analysis: 'Heart rate remains within normal range',
    },
    {
      metric: 'bloodPressure',
      timeRange: { start: twoDaysAgo, end: now },
      dataPoints: [
        { timestamp: twoDaysAgo, value: 120, source: 'device' },
        { timestamp: yesterday, value: 118, source: 'device' },
      ],
      trend: 'improving',
      analysis: 'Blood pressure showing improvement',
    },
  ];

  const mockVitalHistory: VitalSigns[] = [
    {
      heartRate: 72,
      bloodPressure: { systolic: 120, diastolic: 80 },
      temperature: 98.6,
      oxygenSaturation: 98,
      weight: 165,
      timestamp: yesterday,
      source: 'device',
    },
    {
      heartRate: 75,
      bloodPressure: { systolic: 118, diastolic: 78 },
      temperature: 98.4,
      oxygenSaturation: 97,
      weight: 164.5,
      timestamp: twoDaysAgo,
      source: 'manual',
    },
  ];

  const mockMedicationAdherence = {
    score: 85,
    history: [
      {
        id: 'med-1',
        userId: 'user-1',
        medication: {
          id: 'med-1',
          name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'daily',
          scheduledTimes: ['08:00'],
          startDate: '2024-01-01',
        },
        scheduledTime: yesterday,
        takenTime: yesterday,
        status: 'taken' as const,
        adherenceScore: 100,
      },
      {
        id: 'med-2',
        userId: 'user-1',
        medication: {
          id: 'med-2',
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'twice daily',
          scheduledTimes: ['08:00', '20:00'],
          startDate: '2024-01-01',
        },
        scheduledTime: twoDaysAgo,
        status: 'missed' as const,
        adherenceScore: 0,
      },
    ],
    missedDoses: 3,
    takenDoses: 17,
  };

  const futureDate = new Date(now);
  futureDate.setDate(now.getDate() + 7);
  const pastDate = new Date(now);
  pastDate.setDate(now.getDate() - 14);

  const mockAppointmentHistory: AppointmentRecord[] = [
    {
      id: 'appt-1',
      userId: 'user-1',
      provider: {
        name: 'Dr. Smith',
        specialty: 'Cardiology',
        phone: '555-0100',
      },
      type: 'checkup',
      scheduledTime: futureDate,
      status: 'scheduled',
      reminders: {
        enabled: true,
        times: [24, 2],
        channels: ['push', 'email'],
      },
      location: '123 Medical Center',
    },
    {
      id: 'appt-2',
      userId: 'user-1',
      provider: {
        name: 'Dr. Johnson',
        specialty: 'Primary Care',
        phone: '555-0200',
      },
      type: 'follow_up',
      scheduledTime: pastDate,
      status: 'completed',
      reminders: {
        enabled: true,
        times: [24, 2],
        channels: ['push'],
      },
    },
  ];

  const defaultProps = {
    primaryUserId: 'user-1',
    healthTrends: mockHealthTrends,
    vitalHistory: mockVitalHistory,
    medicationAdherence: mockMedicationAdherence,
    appointmentHistory: mockAppointmentHistory,
  };

  it('renders the health monitoring widget', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    expect(screen.getByText('Detailed Health Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive health data for primary user')).toBeInTheDocument();
  });

  it('displays vital signs trends section', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    expect(screen.getByText('Vital Signs Trends & Patterns')).toBeInTheDocument();
    expect(screen.getByLabelText('View heart rate trends')).toBeInTheDocument();
    expect(screen.getByLabelText('View blood pressure trends')).toBeInTheDocument();
    expect(screen.getByLabelText('View oxygen saturation trends')).toBeInTheDocument();
  });

  it('allows switching between different vital metrics', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    const bloodPressureButton = screen.getByLabelText('View blood pressure trends');
    fireEvent.click(bloodPressureButton);
    
    expect(bloodPressureButton.classList.contains('metric-button--active')).toBe(true);
  });

  it('allows switching between time ranges', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    const monthButton = screen.getByLabelText('View past month');
    fireEvent.click(monthButton);
    
    expect(monthButton.classList.contains('time-button--active')).toBe(true);
  });

  it('displays trend analysis for selected metric', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    // Heart rate is selected by default and has 'stable' trend
    expect(screen.getByText('STABLE')).toBeInTheDocument();
    expect(screen.getByText('Heart rate remains within normal range')).toBeInTheDocument();
  });

  it('displays medication adherence section', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    expect(screen.getByText('Medication Adherence')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Overall Adherence')).toBeInTheDocument();
  });

  it('displays medication adherence statistics', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    expect(screen.getByText('17')).toBeInTheDocument(); // Taken doses
    expect(screen.getByText('3')).toBeInTheDocument(); // Missed doses
    expect(screen.getByText('20')).toBeInTheDocument(); // Total doses
  });

  it('displays medication history', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    expect(screen.getByText('Recent Medication History')).toBeInTheDocument();
    expect(screen.getByText('Lisinopril')).toBeInTheDocument();
    expect(screen.getByText('Metformin')).toBeInTheDocument();
  });

  it('displays appointment schedule section', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    expect(screen.getByText('Appointment Schedule & History')).toBeInTheDocument();
    expect(screen.getByText(/Upcoming Appointments/)).toBeInTheDocument();
    expect(screen.getByText('Past Appointments')).toBeInTheDocument();
  });

  it('displays upcoming appointments', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    expect(screen.getByText(/123 Medical Center/)).toBeInTheDocument();
  });

  it('displays past appointments', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    expect(screen.getByText('Dr. Johnson')).toBeInTheDocument();
  });

  it('displays chart for vital signs data', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    const svg = document.querySelector('.health-chart');
    expect(svg).toBeInTheDocument();
  });

  it('displays recent readings table', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    expect(screen.getByText('Recent Readings')).toBeInTheDocument();
    // Check for formatted heart rate values using regex
    expect(screen.getByText(/72 bpm/)).toBeInTheDocument();
    expect(screen.getByText(/75 bpm/)).toBeInTheDocument();
  });

  it('handles empty vital history gracefully', () => {
    const propsWithNoVitals = {
      ...defaultProps,
      vitalHistory: [],
    };
    
    render(<HealthMonitoringWidget {...propsWithNoVitals} />);
    
    expect(screen.getByText('No data available for selected time range')).toBeInTheDocument();
  });

  it('handles empty medication history gracefully', () => {
    const propsWithNoMeds = {
      ...defaultProps,
      medicationAdherence: {
        score: 0,
        history: [],
        missedDoses: 0,
        takenDoses: 0,
      },
    };
    
    render(<HealthMonitoringWidget {...propsWithNoMeds} />);
    
    expect(screen.getByText('Medication Adherence')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('handles empty appointment history gracefully', () => {
    const propsWithNoAppointments = {
      ...defaultProps,
      appointmentHistory: [],
    };
    
    render(<HealthMonitoringWidget {...propsWithNoAppointments} />);
    
    expect(screen.getByText('No upcoming appointments')).toBeInTheDocument();
    expect(screen.getByText('No past appointments')).toBeInTheDocument();
  });

  it('displays correct adherence color based on score', () => {
    const { container } = render(<HealthMonitoringWidget {...defaultProps} />);
    
    const adherenceScore = container.querySelector('.adherence-score--success');
    expect(adherenceScore).toBeInTheDocument();
  });

  it('displays warning color for low adherence', () => {
    const propsWithLowAdherence = {
      ...defaultProps,
      medicationAdherence: {
        ...mockMedicationAdherence,
        score: 65,
      },
    };
    
    const { container } = render(<HealthMonitoringWidget {...propsWithLowAdherence} />);
    
    const adherenceScore = container.querySelector('.adherence-score--warning');
    expect(adherenceScore).toBeInTheDocument();
  });

  it('displays error color for very low adherence', () => {
    const propsWithVeryLowAdherence = {
      ...defaultProps,
      medicationAdherence: {
        ...mockMedicationAdherence,
        score: 45,
      },
    };
    
    const { container } = render(<HealthMonitoringWidget {...propsWithVeryLowAdherence} />);
    
    const adherenceScore = container.querySelector('.adherence-score--error');
    expect(adherenceScore).toBeInTheDocument();
  });

  it('formats blood pressure values correctly', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    const bloodPressureButton = screen.getByLabelText('View blood pressure trends');
    fireEvent.click(bloodPressureButton);
    
    expect(screen.getByText(/120\/80 mmHg/)).toBeInTheDocument();
  });

  it('formats temperature values correctly', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    const temperatureButton = screen.getByLabelText('View temperature trends');
    fireEvent.click(temperatureButton);
    
    expect(screen.getByText(/98\.6°F/)).toBeInTheDocument();
  });

  it('formats oxygen saturation values correctly', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    const oxygenButton = screen.getByLabelText('View oxygen saturation trends');
    fireEvent.click(oxygenButton);
    
    expect(screen.getByText(/98%/)).toBeInTheDocument();
  });

  it('formats weight values correctly', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    const weightButton = screen.getByLabelText('View weight trends');
    fireEvent.click(weightButton);
    
    expect(screen.getByText(/165\.0 lbs/)).toBeInTheDocument();
  });

  it('displays medication status correctly', () => {
    const { container } = render(<HealthMonitoringWidget {...defaultProps} />);
    
    expect(screen.getByText('TAKEN')).toBeInTheDocument();
    expect(screen.getByText('MISSED')).toBeInTheDocument();
  });

  it('displays appointment status correctly', () => {
    const { container } = render(<HealthMonitoringWidget {...defaultProps} />);
    
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('shows data source for vital readings', () => {
    render(<HealthMonitoringWidget {...defaultProps} />);
    
    expect(screen.getByText(/device/)).toBeInTheDocument();
    expect(screen.getByText(/manual/)).toBeInTheDocument();
  });

  it('limits medication history to 10 items', () => {
    const manyMedications = Array.from({ length: 15 }, (_, i) => ({
      id: `med-${i}`,
      userId: 'user-1',
      medication: {
        id: `med-${i}`,
        name: `Medication ${i}`,
        dosage: '10mg',
        frequency: 'daily',
        scheduledTimes: ['08:00'],
        startDate: '2024-01-01',
      },
      scheduledTime: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
      status: 'taken' as const,
      adherenceScore: 100,
    }));

    const propsWithManyMeds = {
      ...defaultProps,
      medicationAdherence: {
        ...mockMedicationAdherence,
        history: manyMedications,
      },
    };

    const { container } = render(<HealthMonitoringWidget {...propsWithManyMeds} />);
    
    const historyItems = container.querySelectorAll('.history-item');
    expect(historyItems.length).toBe(10);
  });

  it('limits past appointments to 5 items', () => {
    const manyAppointments = Array.from({ length: 10 }, (_, i) => ({
      id: `appt-${i}`,
      userId: 'user-1',
      provider: {
        name: `Dr. Provider ${i}`,
        specialty: 'General',
        phone: '555-0000',
      },
      type: 'checkup' as const,
      scheduledTime: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
      status: 'completed' as const,
      reminders: {
        enabled: true,
        times: [24],
        channels: ['push' as const],
      },
    }));

    const propsWithManyAppointments = {
      ...defaultProps,
      appointmentHistory: manyAppointments,
    };

    const { container } = render(<HealthMonitoringWidget {...propsWithManyAppointments} />);
    
    const pastAppointments = container.querySelectorAll('.appointment-card--past');
    expect(pastAppointments.length).toBe(5);
  });
});
