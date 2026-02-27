// Data Sharing Controls Tests
// Requirements: 8.5 - Test granular data sharing controls

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataSharingControls } from './DataSharingControls';

// Mock fetch
global.fetch = vi.fn();

const mockMembers = {
  permissionMatrix: {
    'user-123': {
      name: 'John Doe',
      email: 'john@example.com',
      relationship: 'Son',
      permissions: {
        canViewVitals: true,
        canViewMedications: true,
        canViewAppointments: true,
        canViewHealthRecords: false,
        canReceiveAlerts: true,
        canSendMessages: true,
        canManageDevices: false,
      },
      joinedAt: '2024-01-01T00:00:00Z',
    },
    'user-456': {
      name: 'Jane Smith',
      email: 'jane@example.com',
      relationship: 'Daughter',
      permissions: {
        canViewVitals: true,
        canViewMedications: false,
        canViewAppointments: true,
        canViewHealthRecords: false,
        canReceiveAlerts: true,
        canSendMessages: true,
        canManageDevices: false,
      },
      joinedAt: '2024-01-02T00:00:00Z',
    },
  },
};

describe('DataSharingControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
  });

  it('should render loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    
    render(<DataSharingControls primaryUserId="primary-123" />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should load and display care circle members', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<DataSharingControls primaryUserId="primary-123" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('Son')).toBeInTheDocument();
    expect(screen.getByText('Daughter')).toBeInTheDocument();
  });

  it('should display empty state when no members', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ permissionMatrix: {} }),
    });

    render(<DataSharingControls primaryUserId="primary-123" />);

    await waitFor(() => {
      expect(screen.getByText('No care circle members yet.')).toBeInTheDocument();
    });
  });

  it('should select first member by default', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<DataSharingControls primaryUserId="primary-123" />);

    await waitFor(() => {
      const memberButton = screen.getByRole('button', { name: /John Doe/i });
      expect(memberButton).toHaveClass('selected');
    });
  });

  it('should switch selected member on click', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<DataSharingControls primaryUserId="primary-123" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const janeButton = screen.getByRole('button', { name: /Jane Smith/i });
    fireEvent.click(janeButton);

    expect(janeButton).toHaveClass('selected');
  });

  it('should display permissions for selected member', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<DataSharingControls primaryUserId="primary-123" />);

    await waitFor(() => {
      expect(screen.getByText('View Vital Signs')).toBeInTheDocument();
      expect(screen.getByText('View Medications')).toBeInTheDocument();
      expect(screen.getByText('View Appointments')).toBeInTheDocument();
      expect(screen.getByText('View Health Records')).toBeInTheDocument();
    });
  });

  it('should update permission when checkbox is toggled', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembers,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Permissions updated' }),
      });

    render(<DataSharingControls primaryUserId="primary-123" />);

    await waitFor(() => {
      expect(screen.getByText('View Health Records')).toBeInTheDocument();
    });

    const healthRecordsCheckbox = screen.getByLabelText(/View Health Records/i);
    fireEvent.click(healthRecordsCheckbox);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/permissions/primary-123/members/user-123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            permissions: {
              canViewHealthRecords: true,
            },
          }),
        })
      );
    });

    expect(screen.getByText('Permissions updated successfully')).toBeInTheDocument();
  });

  it('should apply full access preset', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembers,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Preset applied' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembers,
      });

    render(<DataSharingControls primaryUserId="primary-123" />);

    await waitFor(() => {
      expect(screen.getByText('Full Access')).toBeInTheDocument();
    });

    const fullAccessButton = screen.getByRole('button', { name: 'Full Access' });
    fireEvent.click(fullAccessButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/permissions/primary-123/members/user-123',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('canViewHealthRecords'),
        })
      );
    });
  });

  it('should apply limited access preset', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembers,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Preset applied' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembers,
      });

    render(<DataSharingControls primaryUserId="primary-123" />);

    await waitFor(() => {
      expect(screen.getByText('Limited Access')).toBeInTheDocument();
    });

    const limitedAccessButton = screen.getByRole('button', { name: 'Limited Access' });
    fireEvent.click(limitedAccessButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/permissions/primary-123/members/user-123',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  it('should display error message on API failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<DataSharingControls primaryUserId="primary-123" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });
  });

  it('should show audit notice', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<DataSharingControls primaryUserId="primary-123" />);

    await waitFor(() => {
      expect(
        screen.getByText(/All permission changes are logged/i)
      ).toBeInTheDocument();
    });
  });

  it('should call onPermissionsUpdated callback', async () => {
    const onPermissionsUpdated = vi.fn();
    
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembers,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Updated' }),
      });

    render(
      <DataSharingControls
        primaryUserId="primary-123"
        onPermissionsUpdated={onPermissionsUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('View Vital Signs')).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText(/View Health Records/i);
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(onPermissionsUpdated).toHaveBeenCalled();
    });
  });

  it('should be accessible with keyboard navigation', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    });

    render(<DataSharingControls primaryUserId="primary-123" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const memberButton = screen.getByRole('button', { name: /John Doe/i });
    memberButton.focus();
    expect(document.activeElement).toBe(memberButton);
  });
});
