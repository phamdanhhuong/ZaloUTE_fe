import { useState, useEffect, useCallback } from 'react';
import { 
  callErrorHandler, 
  CallError, 
  CallErrorType, 
  CallErrorSeverity,
  ConnectionQuality,
  RecoveryOptions
} from '../services/errorHandler.service';

export interface UseErrorHandlingOptions {
  callId?: string;
  autoRecovery?: boolean;
  maxRetries?: number;
  onError?: (error: CallError) => void;
  onRecovery?: (error: CallError, attempt: number) => void;
  onRecoverySuccess?: (error: CallError) => void;
  onRecoveryFailed?: (error: CallError) => void;
}

export interface CallErrorState {
  currentError: CallError | null;
  errors: CallError[];
  isRecovering: boolean;
  recoveryAttempt: number;
  connectionQuality: ConnectionQuality | null;
  hasUnrecoverableError: boolean;
}

/**
 * Hook for handling call errors and recovery
 */
export const useErrorHandling = (options: UseErrorHandlingOptions = {}) => {
  const {
    callId,
    autoRecovery = true,
    maxRetries = 3,
    onError,
    onRecovery,
    onRecoverySuccess,
    onRecoveryFailed
  } = options;

  const [state, setState] = useState<CallErrorState>({
    currentError: null,
    errors: [],
    isRecovering: false,
    recoveryAttempt: 0,
    connectionQuality: null,
    hasUnrecoverableError: false
  });

  // Configure recovery options
  useEffect(() => {
    callErrorHandler.setRecoveryOptions({
      maxRetries,
      autoRecover: autoRecovery,
      retryDelay: 1000,
      exponentialBackoff: true
    });
  }, [maxRetries, autoRecovery]);

  // Listen for call errors
  useEffect(() => {
    const handleError = (event: CustomEvent<CallError>) => {
      const error = event.detail;
      
      // Filter by callId if specified
      if (callId && error.callId !== callId) {
        return;
      }

      setState(prev => ({
        ...prev,
        currentError: error,
        errors: [...prev.errors, error].slice(-10), // Keep last 10 errors
        hasUnrecoverableError: prev.hasUnrecoverableError || !error.isRecoverable
      }));

      // Call user-provided error handler
      onError?.(error);
    };

    window.addEventListener('callError', handleError as EventListener);

    return () => {
      window.removeEventListener('callError', handleError as EventListener);
    };
  }, [callId, onError]);

  // Listen for recovery attempts
  useEffect(() => {
    const handleRecoveryAttempt = (event: CustomEvent<{ error: CallError; attempt: number }>) => {
      const { error, attempt } = event.detail;
      
      if (callId && error.callId !== callId) {
        return;
      }

      setState(prev => ({
        ...prev,
        isRecovering: true,
        recoveryAttempt: attempt
      }));

      onRecovery?.(error, attempt);
    };

    window.addEventListener('callRecoveryAttempt', handleRecoveryAttempt as EventListener);

    return () => {
      window.removeEventListener('callRecoveryAttempt', handleRecoveryAttempt as EventListener);
    };
  }, [callId, onRecovery]);

  // Listen for recovery success (you would emit this from your recovery logic)
  useEffect(() => {
    const handleRecoverySuccess = (event: CustomEvent<CallError>) => {
      const error = event.detail;
      
      if (callId && error.callId !== callId) {
        return;
      }

      setState(prev => ({
        ...prev,
        currentError: null,
        isRecovering: false,
        recoveryAttempt: 0
      }));

      // Clear retry attempts for this error
      callErrorHandler.clearRetryAttempts(callId, error.type);

      onRecoverySuccess?.(error);
    };

    window.addEventListener('callRecoverySuccess', handleRecoverySuccess as EventListener);

    return () => {
      window.removeEventListener('callRecoverySuccess', handleRecoverySuccess as EventListener);
    };
  }, [callId, onRecoverySuccess]);

  // Listen for recovery failure
  useEffect(() => {
    const handleRecoveryFailed = (event: CustomEvent<CallError>) => {
      const error = event.detail;
      
      if (callId && error.callId !== callId) {
        return;
      }

      setState(prev => ({
        ...prev,
        isRecovering: false,
        hasUnrecoverableError: true
      }));

      onRecoveryFailed?.(error);
    };

    window.addEventListener('callRecoveryFailed', handleRecoveryFailed as EventListener);

    return () => {
      window.removeEventListener('callRecoveryFailed', handleRecoveryFailed as EventListener);
    };
  }, [callId, onRecoveryFailed]);

  // Report error manually
  const reportError = useCallback((errorType: CallErrorType, details?: {
    message?: string;
    severity?: CallErrorSeverity;
    details?: any;
  }) => {
    const error = callErrorHandler.handleError({
      type: errorType,
      message: details?.message,
      severity: details?.severity,
      details: details?.details,
      callId
    });

    return error;
  }, [callId]);

  // Update connection quality
  const updateConnectionQuality = useCallback((quality: ConnectionQuality) => {
    setState(prev => ({
      ...prev,
      connectionQuality: quality
    }));

    callErrorHandler.updateConnectionQuality(quality);
  }, []);

  // Clear current error
  const clearCurrentError = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentError: null,
      isRecovering: false
    }));
  }, []);

  // Clear all errors for this call
  const clearAllErrors = useCallback(() => {
    if (callId) {
      callErrorHandler.clearCallErrors(callId);
    }
    
    setState(prev => ({
      ...prev,
      currentError: null,
      errors: [],
      isRecovering: false,
      recoveryAttempt: 0,
      hasUnrecoverableError: false
    }));
  }, [callId]);

  // Get user-friendly error message
  const getUserFriendlyMessage = useCallback((error?: CallError) => {
    const targetError = error || state.currentError;
    if (!targetError) {
      return null;
    }

    return callErrorHandler.getUserFriendlyMessage(targetError);
  }, [state.currentError]);

  // Get error statistics
  const getErrorStats = useCallback(() => {
    return callErrorHandler.getErrorStats(callId);
  }, [callId]);

  // Check if error is critical
  const isCriticalError = useCallback((error?: CallError) => {
    const targetError = error || state.currentError;
    return targetError?.severity === CallErrorSeverity.CRITICAL;
  }, [state.currentError]);

  // Check if should show error to user
  const shouldShowError = useCallback((error?: CallError) => {
    const targetError = error || state.currentError;
    if (!targetError) return false;

    // Don't show low severity errors that are being auto-recovered
    return targetError.severity !== CallErrorSeverity.LOW || !targetError.isRecoverable;
  }, [state.currentError]);

  // Retry failed operation
  const retryOperation = useCallback(() => {
    if (state.currentError?.isRecoverable) {
      // Emit retry event
      const event = new CustomEvent('callRetryRequest', {
        detail: state.currentError
      });
      window.dispatchEvent(event);
      
      setState(prev => ({
        ...prev,
        isRecovering: true
      }));
    }
  }, [state.currentError]);

  return {
    // State
    currentError: state.currentError,
    errors: state.errors,
    isRecovering: state.isRecovering,
    recoveryAttempt: state.recoveryAttempt,
    connectionQuality: state.connectionQuality,
    hasUnrecoverableError: state.hasUnrecoverableError,
    
    // Computed
    hasCriticalError: isCriticalError(),
    shouldShowCurrentError: shouldShowError(),
    
    // Actions
    reportError,
    updateConnectionQuality,
    clearCurrentError,
    clearAllErrors,
    getUserFriendlyMessage,
    getErrorStats,
    retryOperation,
    
    // Utilities
    isCriticalError,
    shouldShowError
  };
};

export default useErrorHandling;