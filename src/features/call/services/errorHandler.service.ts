/**
 * Call Error Handling and Recovery System
 * Handles network issues, device failures, and provides auto-reconnection
 */

export enum CallErrorType {
  // Network errors
  CONNECTION_LOST = 'connection_lost',
  NETWORK_TIMEOUT = 'network_timeout',
  SIGNALING_ERROR = 'signaling_error',
  ICE_CONNECTION_FAILED = 'ice_connection_failed',
  
  // Media errors
  MEDIA_PERMISSION_DENIED = 'media_permission_denied',
  MEDIA_DEVICE_NOT_FOUND = 'media_device_not_found',
  MEDIA_DEVICE_IN_USE = 'media_device_in_use',
  MEDIA_STREAM_FAILED = 'media_stream_failed',
  
  // WebRTC errors
  PEER_CONNECTION_FAILED = 'peer_connection_failed',
  OFFER_ANSWER_FAILED = 'offer_answer_failed',
  DATACHANNEL_ERROR = 'datachannel_error',
  
  // Call errors
  CALL_REJECTED = 'call_rejected',
  CALL_TIMEOUT = 'call_timeout',
  USER_BUSY = 'user_busy',
  USER_OFFLINE = 'user_offline',
  
  // System errors
  BROWSER_NOT_SUPPORTED = 'browser_not_supported',
  UNEXPECTED_ERROR = 'unexpected_error'
}

export enum CallErrorSeverity {
  LOW = 'low',           // Recoverable, show warning
  MEDIUM = 'medium',     // Requires user action
  HIGH = 'high',         // Call may fail but recoverable
  CRITICAL = 'critical'  // Call must end
}

export interface CallError {
  type: CallErrorType;
  severity: CallErrorSeverity;
  message: string;
  details?: any;
  timestamp: number;
  callId?: string;
  isRecoverable: boolean;
  recoveryAction?: string;
}

export interface RecoveryOptions {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  autoRecover: boolean;
}

export interface ConnectionQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  rtt: number; // Round trip time in ms
  packetsLost: number;
  jitter: number;
  bandwidth: number;
}

/**
 * Error Handler and Recovery Service for Call System
 */
