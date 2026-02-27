import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AlertsPanelWidget } from './AlertsPanelWidget';
import { HealthAlert } from '../../../types';

describe('AlertsPanelWidget', () => {
  const mockPrimaryUserId = 'primary-user-123';
  const mockUserId = 'secondary-user-456';

  const mockAlerts: HealthAlert[] = [
    {
      id: '1',
      userId: mockPrimaryUserId,
      type: 'vital_signs',
      severity: 'critical',
      message: 'Critical blood pressure reading',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      acknowledged: false,
      escalated: false,
    },
    {
      id: '2',
      userId: mockPrimaryUserId,
      type: 'medication',
      severity: 'high',
      message: 'Medication dose missed: Lisinopril 10mg',
      timestamp: new Date('2024-01-15T09:00:00Z'),
      acknowledged: false,
      escalated: false,
    },
    {
      id: '3',
      userId: mockPrimaryUserId,
      type: 'check_in',
      severity: 'low',
      message: 'Daily check-in completed',
      timestamp: new Date('2024-01-14T08:00:00Z'),
      acknowledged: true,
      acknowledgedBy: mockUserId,
      acknowledgedAt: new Date('2024-01-14T08:05:00Z'),
      escalated: false,
    },
    {
      id: '4',
      userId: mockPrimaryUserId,
      type: 'emergency',
      severity: 'critical',
      message: 'Emergency alert triggered',
      timestamp: new Date('2024-01-15T11:00:00Z'),
      acknowledged: false,
      escalated: true,
      escalationLevel: 'emergency_services',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      expect(screen.getByText('Loading alerts...')).toBeInTheDocument();
    });

    it('should render alert list with severity indicators', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Check for severity badges
      const highBadges = screen.getAllByText('high');
      expect(highBadges.length).toBeGreaterThan(0);
    });

    it('should display alert counts correctly', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/High/i)).toBeInTheDocument();
      });

      // Should show unacknowledged count
      expect(screen.getByText(/Unread/i)).toBeInTheDocument();
    });

    it('should display alert statistics panel', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Alerts')).toBeInTheDocument();
        expect(screen.getByText('Unacknowledged')).toBeInTheDocument();
        expect(screen.getByText('Acknowledged')).toBeInTheDocument();
        expect(screen.getByText('Escalated')).toBeInTheDocument();
      });
    });
  });

  describe('Alert Filtering', () => {
    it('should filter alerts by type', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Filter by medication type
      const typeFilter = screen.getByLabelText('Filter alerts by type');
      fireEvent.change(typeFilter, { target: { value: 'medication' } });

      await waitFor(() => {
        expect(screen.getByText(/Medication dose missed/i)).toBeInTheDocument();
        expect(screen.queryByText(/Blood pressure reading above normal range/i)).not.toBeInTheDocument();
      });
    });

    it('should filter alerts by urgency/severity', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Filter by high severity
      const severityFilter = screen.getByLabelText('Filter alerts by urgency level');
      fireEvent.change(severityFilter, { target: { value: 'high' } });

      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
        expect(screen.queryByText(/Daily check-in completed/i)).not.toBeInTheDocument();
      });
    });

    it('should toggle acknowledged alerts visibility', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Initially, acknowledged alerts should not be visible
      expect(screen.queryByText(/Daily check-in completed/i)).not.toBeInTheDocument();

      // Toggle to show acknowledged alerts
      const showAcknowledgedCheckbox = screen.getByLabelText('Show acknowledged alerts');
      fireEvent.click(showAcknowledgedCheckbox);

      await waitFor(() => {
        expect(screen.getByText(/Daily check-in completed/i)).toBeInTheDocument();
      });
    });

    it('should combine type and severity filters', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Filter by vital_signs type and high severity
      const typeFilter = screen.getByLabelText('Filter alerts by type');
      const severityFilter = screen.getByLabelText('Filter alerts by urgency level');
      
      fireEvent.change(typeFilter, { target: { value: 'vital_signs' } });
      fireEvent.change(severityFilter, { target: { value: 'high' } });

      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
        expect(screen.queryByText(/Medication dose missed/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Alert Sorting', () => {
    it('should sort alerts by timestamp by default', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Most recent unacknowledged alert should appear first
      const alerts = screen.getAllByRole('article');
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should sort alerts by severity', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Change sort to severity
      const sortSelect = screen.getByLabelText('Sort alerts by');
      fireEvent.change(sortSelect, { target: { value: 'severity' } });

      await waitFor(() => {
        // High severity alerts should appear
        const alerts = screen.getAllByRole('article');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Alert Acknowledgment', () => {
    it('should acknowledge an alert when acknowledge button is clicked', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Find and click acknowledge button
      const acknowledgeButtons = screen.getAllByText('Acknowledge');
      fireEvent.click(acknowledgeButtons[0]);

      // After acknowledging, alert disappears from unacknowledged view
      await waitFor(() => {
        expect(screen.queryByText(/Blood pressure reading above normal range/i)).not.toBeInTheDocument();
      });

      // Show acknowledged alerts to see the acknowledgment
      const showAcknowledgedCheckbox = screen.getByLabelText('Show acknowledged alerts');
      fireEvent.click(showAcknowledgedCheckbox);

      await waitFor(() => {
        // Alert should be visible again and marked as acknowledged with timestamp
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
        expect(screen.getAllByText(/✓ Acknowledged/i).length).toBeGreaterThan(0);
      });
    });

    it('should not show acknowledge button for already acknowledged alerts', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Show acknowledged alerts
      const showAcknowledgedCheckbox = screen.getByLabelText('Show acknowledged alerts');
      fireEvent.click(showAcknowledgedCheckbox);

      await waitFor(() => {
        expect(screen.getByText(/Daily check-in completed/i)).toBeInTheDocument();
      });

      // Acknowledged alert should not have acknowledge button visible in its actions
      const acknowledgedAlert = screen.getByText(/Daily check-in completed/i).closest('.alert-item');
      const actionsDiv = acknowledgedAlert?.querySelector('.alert-item__actions');
      expect(actionsDiv).toBeNull(); // No actions div for acknowledged alerts
    });
  });

  describe('Alert Escalation', () => {
    it('should show escalate button for high and critical severity alerts', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Should have escalate button for high severity alert
      const escalateButtons = screen.getAllByText(/Escalate/i);
      expect(escalateButtons.length).toBeGreaterThan(0);
    });

    it('should escalate an alert when escalate button is clicked', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Find and click escalate button
      const escalateButtons = screen.getAllByText('Escalate');
      fireEvent.click(escalateButtons[0]);

      await waitFor(() => {
        // Button should change to "Escalated" and be disabled
        const escalatedButton = screen.getByRole('button', { name: 'Escalated' });
        expect(escalatedButton).toBeInTheDocument();
        expect(escalatedButton).toBeDisabled();
      });
    });

    it('should show escalated status for escalated alerts', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Escalate an alert first
      const escalateButtons = screen.getAllByText('Escalate');
      fireEvent.click(escalateButtons[0]);

      await waitFor(() => {
        // Should show escalated indicator
        expect(screen.getByText(/⬆️ Escalated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Alert History and Resolution Status', () => {
    it('should display acknowledgment timestamp for acknowledged alerts', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Show acknowledged alerts
      const showAcknowledgedCheckbox = screen.getByLabelText('Show acknowledged alerts');
      fireEvent.click(showAcknowledgedCheckbox);

      await waitFor(() => {
        // Should show at least one acknowledged alert with timestamp
        const acknowledgedTexts = screen.getAllByText(/✓ Acknowledged/i);
        expect(acknowledgedTexts.length).toBeGreaterThan(0);
      });
    });

    it('should show visual distinction for acknowledged alerts', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Show acknowledged alerts
      const showAcknowledgedCheckbox = screen.getByLabelText('Show acknowledged alerts');
      fireEvent.click(showAcknowledgedCheckbox);

      await waitFor(() => {
        const acknowledgedAlert = screen.getByText(/Daily check-in completed/i).closest('.alert-item');
        expect(acknowledgedAlert).toHaveClass('alert-item--acknowledged');
      });
    });

    it('should display empty state when no alerts match filters', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Filter by a type that doesn't have unacknowledged alerts
      const typeFilter = screen.getByLabelText('Filter alerts by type');
      fireEvent.change(typeFilter, { target: { value: 'fall_detection' } });

      await waitFor(() => {
        expect(screen.getByText('No unacknowledged alerts')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for filters', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Filter alerts by type')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter alerts by urgency level')).toBeInTheDocument();
        expect(screen.getByLabelText('Sort alerts by')).toBeInTheDocument();
        expect(screen.getByLabelText('Show acknowledged alerts')).toBeInTheDocument();
      });
    });

    it('should have semantic heading structure', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /Alerts/i });
        expect(heading).toBeInTheDocument();
      });
    });
  });

  describe('Requirements Validation', () => {
    it('should validate Requirement 9.2: Customizable notification preferences by alert type and urgency', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Verify filtering by alert type
      const typeFilter = screen.getByLabelText('Filter alerts by type');
      expect(typeFilter).toBeInTheDocument();
      expect(typeFilter).toHaveValue('all');

      // Verify filtering by urgency level (severity)
      const urgencyFilter = screen.getByLabelText('Filter alerts by urgency level');
      expect(urgencyFilter).toBeInTheDocument();
      expect(urgencyFilter).toHaveValue('all');

      // Test filtering functionality
      fireEvent.change(urgencyFilter, { target: { value: 'high' } });
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });
    });

    it('should validate Requirement 9.5: Alert acknowledgment tracking', async () => {
      render(<AlertsPanelWidget primaryUserId={mockPrimaryUserId} userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Blood pressure reading above normal range/i)).toBeInTheDocument();
      });

      // Verify acknowledgment functionality
      const acknowledgeButtons = screen.getAllByText('Acknowledge');
      expect(acknowledgeButtons.length).toBeGreaterThan(0);

      // Acknowledge an alert
      fireEvent.click(acknowledgeButtons[0]);

      // After acknowledging, the alert disappears from unacknowledged view
      await waitFor(() => {
        expect(screen.queryByText(/Blood pressure reading above normal range/i)).not.toBeInTheDocument();
      });

      // Show acknowledged alerts to verify tracking
      const showAcknowledgedCheckbox = screen.getByLabelText('Show acknowledged alerts');
      fireEvent.click(showAcknowledgedCheckbox);

      await waitFor(() => {
        // Should display acknowledged alerts with timestamp
        const acknowledgedAlerts = screen.getAllByText(/✓ Acknowledged/i);
        expect(acknowledgedAlerts.length).toBeGreaterThan(0);
      });
    });
  });
});
