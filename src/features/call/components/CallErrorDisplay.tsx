import React, { useEffect, useState } from 'react';
import { CallError, CallErrorSeverity } from '../services/errorHandler.service';

export interface CallErrorDisplayProps {
  error: CallError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

/**
 * Component for displaying call errors to users
 */
export const CallErrorDisplay: React.FC<CallErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [userMessage, setUserMessage] = useState<{
    title: string;
    message: string;
    action?: string;
  } | null>(null);

  useEffect(() => {
    if (error) {
      // Get user-friendly message (you would import this from the error handler)
      const friendlyMessage = {
        title: getSeverityTitle(error.severity),
        message: getUserFriendlyMessage(error),
        action: error.recoveryAction
      };
      
      setUserMessage(friendlyMessage);
      setIsVisible(true);

      // Auto-dismiss low severity errors after 5 seconds
      if (error.severity === CallErrorSeverity.LOW) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, 5000);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
      setUserMessage(null);
    }
  }, [error]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleRetry = () => {
    onRetry?.();
    setIsVisible(false);
  };

  const getSeverityTitle = (severity: CallErrorSeverity): string => {
    switch (severity) {
      case CallErrorSeverity.LOW:
        return 'Notice';
      case CallErrorSeverity.MEDIUM:
        return 'Connection Issue';
      case CallErrorSeverity.HIGH:
        return 'Call Problem';
      case CallErrorSeverity.CRITICAL:
        return 'Call Failed';
      default:
        return 'Error';
    }
  };

  const getUserFriendlyMessage = (error: CallError): string => {
    // This would ideally use the error handler's getUserFriendlyMessage method
    // For now, we'll use the error message directly
    return error.message;
  };

  const getSeverityStyles = (severity: CallErrorSeverity) => {
    switch (severity) {
      case CallErrorSeverity.LOW:
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          message: 'text-blue-800',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      case CallErrorSeverity.MEDIUM:
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          message: 'text-yellow-800',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case CallErrorSeverity.HIGH:
        return {
          container: 'bg-orange-50 border-orange-200',
          icon: 'text-orange-600',
          title: 'text-orange-900',
          message: 'text-orange-800',
          button: 'bg-orange-600 hover:bg-orange-700'
        };
      case CallErrorSeverity.CRITICAL:
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-900',
          message: 'text-red-800',
          button: 'bg-red-600 hover:bg-red-700'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-600',
          title: 'text-gray-900',
          message: 'text-gray-800',
          button: 'bg-gray-600 hover:bg-gray-700'
        };
    }
  };

  const getSeverityIcon = (severity: CallErrorSeverity) => {
    switch (severity) {
      case CallErrorSeverity.LOW:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case CallErrorSeverity.MEDIUM:
      case CallErrorSeverity.HIGH:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case CallErrorSeverity.CRITICAL:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isVisible || !error || !userMessage) {
    return null;
  }

  const styles = getSeverityStyles(error.severity);

  return (
    <div className={`fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50 ${className}`}>
      <div className={`rounded-lg border p-4 shadow-lg ${styles.container}`}>
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className={`flex-shrink-0 ${styles.icon}`}>
            {getSeverityIcon(error.severity)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-medium ${styles.title}`}>
              {userMessage.title}
            </h4>
            <p className={`mt-1 text-sm ${styles.message}`}>
              {userMessage.message}
            </p>

            {/* Recovery action message */}
            {userMessage.action && (
              <p className={`mt-2 text-xs ${styles.message} opacity-80`}>
                {userMessage.action}
              </p>
            )}

            {/* Error details (for debugging) */}
            {showDetails && (
              <details className="mt-2">
                <summary className={`text-xs cursor-pointer ${styles.message} opacity-60`}>
                  Technical Details
                </summary>
                <div className={`mt-1 text-xs ${styles.message} opacity-60 font-mono`}>
                  <div>Type: {error.type}</div>
                  <div>Severity: {error.severity}</div>
                  <div>Time: {new Date(error.timestamp).toLocaleTimeString()}</div>
                  {error.details && (
                    <div>Details: {JSON.stringify(error.details, null, 2)}</div>
                  )}
                </div>
              </details>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex space-x-2">
            {error.isRecoverable && onRetry && (
              <button
                onClick={handleRetry}
                className={`px-3 py-1 text-xs text-white rounded-md transition-colors ${styles.button}`}
              >
                Retry
              </button>
            )}
            
            <button
              onClick={handleDismiss}
              className={`p-1 rounded-md transition-colors ${styles.icon} hover:bg-black hover:bg-opacity-10`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallErrorDisplay;