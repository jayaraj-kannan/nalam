import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MedicationManagement } from './MedicationManagement';
import { MedicationRecord } from '../../types';

// Mock fetch
global.fetch = vi.fn();

const mockMedications: MedicationRecord[] = [
  {
    id: 'med1',
    userId: 'user123',
    medication: {
      id: 'medication1',
      name: 'Aspirin',
      dosage: '81mg',
      frequency: 'Daily',
      scheduledTimes: ['08:00'],
      startDate: '2024-01-01',
    },
    scheduledTime: new Date('2024-01-15T08:00:00'),
    status: 'scheduled',
    adherenceScore: 95,
  },
  {
    id: 'med2',
    userId: 'user123',
    medication: {
      id: 'medication2',
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Daily',
      scheduledTimes: ['20:00'],
      startDate: '2024-01-01',
      specialInstructions: 'Take with food',
    },
    scheduledTime: new Date('2024-01-15T20:00:00'),
    status: 'scheduled',
    adherenceScore: 92,
  },
  {
    id: 'med3',
    userId: 'user123',
    medication: {
      id: 'medication3',
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      scheduledTimes: ['08:00', '20:00'],
      startDate: '2024-01-01',
    },
    scheduledTime: new Date('2024-01-15T08:00:00'),
    status: 'taken',
    adherenceScore: 98,
    takenTime: new Date('2024-01-15T08:05:00'),
  },
];

describe('MedicationManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));

    render(<MedicationManagement userId="user123" />);

    expect(screen.getByText('My Medications')).toBeInTheDocument();
    expect(screen.getByText('Loading your medications...')).toBeInTheDocument();
  });

  it('should fetch and display medications', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ medications: mockMedications }),
    });

    render(<MedicationManagement userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Aspirin')).toBeInTheDocument();
      expect(screen.getByText('81mg')).toBeInTheDocument();
      expect(screen.getByText('Lisinopril')).toBeInTheDocument();
      expect(screen.getByText('10mg')).toBeInTheDocument();
    });
  });

  it('should display special instructions when available', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ medications: mockMedications }),
    });

    render(<MedicationManagement userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Take with food')).toBeInTheDocument();
    });
  });

  it('should show taken status for confirmed medications', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ medications: mockMedications }),
    });

    render(<MedicationManagement userId="user123" />);

    await waitFor(() => {
      const takenElements = screen.getAllByText('Taken');
      expect(takenElements.length).toBeGreaterThan(0);
    });
  });

  it('should display "Taken" button for scheduled medications', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ medications: mockMedications }),
    });

    render(<MedicationManagement userId="user123" />);

    await waitFor(() => {
      const takenButtons = screen.getAllByRole('button', { name: /Mark.*as taken/i });
      expect(takenButtons.length).toBeGreaterThan(0);
    });
  });

  it('should confirm medication when "Taken" button is clicked', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ medications: [mockMedications[0]] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Medication confirmed' }),
      });

    render(<MedicationManagement userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Aspirin')).toBeInTheDocument();
    });

    const takenButton = screen.getByRole('button', { name: /Mark Aspirin as taken/i });
    fireEvent.click(takenButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/medications/confirm'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('med1'),
        })
      );
    });
  });

  it('should display error message when fetch fails', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<MedicationManagement userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to load medications/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
    });
  });

  it('should retry fetching medications when "Try Again" is clicked', async () => {
    (global.fetch as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ medications: mockMedications }),
      });

    render(<MedicationManagement userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to load medications/i)).toBeInTheDocument();
    });

    const tryAgainButton = screen.getByRole('button', { name: /Try again/i });
    fireEvent.click(tryAgainButton);

    await waitFor(() => {
      expect(screen.getByText('Aspirin')).toBeInTheDocument();
    });
  });

  it('should display empty state when no medications are scheduled', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ medications: [] }),
    });

    render(<MedicationManagement userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('No medications scheduled')).toBeInTheDocument();
    });
  });

  it('should group medications by date', async () => {
    const medicationsOnDifferentDays = [
      {
        ...mockMedications[0],
        scheduledTime: new Date('2024-01-15T08:00:00'),
      },
      {
        ...mockMedications[1],
        id: 'med4',
        scheduledTime: new Date('2024-01-16T08:00:00'),
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ medications: medicationsOnDifferentDays }),
    });

    render(<MedicationManagement userId="user123" />);

    await waitFor(() => {
      // Should have two date headers
      const dateHeaders = screen.getAllByRole('heading', { level: 2 });
      expect(dateHeaders.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should display time status badges correctly', async () => {
    const now = new Date();
    const overdueMed = {
      ...mockMedications[0],
      scheduledTime: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ medications: [overdueMed] }),
    });

    render(<MedicationManagement userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });
  });

  it('should be accessible with proper ARIA labels', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ medications: mockMedications }),
    });

    render(<MedicationManagement userId="user123" />);

    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: 'My Medications', level: 1 });
      expect(heading).toBeInTheDocument();

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  it('should use large text for elderly users (Requirements 2.1, 2.2)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ medications: mockMedications }),
    });

    const { container } = render(<MedicationManagement userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Aspirin')).toBeInTheDocument();
    });

    // Check that text components use large size variants
    const textElements = container.querySelectorAll('.accessible-text--large, .accessible-text--extra-large');
    expect(textElements.length).toBeGreaterThan(0);
  });
});
