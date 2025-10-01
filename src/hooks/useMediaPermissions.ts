import { useState, useEffect, useCallback } from 'react';
import { 
  mediaPermissionHandler, 
  MediaPermissionStatus, 
  MediaPermissionError 
} from '@/utils/mediaPermissionHandler';
import { MediaConstraints } from '@/types/call';

interface UseMediaPermissionsOptions {
  autoCheck?: boolean;
  onPermissionChange?: (status: MediaPermissionStatus) => void;
  onError?: (error: MediaPermissionError) => void;
}

export const useMediaPermissions = (options: UseMediaPermissionsOptions = {}) => {
  const {
    autoCheck = true,
    onPermissionChange,
    onError
  } = options;

  const [permissionStatus, setPermissionStatus] = useState<MediaPermissionStatus | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<MediaPermissionError | null>(null);
  const [availableDevices, setAvailableDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }>({ cameras: [], microphones: [], speakers: [] });

  // Check initial status
  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supported = mediaPermissionHandler.isWebRTCSupported();
      setIsSupported(supported);

      if (supported) {
        const status = await mediaPermissionHandler.checkPermissionStatus();
        setPermissionStatus(status);
        onPermissionChange?.(status);

        // Get available devices
        const devices = await mediaPermissionHandler.getAvailableDevices();
        setAvailableDevices(devices);
      } else {
        const notSupportedError: MediaPermissionError = {
          type: 'not_supported',
          message: 'WebRTC not supported',
          details: 'Your browser does not support WebRTC functionality'
        };
        setError(notSupportedError);
        onError?.(notSupportedError);
      }
    } catch (err: any) {
      const checkError: MediaPermissionError = {
        type: 'unknown',
        message: 'Failed to check permissions',
        details: err.message || 'Unknown error occurred'
      };
      setError(checkError);
      onError?.(checkError);
    } finally {
      setIsLoading(false);
    }
  }, [onPermissionChange, onError]);

  // Request media permissions
  const requestPermissions = useCallback(async (
    constraints: MediaConstraints,
    options: {
      retryOnError?: boolean;
      fallbackToAudioOnly?: boolean;
    } = {}
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mediaPermissionHandler.requestMediaPermissions(constraints, {
        showPermissionModal: false,
        ...options
      });

      setPermissionStatus(result.permissions);
      onPermissionChange?.(result.permissions);

      if (result.error) {
        setError(result.error);
        onError?.(result.error);
      }

      return result;
    } catch (err: any) {
      const requestError: MediaPermissionError = {
        type: 'unknown',
        message: 'Permission request failed',
        details: err.message || 'Unknown error occurred'
      };
      setError(requestError);
      onError?.(requestError);
      
      return {
        stream: null,
        error: requestError,
        permissions: permissionStatus || { camera: 'prompt', microphone: 'prompt', screen: false }
      };
    } finally {
      setIsLoading(false);
    }
  }, [permissionStatus, onPermissionChange, onError]);

  // Request screen share
  const requestScreenShare = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mediaPermissionHandler.requestScreenShare();
      
      if (result.error) {
        setError(result.error);
        onError?.(result.error);
      }

      return result;
    } catch (err: any) {
      const screenError: MediaPermissionError = {
        type: 'unknown',
        message: 'Screen share failed',
        details: err.message || 'Unknown error occurred'
      };
      setError(screenError);
      onError?.(screenError);
      
      return {
        stream: null,
        error: screenError
      };
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  // Test devices
  const testDevices = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const results = await mediaPermissionHandler.testDevices();
      return results;
    } catch (err) {
      console.error('Device test failed:', err);
      return {
        camera: false,
        microphone: false,
        speaker: false
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh available devices
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await mediaPermissionHandler.getAvailableDevices();
      setAvailableDevices(devices);
      return devices;
    } catch (err) {
      console.error('Failed to refresh devices:', err);
      return availableDevices;
    }
  }, [availableDevices]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if permissions are granted
  const hasPermissions = (requiredPermissions: { camera?: boolean; microphone?: boolean } = {}) => {
    if (!permissionStatus) return false;
    
    const { camera = false, microphone = false } = requiredPermissions;
    
    let hasCamera = true;
    let hasMic = true;
    
    if (camera) {
      hasCamera = permissionStatus.camera === 'granted';
    }
    
    if (microphone) {
      hasMic = permissionStatus.microphone === 'granted';
    }
    
    return hasCamera && hasMic;
  };

  // Get browser capabilities
  const getBrowserCapabilities = useCallback(() => {
    return mediaPermissionHandler.getBrowserSupport();
  }, []);

  // Auto-check on mount
  useEffect(() => {
    if (autoCheck) {
      checkStatus();
    }
  }, [autoCheck, checkStatus]);

  // Listen for permission changes
  useEffect(() => {
    const cleanup = mediaPermissionHandler.onPermissionChange((status) => {
      setPermissionStatus(status);
      onPermissionChange?.(status);
    });

    return cleanup;
  }, [onPermissionChange]);

  // Listen for device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      refreshDevices();
    };

    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [refreshDevices]);

  return {
    // State
    permissionStatus,
    isSupported,
    isLoading,
    error,
    availableDevices,
    
    // Actions
    checkStatus,
    requestPermissions,
    requestScreenShare,
    testDevices,
    refreshDevices,
    clearError,
    
    // Utils
    hasPermissions,
    getBrowserCapabilities,
    
    // Convenience getters
    hasCamera: hasPermissions({ camera: true }),
    hasMicrophone: hasPermissions({ microphone: true }),
    hasAllPermissions: hasPermissions({ camera: true, microphone: true }),
  };
};