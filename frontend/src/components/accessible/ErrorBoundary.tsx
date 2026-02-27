import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorDisplay } from './ErrorDisplay';
import { getUserFriendlyError } from '../../utils/errorMessages';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors and display user-friendly messages
 * Requirements: 5.4
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error('Error caught by ErrorBoundary:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error tracking service
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Convert technical error to user-friendly message
      const friendlyError = getUserFriendlyError(this.state.error);

      return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
          <ErrorDisplay
            title={friendlyError.title}
            message={friendlyError.message}
            suggestedAction={friendlyError.suggestedAction}
            severity={friendlyError.severity}
            onRetry={this.handleReset}
            autoSpeak={true}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
