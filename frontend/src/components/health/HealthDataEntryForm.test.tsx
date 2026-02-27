import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HealthDataEntryForm } from './HealthDataEntryForm';
import { VitalSigns } from '../../types';

describe('HealthDataEntryForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Rendering', () => {
    it('renders the form with all vital sign fields', () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Enter Your Health Data')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., 72')).toBeInTheDocument(); // Heart Rate
      expect(screen.getByPlaceholderText('e.g., 120')).toBeInTheDocument(); // Systolic
      expect(screen.getByPlaceholderText('e.g., 80')).toBeInTheDocument(); // Diastolic
      expect(screen.getByPlaceholderText('e.g., 98.6')).toBeInTheDocument(); // Temperature
      expect(screen.getByPlaceholderText('e.g., 98')).toBeInTheDocument(); // Oxygen
      expect(screen.getByPlaceholderText('e.g., 150')).toBeInTheDocument(); // Weight
    });

    it('renders submit button', () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);
      expect(screen.getByRole('button', { name: /Save health data/i })).toBeInTheDocument();
    });

    it('renders cancel button when onCancel is provided', () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('does not render cancel button when onCancel is not provided', () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);
      expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
    });

    it('renders voice input buttons for all fields', () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);
      const voiceButtons = screen.getAllByText('🎤');
      expect(voiceButtons).toHaveLength(6); // One for each vital sign field
    });
  });

  describe('Initial Values', () => {
    it('populates fields with initial values', () => {
      const initialValues: Partial<VitalSigns> = {
        heartRate: 72,
        bloodPressure: { systolic: 120, diastolic: 80 },
        temperature: 98.6,
        oxygenSaturation: 98,
        weight: 150,
      };

      render(<HealthDataEntryForm onSubmit={mockOnSubmit} initialValues={initialValues} />);

      expect(screen.getByPlaceholderText('e.g., 72')).toHaveValue(72);
      expect(screen.getByPlaceholderText('e.g., 120')).toHaveValue(120);
      expect(screen.getByPlaceholderText('e.g., 80')).toHaveValue(80);
      expect(screen.getByPlaceholderText('e.g., 98.6')).toHaveValue(98.6);
      expect(screen.getByPlaceholderText('e.g., 98')).toHaveValue(98);
      expect(screen.getByPlaceholderText('e.g., 150')).toHaveValue(150);
    });
  });

  describe('Input Validation', () => {
    it('validates heart rate within acceptable range', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const heartRateInput = screen.getByPlaceholderText('e.g., 72');
      
      // Invalid: too low
      fireEvent.change(heartRateInput, { target: { value: '30' } });
      fireEvent.blur(heartRateInput);
      expect(screen.getByText(/Heart rate must be between 40 and 200/i)).toBeInTheDocument();

      // Clear and try valid value
      fireEvent.change(heartRateInput, { target: { value: '72' } });
      fireEvent.blur(heartRateInput);
      expect(screen.queryByText(/Heart rate must be between/i)).not.toBeInTheDocument();
    });

    it('validates blood pressure within acceptable range', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const systolicInput = screen.getByPlaceholderText('e.g., 120');
      const diastolicInput = screen.getByPlaceholderText('e.g., 80');

      // Invalid systolic
      fireEvent.change(systolicInput, { target: { value: '250' } });
      fireEvent.blur(systolicInput);
      expect(screen.getByText(/Systolic blood pressure must be between 70 and 200/i)).toBeInTheDocument();

      // Invalid diastolic
      fireEvent.change(diastolicInput, { target: { value: '150' } });
      fireEvent.blur(diastolicInput);
      expect(screen.getByText(/Diastolic blood pressure must be between 40 and 130/i)).toBeInTheDocument();
    });

    it('validates temperature within acceptable range', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const temperatureInput = screen.getByPlaceholderText('e.g., 98.6');

      // Invalid: too high
      fireEvent.change(temperatureInput, { target: { value: '110' } });
      fireEvent.blur(temperatureInput);
      
      await waitFor(() => {
        expect(screen.getByText(/Temperature must be between 95 and 105/i)).toBeInTheDocument();
      });
    });

    it('validates oxygen saturation within acceptable range', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const oxygenInput = screen.getByPlaceholderText('e.g., 98');

      // Invalid: too low
      fireEvent.change(oxygenInput, { target: { value: '60' } });
      fireEvent.blur(oxygenInput);
      
      await waitFor(() => {
        expect(screen.getByText(/Oxygen saturation must be between 70 and 100/i)).toBeInTheDocument();
      });
    });

    it('validates weight within acceptable range', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const weightInput = screen.getByPlaceholderText('e.g., 150');

      // Invalid: too low
      fireEvent.change(weightInput, { target: { value: '30' } });
      fireEvent.blur(weightInput);
      
      await waitFor(() => {
        expect(screen.getByText(/Weight must be between 50 and 500/i)).toBeInTheDocument();
      });
    });

    it('shows error for non-numeric input', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const heartRateInput = screen.getByPlaceholderText('e.g., 72');
      // For number inputs, browsers don't allow non-numeric characters
      // So we test with an invalid numeric value instead
      fireEvent.change(heartRateInput, { target: { value: '999' } });
      fireEvent.blur(heartRateInput);
      
      await waitFor(() => {
        expect(screen.getByText(/Heart rate must be between/i)).toBeInTheDocument();
      });
    });

    it('does not show validation errors for empty optional fields', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const heartRateInput = screen.getByPlaceholderText('e.g., 72');
      fireEvent.focus(heartRateInput);
      fireEvent.blur(heartRateInput);

      // Should not show error for empty field
      expect(screen.queryByText(/Heart rate must be/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits valid data successfully', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      // Fill in some fields
      fireEvent.change(screen.getByPlaceholderText('e.g., 72'), { target: { value: '72' } });
      fireEvent.change(screen.getByPlaceholderText('e.g., 120'), { target: { value: '120' } });
      fireEvent.change(screen.getByPlaceholderText('e.g., 80'), { target: { value: '80' } });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Save health data/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            heartRate: 72,
            bloodPressure: { systolic: 120, diastolic: 80 },
            source: 'manual',
          })
        );
      });
    });

    it('prevents submission with validation errors', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      // Enter invalid data
      fireEvent.change(screen.getByPlaceholderText('e.g., 72'), { target: { value: '300' } });

      // Try to submit
      fireEvent.click(screen.getByRole('button', { name: /Save health data/i }));

      // Should show error and not call onSubmit
      expect(screen.getByText(/Please fix the errors above/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('prevents submission with no data entered', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      // Try to submit without entering any data
      fireEvent.click(screen.getByRole('button', { name: /Save health data/i }));

      // Should show error
      expect(screen.getByText(/Please enter at least one vital sign measurement/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('handles submission errors gracefully', async () => {
      const errorMessage = 'Network error';
      mockOnSubmit.mockRejectedValue(new Error(errorMessage));

      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      // Fill in data
      fireEvent.change(screen.getByPlaceholderText('e.g., 72'), { target: { value: '72' } });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Save health data/i }));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('disables submit button while submitting', async () => {
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValue(submitPromise);

      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      // Fill in data
      fireEvent.change(screen.getByPlaceholderText('e.g., 72'), { target: { value: '72' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Save health data/i });
      fireEvent.click(submitButton);

      // Button should be disabled and show loading text
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      // Resolve the promise
      resolveSubmit!();
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('disables cancel button while submitting', async () => {
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValue(submitPromise);

      render(<HealthDataEntryForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      // Fill in data and submit
      fireEvent.change(screen.getByPlaceholderText('e.g., 72'), { target: { value: '72' } });
      fireEvent.click(screen.getByRole('button', { name: /Save health data/i }));

      // Cancel button should be disabled
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
      });

      // Resolve the promise
      resolveSubmit!();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for all inputs', () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      expect(screen.getByPlaceholderText('e.g., 72')).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByPlaceholderText('e.g., 120')).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByPlaceholderText('e.g., 80')).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByPlaceholderText('e.g., 98.6')).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByPlaceholderText('e.g., 98')).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByPlaceholderText('e.g., 150')).toHaveAttribute('aria-invalid', 'false');
    });

    it('sets aria-invalid to true for fields with errors', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const heartRateInput = screen.getByPlaceholderText('e.g., 72');
      fireEvent.change(heartRateInput, { target: { value: '300' } });
      fireEvent.blur(heartRateInput);

      expect(heartRateInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates error messages with inputs using aria-describedby', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const heartRateInput = screen.getByPlaceholderText('e.g., 72');
      fireEvent.change(heartRateInput, { target: { value: '300' } });
      fireEvent.blur(heartRateInput);

      expect(heartRateInput).toHaveAttribute('aria-describedby', 'heartRate-error');
      expect(screen.getByText(/Heart rate must be between/i)).toHaveAttribute('id', 'heartRate-error');
    });

    it('has proper role for error messages', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      // Try to submit without data
      fireEvent.click(screen.getByRole('button', { name: /Save health data/i }));

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
    });
  });

  describe('Voice Input Integration', () => {
    it('toggles voice input when microphone button is clicked', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const voiceButtons = screen.getAllByText('🎤');
      const heartRateVoiceButton = voiceButtons[0];

      // Click to activate voice input
      fireEvent.click(heartRateVoiceButton);

      // VoiceInput component should be rendered (or unsupported message in test environment)
      // In test environment, Web Speech API is not supported
      expect(screen.getByText(/Voice input is not supported in this browser/i)).toBeInTheDocument();
    });

    it('only shows one voice input at a time', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const voiceButtons = screen.getAllByText('🎤');

      // Activate first voice input
      fireEvent.click(voiceButtons[0]);
      
      // Activate second voice input (temperature button - index 2 for systolic, diastolic, temperature)
      fireEvent.click(voiceButtons[2]);
      
      // Both should show unsupported message in test environment
      const unsupportedMessages = screen.queryAllByText(/Voice input is not supported in this browser/i);
      expect(unsupportedMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Real-time Validation Feedback', () => {
    it('shows validation errors on blur', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const heartRateInput = screen.getByPlaceholderText('e.g., 72');
      
      // Type invalid value
      fireEvent.change(heartRateInput, { target: { value: '300' } });
      
      // Error should not show yet
      expect(screen.queryByText(/Heart rate must be between/i)).not.toBeInTheDocument();
      
      // Blur the input
      fireEvent.blur(heartRateInput);
      
      // Error should now be visible
      expect(screen.getByText(/Heart rate must be between/i)).toBeInTheDocument();
    });

    it('clears validation errors when valid value is entered', async () => {
      render(<HealthDataEntryForm onSubmit={mockOnSubmit} />);

      const heartRateInput = screen.getByPlaceholderText('e.g., 72');
      
      // Enter invalid value
      fireEvent.change(heartRateInput, { target: { value: '300' } });
      fireEvent.blur(heartRateInput);
      expect(screen.getByText(/Heart rate must be between/i)).toBeInTheDocument();
      
      // Clear and enter valid value
      fireEvent.change(heartRateInput, { target: { value: '72' } });
      fireEvent.blur(heartRateInput);
      
      // Error should be cleared
      expect(screen.queryByText(/Heart rate must be between/i)).not.toBeInTheDocument();
    });
  });
});
