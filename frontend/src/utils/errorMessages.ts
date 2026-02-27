/**
 * Error Message Utilities
 * Converts technical errors to elderly-friendly, non-technical messages
 * Requirements: 5.4
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  suggestedAction: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Convert technical error to user-friendly message
 */
export function getUserFriendlyError(error: Error | string | unknown): UserFriendlyError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Device errors (check before general connection errors)
  if (lowerMessage.includes('device') || lowerMessage.includes('bluetooth')) {
    return {
      title: 'Device Connection Problem',
      message: 'Your health device is not connected.',
      suggestedAction: 'Make sure your device is turned on and nearby. You can also enter your readings manually.',
      severity: 'warning',
    };
  }

  // Network and connectivity errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed') || lowerMessage.includes('connection')) {
    return {
      title: 'Connection Problem',
      message: 'We cannot connect to the health monitoring system right now.',
      suggestedAction: 'Please check your internet connection and try again. If the problem continues, contact your family member.',
      severity: 'error',
    };
  }

  // Authentication errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication') || lowerMessage.includes('login')) {
    return {
      title: 'Sign In Required',
      message: 'You need to sign in again to continue.',
      suggestedAction: 'Please sign in with your username and password.',
      severity: 'warning',
    };
  }

  // Permission errors
  if (lowerMessage.includes('forbidden') || lowerMessage.includes('permission') || lowerMessage.includes('access denied')) {
    return {
      title: 'Access Not Allowed',
      message: 'You do not have permission to view this information.',
      suggestedAction: 'Contact your family member if you need access to this information.',
      severity: 'warning',
    };
  }

  // Data validation errors
  if (lowerMessage.includes('invalid') || lowerMessage.includes('validation')) {
    return {
      title: 'Information Not Correct',
      message: 'Some of the information you entered is not in the correct format.',
      suggestedAction: 'Please check the highlighted fields and enter the information again.',
      severity: 'warning',
    };
  }

  // Medication errors
  if (lowerMessage.includes('medication')) {
    return {
      title: 'Medication Problem',
      message: 'There was a problem with your medication information.',
      suggestedAction: 'Please try again. If the problem continues, contact your doctor or pharmacist.',
      severity: 'error',
    };
  }

  // Health data errors
  if (lowerMessage.includes('vital') || lowerMessage.includes('health data') || lowerMessage.includes('reading')) {
    return {
      title: 'Health Reading Problem',
      message: 'We could not save your health reading.',
      suggestedAction: 'Please check that your numbers are correct and try again.',
      severity: 'error',
    };
  }

  // Appointment errors
  if (lowerMessage.includes('appointment')) {
    return {
      title: 'Appointment Problem',
      message: 'There was a problem with your appointment information.',
      suggestedAction: 'Please try again or contact your doctor\'s office directly.',
      severity: 'error',
    };
  }

  // Emergency alert errors
  if (lowerMessage.includes('emergency') || lowerMessage.includes('alert')) {
    return {
      title: 'Alert Problem',
      message: 'We had trouble sending your alert.',
      suggestedAction: 'If this is an emergency, please call 911 immediately. Otherwise, try again.',
      severity: 'error',
    };
  }

  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return {
      title: 'Taking Too Long',
      message: 'The system is taking longer than usual to respond.',
      suggestedAction: 'Please wait a moment and try again.',
      severity: 'warning',
    };
  }

  // Server errors
  if (lowerMessage.includes('server') || lowerMessage.includes('500') || lowerMessage.includes('503')) {
    return {
      title: 'System Problem',
      message: 'The health monitoring system is having technical difficulties.',
      suggestedAction: 'Please try again in a few minutes. If urgent, contact your family member.',
      severity: 'error',
    };
  }

  // Not found errors
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return {
      title: 'Information Not Found',
      message: 'We could not find the information you are looking for.',
      suggestedAction: 'Please go back and try again.',
      severity: 'warning',
    };
  }

  // Default error message for unknown errors
  return {
    title: 'Something Went Wrong',
    message: 'We encountered an unexpected problem.',
    suggestedAction: 'Please try again. If the problem continues, contact your family member for help.',
    severity: 'error',
  };
}

/**
 * Get user-friendly message for specific error codes
 */
export function getErrorByCode(code: string): UserFriendlyError {
  const errorMap: Record<string, UserFriendlyError> = {
    'NETWORK_ERROR': {
      title: 'Connection Problem',
      message: 'Cannot connect to the health monitoring system.',
      suggestedAction: 'Check your internet connection and try again.',
      severity: 'error',
    },
    'AUTH_REQUIRED': {
      title: 'Sign In Required',
      message: 'You need to sign in to continue.',
      suggestedAction: 'Please sign in with your username and password.',
      severity: 'warning',
    },
    'INVALID_DATA': {
      title: 'Information Not Correct',
      message: 'The information you entered is not valid.',
      suggestedAction: 'Please check and correct the highlighted fields.',
      severity: 'warning',
    },
    'DEVICE_DISCONNECTED': {
      title: 'Device Not Connected',
      message: 'Your health device is not connected.',
      suggestedAction: 'Turn on your device and make sure it is nearby.',
      severity: 'warning',
    },
    'EMERGENCY_FAILED': {
      title: 'Emergency Alert Failed',
      message: 'Could not send emergency alert.',
      suggestedAction: 'If this is an emergency, call 911 immediately.',
      severity: 'error',
    },
  };

  return errorMap[code] || getUserFriendlyError(code);
}

/**
 * Format validation errors for display
 */
export function formatValidationError(field: string, message: string): UserFriendlyError {
  const fieldNames: Record<string, string> = {
    'heartRate': 'Heart Rate',
    'bloodPressure': 'Blood Pressure',
    'systolicBP': 'Blood Pressure (Top Number)',
    'diastolicBP': 'Blood Pressure (Bottom Number)',
    'temperature': 'Temperature',
    'oxygenSaturation': 'Oxygen Level',
    'weight': 'Weight',
    'email': 'Email Address',
    'password': 'Password',
    'phone': 'Phone Number',
  };

  const friendlyFieldName = fieldNames[field] || field;

  return {
    title: 'Please Check Your Entry',
    message: `The ${friendlyFieldName} you entered is not correct.`,
    suggestedAction: message,
    severity: 'warning',
  };
}

/**
 * Get success message for completed actions
 */
export function getSuccessMessage(action: string): { title: string; message: string } {
  const successMap: Record<string, { title: string; message: string }> = {
    'medication_confirmed': {
      title: 'Medication Recorded',
      message: 'Your medication has been marked as taken.',
    },
    'health_data_saved': {
      title: 'Health Data Saved',
      message: 'Your health readings have been saved successfully.',
    },
    'appointment_scheduled': {
      title: 'Appointment Scheduled',
      message: 'Your appointment has been added to your calendar.',
    },
    'emergency_sent': {
      title: 'Emergency Alert Sent',
      message: 'Your family members have been notified.',
    },
    'message_sent': {
      title: 'Message Sent',
      message: 'Your message has been delivered.',
    },
  };

  return successMap[action] || {
    title: 'Success',
    message: 'Your action was completed successfully.',
  };
}
