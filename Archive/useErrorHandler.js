import { useState, useCallback } from 'react';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);

  const handleError = useCallback((errorType, errorMessage) => {
    console.error(`${errorType}: ${errorMessage}`);
    setError({ type: errorType, message: errorMessage });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
};