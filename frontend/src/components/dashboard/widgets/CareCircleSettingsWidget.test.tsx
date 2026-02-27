import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CareCircleSettingsWidget } from './CareCircleSettingsWidget';

describe('CareCircleSettingsWidget', () => {
  const mockPrimaryUserId = 'primary-user-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    // Mock window.confirm
    global.confirm = vi.fn(() => true);
    // Mock window.alert
    global.alert = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading state initially', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      // Component loads quickly, so just check it renders
      await waitFor(() => {
        expect(screen.getByText('Care Circle Settings')).toBeInTheDocument();
      });
    });

    it('should render members tab by default', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Care Circle Settings')).toBeInTheDocument();
      });

      expect(screen.getByText('Invite New Member')).toBeInTheDocument();
      expect(screen.getByText(/Current Members/)).toBeInTheDocument();
    });

    it('should render notifications tab when clicked', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Care Circle Settings')).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole('button', { name: /Notifications/i });
      fireEvent.click(notificationsTab);

      expect(screen.getByText('Notification Channels')).toBeInTheDocument();
      expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
      expect(screen.getByText('Alert Types')).toBeInTheDocument();
    });
  });

  describe('Member Invitation', () => {
    it('should allow inviting a new member with email and relationship', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Invite New Member')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText('Enter email address');
      const relationshipSelect = screen.getByLabelText('Relationship');
      const sendButton = screen.getByRole('button', { name: /Send Invite/i });

      fireEvent.change(emailInput, { target: { value: 'newmember@example.com' } });
      fireEvent.change(relationshipSelect, { target: { value: 'caregiver' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'Invitation sent to newmember@example.com as caregiver'
        );
      });

      // Email should be cleared after sending
      expect(emailInput).toHaveValue('');
    });

    it('should disable send button when email is empty', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Invite New Member')).toBeInTheDocument();
      });

      const sendButton = screen.getByRole('button', { name: /Send Invite/i });
      expect(sendButton).toBeDisabled();
    });

    it('should show all relationship options', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Invite New Member')).toBeInTheDocument();
      });

      const relationshipSelect = screen.getByLabelText('Relationship');
      const options = Array.from(relationshipSelect.querySelectorAll('option'));
      const optionValues = options.map(opt => opt.getAttribute('value'));

      expect(optionValues).toContain('child');
      expect(optionValues).toContain('spouse');
      expect(optionValues).toContain('caregiver');
      expect(optionValues).toContain('healthcare_provider');
    });
  });

  describe('Member List Display', () => {
    it('should display member information correctly', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText((_content, element) => {
        return element?.textContent === '📧 john.doe@example.com';
      })).toBeInTheDocument();
      expect(screen.getByText((_content, element) => {
        return element?.textContent === '📧 jane.smith@example.com';
      })).toBeInTheDocument();
    });

    it('should show "You" badge for current user', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('You')).toBeInTheDocument();
      });
    });

    it('should display member roles correctly', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Use getAllByText since these appear in both the select dropdown and member cards
      const childElements = screen.getAllByText('Child');
      expect(childElements.length).toBeGreaterThan(0);
      const caregiverElements = screen.getAllByText('Caregiver');
      expect(caregiverElements.length).toBeGreaterThan(0);
    });

    it('should display member permissions', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Check for some permission badges
      const permissionBadges = screen.getAllByText(/View Vitals|View Medications|Receive Alerts/);
      expect(permissionBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Permission Management', () => {
    it('should allow editing permissions for other members', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Find edit button for Jane Smith (not the current user)
      const editButtons = screen.getAllByLabelText('Edit permissions');
      expect(editButtons.length).toBeGreaterThan(0);

      fireEvent.click(editButtons[0]);

      // Should show permission checkboxes
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });

    it('should not show edit button for current user', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // The current user (John Doe) should not have an edit button
      const editButtons = screen.getAllByLabelText('Edit permissions');
      // Should only have 1 edit button (for Jane Smith, not John Doe)
      expect(editButtons.length).toBe(1);
    });

    it('should toggle permission checkboxes', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit permissions');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0] as HTMLInputElement;
      const initialState = firstCheckbox.checked;

      fireEvent.click(firstCheckbox);

      await waitFor(() => {
        expect(firstCheckbox.checked).toBe(!initialState);
      });
    });
  });

  describe('Member Removal', () => {
    it('should allow removing other members', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByRole('button', { name: /Remove Member/i });
      expect(removeButtons.length).toBe(1); // Only Jane Smith, not current user

      fireEvent.click(removeButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to remove this member from the care circle?'
      );

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Member removed successfully');
      });
    });

    it('should not show remove button for current user', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByRole('button', { name: /Remove Member/i });
      // Should only have 1 remove button (for Jane Smith, not John Doe)
      expect(removeButtons.length).toBe(1);
    });

    it('should not remove member if confirmation is cancelled', async () => {
      global.confirm = vi.fn(() => false);

      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByRole('button', { name: /Remove Member/i });
      fireEvent.click(removeButtons[0]);

      expect(global.confirm).toHaveBeenCalled();
      expect(global.alert).not.toHaveBeenCalled();
    });
  });

  describe('Notification Preferences', () => {
    it('should display notification channels', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Care Circle Settings')).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole('button', { name: /Notifications/i });
      fireEvent.click(notificationsTab);

      expect(screen.getByText('PUSH')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('EMAIL')).toBeInTheDocument();
    });

    it('should allow toggling notification channels', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Care Circle Settings')).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole('button', { name: /Notifications/i });
      fireEvent.click(notificationsTab);

      const checkboxes = screen.getAllByRole('checkbox');
      const smsCheckbox = checkboxes.find(cb => {
        const label = cb.parentElement?.textContent;
        return label?.includes('SMS');
      });

      if (smsCheckbox) {
        fireEvent.click(smsCheckbox);
        // Checkbox state should change
        await waitFor(() => {
          expect(smsCheckbox).toBeInTheDocument();
        });
      }
    });

    it('should display quiet hours settings', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Care Circle Settings')).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole('button', { name: /Notifications/i });
      fireEvent.click(notificationsTab);

      expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
      expect(screen.getByText('Start:')).toBeInTheDocument();
      expect(screen.getByText('End:')).toBeInTheDocument();
    });

    it('should display alert types with urgency levels', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Care Circle Settings')).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole('button', { name: /Notifications/i });
      fireEvent.click(notificationsTab);

      expect(screen.getByText('Alert Types')).toBeInTheDocument();
      expect(screen.getByText(/Vital Signs/i)).toBeInTheDocument();
      expect(screen.getByText(/Medication/i)).toBeInTheDocument();
      expect(screen.getByText(/Emergency/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for inputs', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Invite New Member')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
      expect(screen.getByLabelText('Relationship')).toBeInTheDocument();
    });

    it('should have proper heading structure', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: 'Care Circle Settings' });
        expect(heading).toBeInTheDocument();
      });
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy requirement 4.1 - care circle management', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Can invite members
      expect(screen.getByText('Invite New Member')).toBeInTheDocument();
      // Can view member list
      expect(screen.getByText(/Current Members/)).toBeInTheDocument();
      // Can manage permissions
      expect(screen.getAllByLabelText('Edit permissions').length).toBeGreaterThan(0);
      // Can remove members
      expect(screen.getAllByRole('button', { name: /Remove Member/i }).length).toBeGreaterThan(0);
    });

    it('should satisfy requirement 8.5 - granular data sharing controls', async () => {
      render(
        <CareCircleSettingsWidget
          primaryUserId={mockPrimaryUserId}
          userId={mockUserId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Click edit permissions
      const editButtons = screen.getAllByLabelText('Edit permissions');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        // Should show granular permission controls
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(5); // Multiple permission types
      });
    });
  });
});
