import { useEffect, useCallback, useState } from 'react';
import { 
  getCallNotificationService, 
  CallNotificationData, 
  SoundOptions 
} from '../services/notification.service';

export interface UseCallNotificationsOptions {
  autoRequestPermission?: boolean;
  defaultVolume?: number;
  onNotificationClick?: (action: string, callData: CallNotificationData) => void;
}

export interface CallNotificationState {
  permissionStatus: NotificationPermission;
  isSupported: boolean;
  activeNotifications: string[];
  soundsEnabled: boolean;
  volume: number;
}

/**
 * Hook for managing call notifications and sounds
 */
export const useCallNotifications = (options: UseCallNotificationsOptions = {}) => {
  const {
    autoRequestPermission = true,
    defaultVolume = 0.7,
    onNotificationClick
  } = options;

  const [state, setState] = useState<CallNotificationState>({
    permissionStatus: getCallNotificationService().getPermissionStatus(),
    isSupported: getCallNotificationService().isNotificationSupported(),
    activeNotifications: [],
    soundsEnabled: true,
    volume: defaultVolume
  });

  // Initialize notification system
  useEffect(() => {
    const initializeNotifications = async () => {
      if (autoRequestPermission && state.permissionStatus === 'default') {
        const permission = await getCallNotificationService().requestPermission();
        setState(prev => ({
          ...prev,
          permissionStatus: permission,
          isSupported: permission === 'granted'
        }));
      }

      // Set initial volume
      getCallNotificationService().setGlobalVolume(defaultVolume);
    };

    initializeNotifications();
  }, [autoRequestPermission, defaultVolume, state.permissionStatus]);

  // Listen for notification actions
  useEffect(() => {
    const handleNotificationAction = (event: CustomEvent) => {
      const { action, callData } = event.detail;
      onNotificationClick?.(action, callData);
    };

    window.addEventListener('callNotificationAction', handleNotificationAction as EventListener);

    return () => {
      window.removeEventListener('callNotificationAction', handleNotificationAction as EventListener);
    };
  }, [onNotificationClick]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    const permission = await getCallNotificationService().requestPermission();
    setState(prev => ({
      ...prev,
      permissionStatus: permission,
      isSupported: permission === 'granted'
    }));
    return permission;
  }, []);

  // Show incoming call notification
  const showIncomingCall = useCallback(async (
    callerName: string,
    callData: CallNotificationData
  ): Promise<string | null> => {
    const notificationId = await getCallNotificationService().showIncomingCallNotification(
      callerName,
      callData
    );

    if (notificationId) {
      setState(prev => ({
        ...prev,
        activeNotifications: [...prev.activeNotifications, notificationId]
      }));

      // Play incoming call sound
      if (state.soundsEnabled) {
        await playSound('incoming', { loop: true, duration: 30000 });
      }
    }

    return notificationId;
  }, [state.soundsEnabled]);

  // Show call status notification
  const showCallStatus = useCallback(async (
    title: string,
    message: string,
    callId?: string
  ): Promise<void> => {
    await getCallNotificationService().showCallStatusNotification(title, message, callId);
  }, []);

  // Close notification
  const closeNotification = useCallback((notificationId: string): void => {
    getCallNotificationService().closeNotification(notificationId);
    setState(prev => ({
      ...prev,
      activeNotifications: prev.activeNotifications.filter(id => id !== notificationId)
    }));
  }, []);

  // Close all notifications
  const closeAllNotifications = useCallback((): void => {
    getCallNotificationService().closeAllNotifications();
    setState(prev => ({
      ...prev,
      activeNotifications: []
    }));
  }, []);

  // Play sound
  const playSound = useCallback(async (
    soundType: 'incoming' | 'outgoing' | 'connected' | 'ended' | 'busy',
    options: SoundOptions = {}
  ): Promise<void> => {
    if (!state.soundsEnabled) return;
    
    await getCallNotificationService().playSound(soundType, {
      volume: state.volume,
      ...options
    });
  }, [state.soundsEnabled, state.volume]);

  // Stop sound
  const stopSound = useCallback((
    soundType: 'incoming' | 'outgoing' | 'connected' | 'ended' | 'busy'
  ): void => {
    getCallNotificationService().stopSound(soundType);
  }, []);

  // Stop all sounds
  const stopAllSounds = useCallback((): void => {
    getCallNotificationService().stopAllSounds();
  }, []);

  // Toggle sounds
  const toggleSounds = useCallback((): void => {
    setState(prev => {
      const newSoundsEnabled = !prev.soundsEnabled;
      if (!newSoundsEnabled) {
        getCallNotificationService().stopAllSounds();
      }
      return {
        ...prev,
        soundsEnabled: newSoundsEnabled
      };
    });
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number): void => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    getCallNotificationService().setGlobalVolume(clampedVolume);
    setState(prev => ({
      ...prev,
      volume: clampedVolume
    }));
  }, []);

  // Check if sound is playing
  const isSoundPlaying = useCallback((
    soundType: 'incoming' | 'outgoing' | 'connected' | 'ended' | 'busy'
  ): boolean => {
    return getCallNotificationService().isSoundPlaying(soundType);
  }, []);

  return {
    // State
    permissionStatus: state.permissionStatus,
    isSupported: state.isSupported,
    activeNotifications: state.activeNotifications,
    soundsEnabled: state.soundsEnabled,
    volume: state.volume,
    
    // Actions
    requestPermission,
    showIncomingCall,
    showCallStatus,
    closeNotification,
    closeAllNotifications,
    playSound,
    stopSound,
    stopAllSounds,
    toggleSounds,
    setVolume,
    isSoundPlaying
  };
};

export default useCallNotifications;