import React, { useEffect } from 'react';
import { Text } from './Text';
import { Button } from './Button';
import { TextToSpeechService } from '../../services/TextToSpeechService';
import './ErrorDisplay.css';

export interface ErrorDisplayProps {
  message: string;
  title?: string;
  severity?: 'error' | 'warning' | 'info';
  suggestedAction?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  autoSpeak?: boolean;
  className?: string;
}

/**
 * Accessible error display component for elderly users
 * Features:
 * - Large, clear text with high contrast
 * - Visual icons to support text messages
 * - Voice reading of error messages
 * - Non-technical language with suggested actions
 * 
 * Requirements: 5.4
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message,
  title,
  severity = 'error',
  suggestedAction,
  onRetry,
  onDismiss,
  autoSpeak = true,
  className = '',
}) => {
  useEffect(() => {
    // Automatically speak the error message when displayed
    if (autoSpeak) {
      try {
        const tts = new TextToSpeechService();
        const fullMessage = title 
          ? `${title}. ${message}. ${suggestedAction || ''}`
          : `${message}. ${suggestedAction || ''}`;
        
        tts.speakError(fullMessage);
      } catch (error) {
        console.error('Text-to-speech not available:', error);
      }
    }
  }, [message, title, suggestedAction, autoSpeak]);

  const getIcon = () => {
    switch (severity) {
      case 'error':
        return (
          <svg className="error-display__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="error-display__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'info':
        return (
          <svg className="error-display__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  const getSeverityLabel = () => {
    switch (severity) {
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
    }
  };

  return (
    <div 
      className={`error-display error-display--${severity} ${className}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="error-display__content">
        <div className="error-display__icon-container">
          {getIcon()}
        </div>
        
        <div className="error-display__text">
          {title && (
            <Text 
              variant="heading" 
              size="large" 
              weight="bold"
              color={severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'primary'}
              as="h2"
              className="error-display__title"
            >
              {title}
            </Text>
          )}
          
          <Text 
            variant="body" 
            size="large"
            color={severity === 'error' ? 'error' : 'primary'}
            className="error-display__message"
          >
            {message}
          </Text>
          
          {suggestedAction && (
            <Text 
              variant="body" 
              size="large"
              weight="semibold"
              className="error-display__action-text"
            >
              {suggestedAction}
            </Text>
          )}
        </div>
      </div>
      
      {(onRetry || onDismiss) && (
        <div className="error-display__buttons">
          {onRetry && (
            <Button
              variant="primary"
              size="large"
              onClick={onRetry}
              ariaLabel="Try again"
            >
              Try Again
            </Button>
          )}
          
          {onDismiss && (
            <Button
              variant="secondary"
              size="large"
              onClick={onDismiss}
              ariaLabel="Dismiss message"
            >
              OK
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
