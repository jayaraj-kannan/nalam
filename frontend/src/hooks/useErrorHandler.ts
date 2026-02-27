import { useState, useCallback } from 'react';
import { getUserFriendlyError, UserFriendlyError } from '../utils/errorMessages';

/**
 * Hook for handling errors with user-friendly messages
 * Requirements: 5.4
 */
export function useErrorHandler() {
  const [error, setError] = useState<UserFriendlyError | null>(null);

  const handleError = useCallback((err: Error | string | unknown) => {
    const friendlyError = getUserFriendlyError(err);
    setError(friendlyError);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    resetError,
    hasError: error !== null,
  };
}

/**
 * Hook for async operations with error handling
 */
export function useAsyncError() {
  const [error, setError] = useState<UserFriendlyError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const executeAsync = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: UserFriendlyError) => void
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      onSuccess?.(result);
      return result;
    } catch (err) {
      const friendlyError = getUserFriendlyError(err);
      setError(friendlyError);
      onError?.(friendlyError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isLoading,
    executeAsync,
    clearError,
    hasError: error !== null,
  };
}