export class CallErrorHandler {
  private static instance: CallErrorHandler;
  private errors: Map<string, CallError[]> = new Map();
  private recoveryOptions: RecoveryOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    autoRecover: true
  };
  private retryAttempts: Map<string, number> = new Map();
  private connectionQuality: ConnectionQuality | null = null;

  private constructor() {}

  public static getInstance(): CallErrorHandler {
    if (!CallErrorHandler.instance) {
      CallErrorHandler.instance = new CallErrorHandler();
    }
    return CallErrorHandler.instance;
  }

  /**
   * Handle and categorize errors
   */
  public handleError(error: Partial<CallError> & { type: CallErrorType }): CallError {
    const callError: CallError = {
      type: error.type,
      severity: error.severity || this.determineSeverity(error.type),
      message: error.message || this.getDefaultMessage(error.type),
      details: error.details,
      timestamp: Date.now(),
      callId: error.callId,
      isRecoverable: this.isRecoverable(error.type),
      recoveryAction: this.getRecoveryAction(error.type)
    };

    // Store error for analytics
    this.storeError(callError);

    // Emit error event
    this.emitErrorEvent(callError);

    // Attempt recovery if possible
    if (callError.isRecoverable && this.recoveryOptions.autoRecover) {
      this.attemptRecovery(callError);
    }

    return callError;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(type: CallErrorType): CallErrorSeverity {
    switch (type) {
      case CallErrorType.CONNECTION_LOST:
      case CallErrorType.ICE_CONNECTION_FAILED:
        return CallErrorSeverity.HIGH;
      
      case CallErrorType.MEDIA_PERMISSION_DENIED:
      case CallErrorType.BROWSER_NOT_SUPPORTED:
        return CallErrorSeverity.CRITICAL;
      
      case CallErrorType.NETWORK_TIMEOUT:
      case CallErrorType.SIGNALING_ERROR:
        return CallErrorSeverity.MEDIUM;
      
      case CallErrorType.MEDIA_DEVICE_IN_USE:
      case CallErrorType.CALL_TIMEOUT:
        return CallErrorSeverity.MEDIUM;
      
      default:
        return CallErrorSeverity.LOW;
    }
  }

  /**
   * Get default error message
   */
  private getDefaultMessage(type: CallErrorType): string {
    const messages: Record<CallErrorType, string> = {
      [CallErrorType.CONNECTION_LOST]: 'Connection to the call was lost',
      [CallErrorType.NETWORK_TIMEOUT]: 'Network request timed out',
      [CallErrorType.SIGNALING_ERROR]: 'Failed to establish call connection',
      [CallErrorType.ICE_CONNECTION_FAILED]: 'Failed to establish peer connection',
      [CallErrorType.MEDIA_PERMISSION_DENIED]: 'Camera/microphone access denied',
      [CallErrorType.MEDIA_DEVICE_NOT_FOUND]: 'Camera or microphone not found',
      [CallErrorType.MEDIA_DEVICE_IN_USE]: 'Camera or microphone is already in use',
      [CallErrorType.MEDIA_STREAM_FAILED]: 'Failed to access camera or microphone',
      [CallErrorType.PEER_CONNECTION_FAILED]: 'Failed to establish peer connection',
      [CallErrorType.OFFER_ANSWER_FAILED]: 'Failed to exchange call information',
      [CallErrorType.DATACHANNEL_ERROR]: 'Data channel communication failed',
      [CallErrorType.CALL_REJECTED]: 'Call was rejected',
      [CallErrorType.CALL_TIMEOUT]: 'Call request timed out',
      [CallErrorType.USER_BUSY]: 'User is currently busy',
      [CallErrorType.USER_OFFLINE]: 'User is offline',
      [CallErrorType.BROWSER_NOT_SUPPORTED]: 'Browser does not support video calls',
      [CallErrorType.UNEXPECTED_ERROR]: 'An unexpected error occurred'
    };

    return messages[type] || 'An error occurred during the call';
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverable(type: CallErrorType): boolean {
    const recoverableErrors = [
      CallErrorType.CONNECTION_LOST,
      CallErrorType.NETWORK_TIMEOUT,
      CallErrorType.SIGNALING_ERROR,
      CallErrorType.ICE_CONNECTION_FAILED,
      CallErrorType.MEDIA_DEVICE_IN_USE,
      CallErrorType.PEER_CONNECTION_FAILED,
      CallErrorType.DATACHANNEL_ERROR
    ];

    return recoverableErrors.includes(type);
  }

  /**
   * Get recovery action
   */
  private getRecoveryAction(type: CallErrorType): string {
    const actions: Partial<Record<CallErrorType, string>> = {
      [CallErrorType.CONNECTION_LOST]: 'Attempting to reconnect...',
      [CallErrorType.NETWORK_TIMEOUT]: 'Retrying connection...',
      [CallErrorType.SIGNALING_ERROR]: 'Reconnecting to signaling server...',
      [CallErrorType.ICE_CONNECTION_FAILED]: 'Trying alternative connection path...',
      [CallErrorType.MEDIA_DEVICE_IN_USE]: 'Waiting for device to become available...',
      [CallErrorType.MEDIA_STREAM_FAILED]: 'Retrying media access...',
      [CallErrorType.PEER_CONNECTION_FAILED]: 'Re-establishing peer connection...',
      [CallErrorType.OFFER_ANSWER_FAILED]: 'Retrying call setup...',
      [CallErrorType.DATACHANNEL_ERROR]: 'Re-establishing data connection...',
      [CallErrorType.MEDIA_PERMISSION_DENIED]: 'Please grant camera/microphone permissions',
      [CallErrorType.MEDIA_DEVICE_NOT_FOUND]: 'Please connect camera/microphone',
      [CallErrorType.BROWSER_NOT_SUPPORTED]: 'Please use a supported browser',
      [CallErrorType.CALL_REJECTED]: 'Call was declined by user',
      [CallErrorType.CALL_TIMEOUT]: 'Please try calling again',
      [CallErrorType.USER_BUSY]: 'User is currently busy',
      [CallErrorType.USER_OFFLINE]: 'User is not available',
      [CallErrorType.UNEXPECTED_ERROR]: 'Please try again'
    };

    return actions[type] || 'Attempting to recover...';
  }

  /**
   * Store error for analytics
   */
  private storeError(error: CallError): void {
    const callId = error.callId || 'global';
    
    if (!this.errors.has(callId)) {
      this.errors.set(callId, []);
    }
    
    const callErrors = this.errors.get(callId)!;
    callErrors.push(error);
    
    // Keep only last 10 errors per call
    if (callErrors.length > 10) {
      callErrors.shift();
    }
  }

  /**
   * Emit error event
   */
  private emitErrorEvent(error: CallError): void {
    const event = new CustomEvent('callError', { detail: error });
    window.dispatchEvent(event);
  }

  /**
   * Attempt automatic recovery
   */
  private async attemptRecovery(error: CallError): Promise<void> {
    const errorKey = `${error.callId || 'global'}-${error.type}`;
    const currentAttempts = this.retryAttempts.get(errorKey) || 0;

    if (currentAttempts >= this.recoveryOptions.maxRetries) {
      console.warn(`Max retry attempts reached for ${error.type}`);
      return;
    }

    this.retryAttempts.set(errorKey, currentAttempts + 1);

    // Calculate delay with exponential backoff
    let delay = this.recoveryOptions.retryDelay;
    if (this.recoveryOptions.exponentialBackoff) {
      delay *= Math.pow(2, currentAttempts);
    }



    setTimeout(() => {
      this.executeRecovery(error);
    }, delay);
  }

  /**
   * Execute specific recovery actions
   */
  private async executeRecovery(error: CallError): Promise<void> {
    const recoveryEvent = new CustomEvent('callRecoveryAttempt', {
      detail: { error, attempt: this.retryAttempts.get(`${error.callId || 'global'}-${error.type}`) }
    });
    window.dispatchEvent(recoveryEvent);

    switch (error.type) {
      case CallErrorType.CONNECTION_LOST:
      case CallErrorType.SIGNALING_ERROR:
        // Emit reconnect event
        window.dispatchEvent(new CustomEvent('callReconnectRequest', { detail: error }));
        break;
        
      case CallErrorType.ICE_CONNECTION_FAILED:
        // Request ICE restart
        window.dispatchEvent(new CustomEvent('callIceRestart', { detail: error }));
        break;
        
      case CallErrorType.MEDIA_STREAM_FAILED:
        // Retry media access
        window.dispatchEvent(new CustomEvent('callRetryMedia', { detail: error }));
        break;
        
      default:

    }
  }

  /**
   * Update connection quality metrics
   */
  public updateConnectionQuality(quality: ConnectionQuality): void {
    this.connectionQuality = quality;

    // Check for potential issues
    if (quality.level === 'poor' || quality.level === 'disconnected') {
      this.handleError({
        type: CallErrorType.CONNECTION_LOST,
        severity: CallErrorSeverity.HIGH,
        message: `Poor connection quality: ${quality.level}`,
        details: quality
      });
    }
  }

  /**
   * Reset retry attempts for successful operations
   */
  public clearRetryAttempts(callId?: string, errorType?: CallErrorType): void {
    if (callId && errorType) {
      this.retryAttempts.delete(`${callId}-${errorType}`);
    } else if (callId) {
      // Clear all attempts for a call
      for (const key of this.retryAttempts.keys()) {
        if (key.startsWith(callId)) {
          this.retryAttempts.delete(key);
        }
      }
    } else {
      // Clear all attempts
      this.retryAttempts.clear();
    }
  }

  /**
   * Get error statistics
   */
  public getErrorStats(callId?: string): {
    totalErrors: number;
    errorsByType: Record<CallErrorType, number>;
    errorsBySeverity: Record<CallErrorSeverity, number>;
  } {
    const allErrors = callId 
      ? this.errors.get(callId) || []
      : Array.from(this.errors.values()).flat();

    const errorsByType: Record<CallErrorType, number> = {} as any;
    const errorsBySeverity: Record<CallErrorSeverity, number> = {} as any;

    allErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: allErrors.length,
      errorsByType,
      errorsBySeverity
    };
  }

  /**
   * Get current connection quality
   */
  public getConnectionQuality(): ConnectionQuality | null {
    return this.connectionQuality;
  }

  /**
   * Configure recovery options
   */
  public setRecoveryOptions(options: Partial<RecoveryOptions>): void {
    this.recoveryOptions = { ...this.recoveryOptions, ...options };
  }

  /**
   * Clean up errors for a specific call
   */
  public clearCallErrors(callId: string): void {
    this.errors.delete(callId);
    this.clearRetryAttempts(callId);
  }

  /**
   * Create user-friendly error message
   */
  public getUserFriendlyMessage(error: CallError): {
    title: string;
    message: string;
    action?: string;
  } {
    const baseTitles: Record<CallErrorSeverity, string> = {
      [CallErrorSeverity.LOW]: 'Minor Issue',
      [CallErrorSeverity.MEDIUM]: 'Connection Problem', 
      [CallErrorSeverity.HIGH]: 'Call Issue',
      [CallErrorSeverity.CRITICAL]: 'Call Failed'
    };

    const userMessages: Partial<Record<CallErrorType, string>> = {
      [CallErrorType.CONNECTION_LOST]: 'The connection was lost. We\'re trying to reconnect automatically.',
      [CallErrorType.NETWORK_TIMEOUT]: 'The network is slow. Please check your internet connection.',
      [CallErrorType.SIGNALING_ERROR]: 'Failed to connect to the call service. Please try again.',
      [CallErrorType.ICE_CONNECTION_FAILED]: 'Unable to establish a direct connection. This may be due to network restrictions.',
      [CallErrorType.MEDIA_PERMISSION_DENIED]: 'Please allow access to your camera and microphone to make calls.',
      [CallErrorType.MEDIA_DEVICE_NOT_FOUND]: 'No camera or microphone found. Please connect your devices.',
      [CallErrorType.MEDIA_DEVICE_IN_USE]: 'Your camera or microphone is being used by another application.',
      [CallErrorType.MEDIA_STREAM_FAILED]: 'Failed to access your camera or microphone. Please check your device settings.',
      [CallErrorType.PEER_CONNECTION_FAILED]: 'Failed to establish a connection with the other person.',
      [CallErrorType.OFFER_ANSWER_FAILED]: 'Failed to negotiate call settings with the other person.',
      [CallErrorType.DATACHANNEL_ERROR]: 'Communication channel failed. The call may have audio/video issues.',
      [CallErrorType.BROWSER_NOT_SUPPORTED]: 'Your browser doesn\'t support video calls. Please use Chrome, Firefox, or Safari.',
      [CallErrorType.USER_BUSY]: 'The person you\'re calling is currently busy.',
      [CallErrorType.USER_OFFLINE]: 'The person you\'re trying to call is offline.',
      [CallErrorType.CALL_REJECTED]: 'Your call was declined.',
      [CallErrorType.CALL_TIMEOUT]: 'The call request timed out. Please try again.',
      [CallErrorType.UNEXPECTED_ERROR]: 'Something went wrong. Please try again.'
    };

    return {
      title: baseTitles[error.severity],
      message: userMessages[error.type] || error.message,
      action: error.recoveryAction
    };
  }
}

// Export singleton instance
export const callErrorHandler = CallErrorHandler.getInstance();

// Helper functions
export const handleCallError = (error: Partial<CallError> & { type: CallErrorType }) =>
  callErrorHandler.handleError(error);

export const updateConnectionQuality = (quality: ConnectionQuality) =>
  callErrorHandler.updateConnectionQuality(quality);

export const clearCallErrors = (callId: string) =>
  callErrorHandler.clearCallErrors(callId);