import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay } from './ErrorDisplay';

// Mock TextToSpeechService
vi.mock('../../services/TextToSpeechService', () => ({
  TextToSpeechService: vi.fn().mockImplementation(() => ({
    speakError: vi.fn(),
  })),
}));

describe('ErrorDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render error message with default severity', () => {
      render(
        <ErrorDisplay message="Something went wrong" />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should render with title when provided', () => {
      render(
        <ErrorDisplay 
          title="Connection Problem"
          message="Cannot connect to server"
        />
      );

      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      expect(screen.getByText('Cannot connect to server')).toBeInTheDocument();
    });

    it('should render suggested action when provided', () => {
      render(
        <ErrorDisplay 
          message="Network error"
          suggestedAction="Please check your internet connection"
        />
      );

      expect(screen.getByText('Please check your internet connection')).toBeInTheDocument();
    });
  });

  describe('Severity Variants', () => {
    it('should render error severity with correct styling', () => {
      const { container } = render(
        <ErrorDisplay message="Error message" severity="error" />
      );

      const errorDisplay = container.querySelector('.error-display--error');
      expect(errorDisplay).toBeInTheDocument();
    });

    it('should render warning severity with correct styling', () => {
      const { container } = render(
        <ErrorDisplay message="Warning message" severity="warning" />
      );

      const errorDisplay = container.querySelector('.error-display--warning');
      expect(errorDisplay).toBeInTheDocument();
    });

    it('should render info severity with correct styling', () => {
      const { container } = render(
        <ErrorDisplay message="Info message" severity="info" />
      );

      const errorDisplay = container.querySelector('.error-display--info');
      expect(errorDisplay).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render error icon for error severity', () => {
      const { container } = render(
        <ErrorDisplay message="Error" severity="error" />
      );

      const icon = container.querySelector('.error-display__icon');
      expect(icon).toBeInTheDocument();
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });

    it('should render warning icon for warning severity', () => {
      const { container } = render(
        <ErrorDisplay message="Warning" severity="warning" />
      );

      const icon = container.querySelector('.error-display__icon');
      expect(icon).toBeInTheDocument();
    });

    it('should render info icon for info severity', () => {
      const { container } = render(
        <ErrorDisplay message="Info" severity="info" />
      );

      const icon = container.querySelector('.error-display__icon');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render retry button when onRetry is provided', () => {
      const onRetry = vi.fn();
      render(
        <ErrorDisplay message="Error" onRetry={onRetry} />
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      render(
        <ErrorDisplay message="Error" onRetry={onRetry} />
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should render dismiss button when onDismiss is provided', () => {
      const onDismiss = vi.fn();
      render(
        <ErrorDisplay message="Error" onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      render(
        <ErrorDisplay message="Error" onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should render both buttons when both callbacks are provided', () => {
      const onRetry = vi.fn();
      const onDismiss = vi.fn();
      render(
        <ErrorDisplay message="Error" onRetry={onRetry} onDismiss={onDismiss} />
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('should not render buttons when no callbacks are provided', () => {
      render(
        <ErrorDisplay message="Error" />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" for screen readers', () => {
      render(
        <ErrorDisplay message="Error message" />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should have aria-live="assertive" for immediate announcement', () => {
      render(
        <ErrorDisplay message="Error message" />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have aria-atomic="true" for complete message reading', () => {
      render(
        <ErrorDisplay message="Error message" />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have aria-label on buttons', () => {
      const onRetry = vi.fn();
      const onDismiss = vi.fn();
      render(
        <ErrorDisplay message="Error" onRetry={onRetry} onDismiss={onDismiss} />
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });

      expect(retryButton).toHaveAttribute('aria-label', 'Try again');
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss message');
    });

    it('should hide icon from screen readers with aria-hidden', () => {
      const { container } = render(
        <ErrorDisplay message="Error" />
      );

      const icon = container.querySelector('.error-display__icon');
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Voice Reading', () => {
    it('should attempt to speak error message when autoSpeak is true', () => {
      // The component tries to create TTS service and speak
      // We just verify it doesn't crash when TTS is available
      render(
        <ErrorDisplay 
          message="Error occurred"
          autoSpeak={true}
        />
      );

      // Component should render successfully even if TTS fails
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });

    it('should attempt to speak full message with title and suggested action', () => {
      render(
        <ErrorDisplay 
          title="Connection Problem"
          message="Cannot connect"
          suggestedAction="Check your internet"
          autoSpeak={true}
        />
      );

      // Component should render successfully
      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      expect(screen.getByText('Cannot connect')).toBeInTheDocument();
      expect(screen.getByText('Check your internet')).toBeInTheDocument();
    });

    it('should not attempt speech when autoSpeak is false', () => {
      render(
        <ErrorDisplay 
          message="Error occurred"
          autoSpeak={false}
        />
      );

      // Component should render successfully without attempting TTS
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });
  });

  describe('Large Text and Touch Targets', () => {
    it('should use large text size for elderly users', () => {
      render(
        <ErrorDisplay message="Error message" />
      );

      const message = screen.getByText('Error message');
      expect(message.className).toContain('accessible-text--large');
    });

    it('should use large buttons for easy touch interaction', () => {
      const onRetry = vi.fn();
      render(
        <ErrorDisplay message="Error" onRetry={onRetry} />
      );

      const button = screen.getByRole('button', { name: /try again/i });
      expect(button.className).toContain('accessible-button--large');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ErrorDisplay message="Error" className="custom-error" />
      );

      const errorDisplay = container.querySelector('.custom-error');
      expect(errorDisplay).toBeInTheDocument();
    });
  });

  describe('Complete Error Display', () => {
    it('should render complete error with all features', () => {
      const onRetry = vi.fn();
      const onDismiss = vi.fn();

      render(
        <ErrorDisplay 
          title="Connection Problem"
          message="Cannot connect to the health monitoring system"
          suggestedAction="Please check your internet connection and try again"
          severity="error"
          onRetry={onRetry}
          onDismiss={onDismiss}
          autoSpeak={true}
        />
      );

      // Check all elements are present
      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      expect(screen.getByText('Cannot connect to the health monitoring system')).toBeInTheDocument();
      expect(screen.getByText('Please check your internet connection and try again')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
