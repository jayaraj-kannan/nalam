import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MedicationNotification, MedicationNotificationManager } from './MedicationNotification';
import { MedicationRecord } from '../../types';

const mockMedication: MedicationRecord = {
  id: 'med1',
  userId: 'user123',
  medication: {
    id: 'medication1',
    name: 'Aspirin',
    dosage: '81mg',
    frequency: 'Daily',
    scheduledTimes: ['08:00'],
    startDate: '2024-01-01',
    specialInstructions: 'Take with food',
  },
  scheduledTime: new Date('2024-01-15T08:00:00'),
  status: 'scheduled',
  adherenceScore: 95,
};

describe('MedicationNotification', () => {
  const mockOnConfirm = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should render medication notification with details', () => {
    render(
      <MedicationNotification
        medication={mockMedication}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
        autoPlaySound={false}
      />
    );

    expect(screen.getByText('Time for Your Medication')).toBeInTheDocument();
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('81mg')).toBeInTheDocument();
    expect(screen.getByText(/Take with food/i)).toBeInTheDocument();
  });

  it('should display special instructions when available', () => {
    render(
      <MedicationNotification
        medication={mockMedication}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
        autoPlaySound={false}
      />
    );

    expect(screen.getByText('Instructions:')).toBeInTheDocument();
    expect(screen.getByText('Take with food')).toBeInTheDocument();
  });

  it('should call onConfirm when "I Took It" button is clicked', async () => {
    render(
      <MedicationNotification
        medication={mockMedication}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
        autoPlaySound={false}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /Confirm taken Aspirin/i });
    fireEvent.click(confirmButton);

    // Wait for animation
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('med1');
    });
  });

  it('should call onDismiss when "Remind Me Later" button is clicked', async () => {
    render(
      <MedicationNotification
        medication={mockMedication}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
        autoPlaySound={false}
      />
    );

    const dismissButton = screen.getByRole('button', { name: /Dismiss medication reminder/i });
    fireEvent.click(dismissButton);

    // Wait for animation
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  it('should auto-dismiss after 5 minutes', async () => {
    render(
      <MedicationNotification
        medication={mockMedication}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
        autoPlaySound={false}
      />
    );

    // Fast-forward 5 minutes + animation time
    vi.advanceTimersByTime(5 * 60 * 1000 + 300);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  }, 10000); // Increase timeout for this test

  it('should be visible after mounting', () => {
    const { container } = render(
      <MedicationNotification
        medication={mockMedication}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
        autoPlaySound={false}
      />
    );

    const notification = container.querySelector('.medication-notification');
    expect(notification).toHaveClass('medication-notification--visible');
  });

  it('should have proper accessibility attributes', () => {
    render(
      <MedicationNotification
        medication={mockMedication}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
        autoPlaySound={false}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /Confirm taken Aspirin/i });
    expect(confirmButton).toHaveAttribute('aria-label');

    const dismissButton = screen.getByRole('button', { name: /Dismiss medication reminder/i });
    expect(dismissButton).toHaveAttribute('aria-label');
  });

  it('should use large text for elderly users (Requirement 2.1)', () => {
    const { container } = render(
      <MedicationNotification
        medication={mockMedication}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
        autoPlaySound={false}
      />
    );

    const largeTextElements = container.querySelectorAll('.accessible-text--large, .accessible-text--extra-large');
    expect(largeTextElements.length).toBeGreaterThan(0);
  });
});

describe('MedicationNotificationManager', () => {
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T08:00:00'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should not render when no medications are due', () => {
    const futureMedication: MedicationRecord = {
      ...mockMedication,
      scheduledTime: new Date('2024-01-15T12:00:00'), // 4 hours in future
    };

    const { container } = render(
      <MedicationNotificationManager
        medications={[futureMedication]}
        onConfirm={mockOnConfirm}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render notification for due medication', () => {
    const dueMedication: MedicationRecord = {
      ...mockMedication,
      scheduledTime: new Date('2024-01-15T08:00:00'), // Now
    };

    render(
      <MedicationNotificationManager
        medications={[dueMedication]}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Time for Your Medication')).toBeInTheDocument();
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
  });

  it('should render notification for upcoming medication (within 5 minutes)', () => {
    const upcomingMedication: MedicationRecord = {
      ...mockMedication,
      scheduledTime: new Date('2024-01-15T08:03:00'), // 3 minutes in future
    };

    render(
      <MedicationNotificationManager
        medications={[upcomingMedication]}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Time for Your Medication')).toBeInTheDocument();
  });

  it('should render notification for overdue medication (within 30 minutes)', () => {
    const overdueMedication: MedicationRecord = {
      ...mockMedication,
      scheduledTime: new Date('2024-01-15T07:45:00'), // 15 minutes ago
    };

    render(
      <MedicationNotificationManager
        medications={[overdueMedication]}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Time for Your Medication')).toBeInTheDocument();
  });

  it('should not render notification for already taken medication', () => {
    const takenMedication: MedicationRecord = {
      ...mockMedication,
      status: 'taken',
      takenTime: new Date('2024-01-15T08:00:00'),
    };

    const { container } = render(
      <MedicationNotificationManager
        medications={[takenMedication]}
        onConfirm={mockOnConfirm}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show only one notification when multiple medications are due', () => {
    const medications: MedicationRecord[] = [
      {
        ...mockMedication,
        id: 'med1',
        scheduledTime: new Date('2024-01-15T08:00:00'),
      },
      {
        ...mockMedication,
        id: 'med2',
        medication: { ...mockMedication.medication, name: 'Lisinopril' },
        scheduledTime: new Date('2024-01-15T08:00:00'),
      },
    ];

    render(
      <MedicationNotificationManager
        medications={medications}
        onConfirm={mockOnConfirm}
      />
    );

    // Should only show one notification (the first one)
    const notifications = screen.getAllByText('Time for Your Medication');
    expect(notifications).toHaveLength(1);
  });

  it('should check for due medications every minute', async () => {
    const medications: MedicationRecord[] = [
      {
        ...mockMedication,
        scheduledTime: new Date('2024-01-15T08:02:00'), // 2 minutes in future
      },
    ];

    const { rerender } = render(
      <MedicationNotificationManager
        medications={medications}
        onConfirm={mockOnConfirm}
      />
    );

    // Advance time by 2 minutes
    vi.setSystemTime(new Date('2024-01-15T08:02:00'));
    vi.advanceTimersByTime(60 * 1000);

    // Re-render to trigger check
    rerender(
      <MedicationNotificationManager
        medications={medications}
        onConfirm={mockOnConfirm}
      />
    );

    // Now notification should appear
    await waitFor(() => {
      expect(screen.getByText('Time for Your Medication')).toBeInTheDocument();
    });
  });

  it('should call onConfirm and remove notification when confirmed', async () => {
    const dueMedication: MedicationRecord = {
      ...mockMedication,
      scheduledTime: new Date('2024-01-15T08:00:00'),
    };

    render(
      <MedicationNotificationManager
        medications={[dueMedication]}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /Confirm taken Aspirin/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('med1');
    });
  });
});
