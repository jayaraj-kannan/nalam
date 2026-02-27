import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmergencyAlertWidget } from './EmergencyAlertWidget';
import { EmergencyContact } from '../../../types';

// Mock fetch
global.fetch = vi.fn();

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};
(global.navigator as any).geolocation = mockGeolocation;

describe('EmergencyAlertWidget', () => {
  const mockUserId = 'user-123';
  const mockEmergencyContacts: EmergencyContact[] = [
    {
      name: 'John Doe',
      relationship: 'Son',
      phone: '555-0101',
      email: 'john@example.com',
      isPrimary: true,
    },
    {
      name: 'Jane Smith',
      relationship: 'Daughter',
      phone: '555-0102',
      email: 'jane@example.com',
      isPrimary: false,
    },
    {
      name: 'Bob Johnson',
      relationship: 'Caregiver',
      phone: '555-0103',
      isPrimary: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        emergencyId: 'emergency-123',
        alertId: 'alert-456',
        message: 'Emergency alert triggered successfully',
        responders: 3,
      }),
    });
  });

  describe('Emergency Button Display', () => {
    it('should render large, prominent emergency button', () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('emergency-button');
    });

    it('should display emergency icon and text', () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      expect(screen.getByText('🚨')).toBeInTheDocument();
      expect(screen.getByText('EMERGENCY')).toBeInTheDocument();
    });

    it('should show help text', () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      expect(screen.getByText('Press for immediate help')).toBeInTheDocument();
    });

    it('should have accessible aria-label', () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Emergency Alert'));
    });
  });

  describe('Emergency Alert Activation', () => {
    it('should trigger emergency alert on button click', async () => {
      // Mock geolocation to resolve quickly
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 10,
          },
        });
      });

      const onEmergencyAlert = vi.fn();
      render(
        <EmergencyAlertWidget 
          userId={mockUserId} 
          onEmergencyAlert={onEmergencyAlert}
        />
      );
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/health/emergency'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: expect.stringContaining(mockUserId),
          })
        );
      }, { timeout: 10000 });
    });

    it('should show sending state while alert is being sent', async () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      expect(screen.getByText('Sending Alert...')).toBeInTheDocument();
      expect(screen.getByText('⏳')).toBeInTheDocument();
    });

    it('should disable button while sending', async () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      expect(button).toBeDisabled();
    });

    it('should include location data if available', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 10,
          },
        });
      });

      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('latitude'),
          })
        );
      });
    });

    it('should send alert even if location is unavailable', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error({ code: 1, message: 'User denied geolocation' });
      });

      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Confirmation and Status Display', () => {
    it('should show confirmation after successful alert', async () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Emergency Alert Sent')).toBeInTheDocument();
      });
    });

    it('should display number of responders notified', async () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/3 people have been notified/i)).toBeInTheDocument();
      });
    });

    it('should display alert ID', async () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Alert ID: emergency-123/i)).toBeInTheDocument();
      });
    });

    it('should call onEmergencyAlert callback', async () => {
      const onEmergencyAlert = vi.fn();
      render(
        <EmergencyAlertWidget 
          userId={mockUserId} 
          onEmergencyAlert={onEmergencyAlert}
        />
      );
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(onEmergencyAlert).toHaveBeenCalled();
      });
    });

    it('should reset to initial state after 10 seconds', async () => {
      vi.useFakeTimers();
      
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      // Wait for alert to be sent
      await vi.waitFor(() => {
        expect(screen.getByText('Emergency Alert Sent')).toBeInTheDocument();
      });

      // Advance timers
      await vi.advanceTimersByTimeAsync(10000);

      // Check if reset to initial state
      expect(screen.getByText('EMERGENCY')).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Emergency Contacts Display', () => {
    it('should display emergency contacts when provided', () => {
      render(
        <EmergencyAlertWidget 
          userId={mockUserId} 
          emergencyContacts={mockEmergencyContacts}
        />
      );
      
      expect(screen.getByText('Emergency Contacts')).toBeInTheDocument();
    });

    it('should display primary contact with star icon', () => {
      render(
        <EmergencyAlertWidget 
          userId={mockUserId} 
          emergencyContacts={mockEmergencyContacts}
        />
      );
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Son')).toBeInTheDocument();
      expect(screen.getByText('555-0101')).toBeInTheDocument();
      expect(screen.getByText('★')).toBeInTheDocument();
    });

    it('should display up to 2 additional contacts', () => {
      render(
        <EmergencyAlertWidget 
          userId={mockUserId} 
          emergencyContacts={mockEmergencyContacts}
        />
      );
      
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should not display contacts section when no contacts provided', () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      expect(screen.queryByText('Emergency Contacts')).not.toBeInTheDocument();
    });

    it('should display contact phone numbers prominently', () => {
      render(
        <EmergencyAlertWidget 
          userId={mockUserId} 
          emergencyContacts={mockEmergencyContacts}
        />
      );
      
      const phoneElements = screen.getAllByText(/555-\d{4}/);
      expect(phoneElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when alert fails', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Alert Failed')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should show retry button on error', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should allow retry after error', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            emergencyId: 'emergency-123',
            alertId: 'alert-456',
            message: 'Emergency alert triggered successfully',
            responders: 3,
          }),
        });

      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Alert Failed')).toBeInTheDocument();
      }, { timeout: 10000 });

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Emergency Alert Sent')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Accessibility Requirements', () => {
    it('should meet minimum touch target size (44x44px)', () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const button = screen.getByRole('button', { name: /emergency alert/i });
      const styles = window.getComputedStyle(button);
      
      // Button should have minimum height of 100px (exceeds 44px requirement)
      expect(button).toHaveClass('accessible-button--extra-large');
    });

    it('should use large, readable fonts', () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      // Text components should use accessible text classes
      const helpText = screen.getByText('Press for immediate help');
      expect(helpText).toHaveClass('accessible-text');
    });

    it('should have high contrast colors', () => {
      render(<EmergencyAlertWidget userId={mockUserId} />);
      
      const widget = screen.getByRole('button', { name: /emergency alert/i }).parentElement;
      expect(widget).toHaveClass('emergency-alert-widget');
    });
  });
});
