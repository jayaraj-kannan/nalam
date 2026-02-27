import { describe, it, expect } from 'vitest';
import {
  getUserFriendlyError,
  getErrorByCode,
  formatValidationError,
  getSuccessMessage,
} from './errorMessages';

describe('errorMessages', () => {
  describe('getUserFriendlyError', () => {
    it('should convert network error to user-friendly message', () => {
      const error = new Error('Network request failed');
      const result = getUserFriendlyError(error);

      expect(result.title).toBe('Connection Problem');
      expect(result.message).toContain('cannot connect');
      expect(result.suggestedAction).toContain('internet connection');
      expect(result.severity).toBe('error');
    });

    it('should convert authentication error to user-friendly message', () => {
      const error = new Error('Unauthorized access');
      const result = getUserFriendlyError(error);

      expect(result.title).toBe('Sign In Required');
      expect(result.message).toContain('sign in');
      expect(result.severity).toBe('warning');
    });

    it('should convert permission error to user-friendly message', () => {
      const error = new Error('Access forbidden');
      const result = getUserFriendlyError(error);

      expect(result.title).toBe('Access Not Allowed');
      expect(result.message).toContain('permission');
      expect(result.severity).toBe('warning');
    });

    it('should convert validation error to user-friendly message', () => {
      const error = new Error('Invalid input data');
      const result = getUserFriendlyError(error);

      expect(result.title).toBe('Information Not Correct');
      expect(result.message).toContain('not in the correct format');
      expect(result.severity).toBe('warning');
    });

    it('should convert medication error to user-friendly message', () => {
      const error = new Error('Medication not found');
      const result = getUserFriendlyError(error);

      expect(result.title).toBe('Medication Problem');
      expect(result.message).toContain('medication');
      expect(result.severity).toBe('error');
    });

    it('should convert device error to user-friendly message', () => {
      const error = new Error('Device connection lost');
      const result = getUserFriendlyError(error);

      expect(result.title).toBe('Device Connection Problem');
      expect(result.message).toContain('not connected');
      expect(result.suggestedAction).toContain('turned on');
      expect(result.severity).toBe('warning');
    });

    it('should convert emergency alert error to user-friendly message', () => {
      const error = new Error('Emergency alert failed');
      const result = getUserFriendlyError(error);

      expect(result.title).toBe('Alert Problem');
      expect(result.suggestedAction).toContain('911');
      expect(result.severity).toBe('error');
    });

    it('should convert timeout error to user-friendly message', () => {
      const error = new Error('Request timed out');
      const result = getUserFriendlyError(error);

      expect(result.title).toBe('Taking Too Long');
      expect(result.message).toContain('longer than usual');
      expect(result.severity).toBe('warning');
    });

    it('should convert server error to user-friendly message', () => {
      const error = new Error('Internal server error 500');
      const result = getUserFriendlyError(error);

      expect(result.title).toBe('System Problem');
      expect(result.message).toContain('technical difficulties');
      expect(result.severity).toBe('error');
    });

    it('should convert not found error to user-friendly message', () => {
      const error = new Error('Resource not found 404');
      const result = getUserFriendlyError(error);

      expect(result.title).toBe('Information Not Found');
      expect(result.message).toContain('could not find');
      expect(result.severity).toBe('warning');
    });

    it('should handle string errors', () => {
      const result = getUserFriendlyError('Network error occurred');

      expect(result.title).toBe('Connection Problem');
      expect(result.severity).toBe('error');
    });

    it('should handle unknown errors with default message', () => {
      const error = new Error('Some random error xyz123');
      const result = getUserFriendlyError(error);

      expect(result.title).toBe('Something Went Wrong');
      expect(result.message).toContain('unexpected problem');
      expect(result.suggestedAction).toContain('try again');
      expect(result.severity).toBe('error');
    });

    it('should handle non-Error objects', () => {
      const result = getUserFriendlyError({ code: 'UNKNOWN' });

      expect(result.title).toBe('Something Went Wrong');
      expect(result.severity).toBe('error');
    });
  });

  describe('getErrorByCode', () => {
    it('should return network error for NETWORK_ERROR code', () => {
      const result = getErrorByCode('NETWORK_ERROR');

      expect(result.title).toBe('Connection Problem');
      expect(result.message).toContain('Cannot connect');
      expect(result.severity).toBe('error');
    });

    it('should return auth error for AUTH_REQUIRED code', () => {
      const result = getErrorByCode('AUTH_REQUIRED');

      expect(result.title).toBe('Sign In Required');
      expect(result.severity).toBe('warning');
    });

    it('should return validation error for INVALID_DATA code', () => {
      const result = getErrorByCode('INVALID_DATA');

      expect(result.title).toBe('Information Not Correct');
      expect(result.severity).toBe('warning');
    });

    it('should return device error for DEVICE_DISCONNECTED code', () => {
      const result = getErrorByCode('DEVICE_DISCONNECTED');

      expect(result.title).toBe('Device Not Connected');
      expect(result.severity).toBe('warning');
    });

    it('should return emergency error for EMERGENCY_FAILED code', () => {
      const result = getErrorByCode('EMERGENCY_FAILED');

      expect(result.title).toBe('Emergency Alert Failed');
      expect(result.suggestedAction).toContain('911');
      expect(result.severity).toBe('error');
    });

    it('should fall back to getUserFriendlyError for unknown codes', () => {
      const result = getErrorByCode('UNKNOWN_CODE');

      expect(result.title).toBe('Something Went Wrong');
      expect(result.severity).toBe('error');
    });
  });

  describe('formatValidationError', () => {
    it('should format heart rate validation error', () => {
      const result = formatValidationError('heartRate', 'Must be between 40 and 200');

      expect(result.title).toBe('Please Check Your Entry');
      expect(result.message).toContain('Heart Rate');
      expect(result.suggestedAction).toBe('Must be between 40 and 200');
      expect(result.severity).toBe('warning');
    });

    it('should format blood pressure validation error', () => {
      const result = formatValidationError('systolicBP', 'Must be between 70 and 200');

      expect(result.message).toContain('Blood Pressure (Top Number)');
      expect(result.severity).toBe('warning');
    });

    it('should format temperature validation error', () => {
      const result = formatValidationError('temperature', 'Must be between 95 and 105');

      expect(result.message).toContain('Temperature');
      expect(result.severity).toBe('warning');
    });

    it('should format oxygen saturation validation error', () => {
      const result = formatValidationError('oxygenSaturation', 'Must be between 70 and 100');

      expect(result.message).toContain('Oxygen Level');
      expect(result.severity).toBe('warning');
    });

    it('should format weight validation error', () => {
      const result = formatValidationError('weight', 'Must be a positive number');

      expect(result.message).toContain('Weight');
      expect(result.severity).toBe('warning');
    });

    it('should handle unknown field names', () => {
      const result = formatValidationError('unknownField', 'Invalid value');

      expect(result.message).toContain('unknownField');
      expect(result.suggestedAction).toBe('Invalid value');
      expect(result.severity).toBe('warning');
    });
  });

  describe('getSuccessMessage', () => {
    it('should return medication confirmed success message', () => {
      const result = getSuccessMessage('medication_confirmed');

      expect(result.title).toBe('Medication Recorded');
      expect(result.message).toContain('marked as taken');
    });

    it('should return health data saved success message', () => {
      const result = getSuccessMessage('health_data_saved');

      expect(result.title).toBe('Health Data Saved');
      expect(result.message).toContain('saved successfully');
    });

    it('should return appointment scheduled success message', () => {
      const result = getSuccessMessage('appointment_scheduled');

      expect(result.title).toBe('Appointment Scheduled');
      expect(result.message).toContain('calendar');
    });

    it('should return emergency sent success message', () => {
      const result = getSuccessMessage('emergency_sent');

      expect(result.title).toBe('Emergency Alert Sent');
      expect(result.message).toContain('family members');
    });

    it('should return message sent success message', () => {
      const result = getSuccessMessage('message_sent');

      expect(result.title).toBe('Message Sent');
      expect(result.message).toContain('delivered');
    });

    it('should return default success message for unknown actions', () => {
      const result = getSuccessMessage('unknown_action');

      expect(result.title).toBe('Success');
      expect(result.message).toContain('completed successfully');
    });
  });

  describe('Non-technical language', () => {
    it('should avoid technical jargon in all error messages', () => {
      const technicalErrors = [
        'HTTP 500 Internal Server Error',
        'ECONNREFUSED',
        'TypeError: Cannot read property',
        'Uncaught ReferenceError',
      ];

      technicalErrors.forEach(error => {
        const result = getUserFriendlyError(error);
        
        // Check that the message doesn't contain technical terms
        const message = `${result.title} ${result.message} ${result.suggestedAction}`.toLowerCase();
        expect(message).not.toContain('http');
        expect(message).not.toContain('econnrefused');
        expect(message).not.toContain('typeerror');
        expect(message).not.toContain('referenceerror');
      });
    });

    it('should use simple, clear language for elderly users', () => {
      const error = new Error('Network request failed');
      const result = getUserFriendlyError(error);

      // Check for simple, clear language
      expect(result.message).toMatch(/cannot connect|connection problem/i);
      expect(result.suggestedAction).toMatch(/check|try again/i);
    });
  });
});
