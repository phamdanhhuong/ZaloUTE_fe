import { getAudioGeneratorService } from '../utils/audioGenerator';

/**
 * Call Notification Service
 * Handles browser notifications, sound alerts, and notification permissions for calls
 */

export interface NotificationActionOption {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationActionOption[];
  data?: any;
}

export interface SoundOptions {
  volume?: number;
  loop?: boolean;
  duration?: number;
}

export interface CallNotificationData {
  callId: string;
  callType: 'voice' | 'video';
  callerName: string;
  callerAvatar?: string;
  timestamp: number;
}

export type CallSoundType = 'incoming' | 'outgoing' | 'connected' | 'ended' | 'busy';

/**
 * Service for managing call notifications and sounds
 */
export class CallNotificationService {
  private static instance: CallNotificationService;
  private permissionStatus: NotificationPermission = 'default';
  private activeNotifications: Map<string, Notification> = new Map();
  private soundBuffers: Map<CallSoundType, AudioBuffer> = new Map();
  private activeSources: Map<CallSoundType, AudioBufferSourceNode> = new Map();
  private initialized: boolean = false;
  private globalVolume: number = 0.7;

  private constructor() {
    this.initializePermission();
    this.initializeSounds();
  }

  public static getInstance(): CallNotificationService {
    if (!CallNotificationService.instance) {
      CallNotificationService.instance = new CallNotificationService();
    }
    return CallNotificationService.instance;
  }

  /**
   * Initialize notification permission status
   */
  private async initializePermission(): Promise<void> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permissionStatus = Notification.permission;
    }
  }

  /**
   * Initialize generated sounds
   */
  private async initializeSounds(): Promise<void> {
    if (this.initialized) return;

    try {
      const generatedSounds = await getAudioGeneratorService().createCallSounds();
      
      // Store the generated audio buffers
      Object.entries(generatedSounds).forEach(([type, buffer]) => {
        this.soundBuffers.set(type as CallSoundType, buffer as AudioBuffer);
      });

      this.initialized = true;

    } catch (error) {
      console.error('Failed to initialize call sounds:', error);
    }
  }

  /**
   * Request notification permission from user
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return 'denied';
    }

    if (this.permissionStatus === 'default') {
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission;
      return permission;
    }

    return this.permissionStatus;
  }

  /**
   * Check if notifications are supported and permitted
   */
  public isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && this.permissionStatus === 'granted';
  }

  /**
   * Show incoming call notification
   */
  public async showIncomingCallNotification(
    callerName: string,
    callData: CallNotificationData
  ): Promise<string | null> {
    if (!this.isNotificationSupported()) {
      console.warn('Notifications not supported or permission denied');
      return null;
    }

    const notificationId = `call-${callData.callId}`;
    
    const options: NotificationOptions = {
      title: `Incoming ${callData.callType} call`,
      body: `${callerName} is calling you`,
      icon: callData.callerAvatar || '/icons/call-icon.png',
      tag: notificationId,
      requireInteraction: true,
      actions: [
        {
          action: 'answer',
          title: 'Answer',
          icon: '/icons/answer-icon.png'
        },
        {
          action: 'decline',
          title: 'Decline',
          icon: '/icons/decline-icon.png'
        }
      ],
      data: callData
    };

    try {
      const notification = new Notification(options.title, options);
      
      notification.onclick = () => {
        this.handleNotificationClick('answer', callData);
        this.closeNotification(notificationId);
      };

      // Handle notification actions (if supported)
      if ('actions' in notification && options.actions) {
        (notification as any).addEventListener?.('notificationclick', (event: any) => {
          this.handleNotificationClick(event.action, callData);
          this.closeNotification(notificationId);
        });
      }

      this.activeNotifications.set(notificationId, notification);
      
      // Auto-close notification after timeout
      setTimeout(() => {
        this.closeNotification(notificationId);
      }, 30000); // 30 seconds

      return notificationId;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }

  /**
   * Show call status notification
   */
  public async showCallStatusNotification(
    title: string,
    message: string,
    callId?: string
  ): Promise<void> {
    if (!this.isNotificationSupported()) {
      return;
    }

    const notificationId = callId ? `status-${callId}` : `status-${Date.now()}`;
    
    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/icons/call-status-icon.png',
        tag: notificationId
      });

      this.activeNotifications.set(notificationId, notification);

      // Auto-close after 5 seconds
      setTimeout(() => {
        this.closeNotification(notificationId);
      }, 5000);
    } catch (error) {
      console.error('Failed to show status notification:', error);
    }
  }

  /**
   * Handle notification click events
   */
  private handleNotificationClick(action: string, callData: CallNotificationData): void {
    // Emit custom events that can be listened to by the call system
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('callNotificationAction', {
        detail: { action, callData }
      });
      window.dispatchEvent(event);

      // Focus the window
      if (window.focus) {
        window.focus();
      }
    }
  }

  /**
   * Close specific notification
   */
  public closeNotification(notificationId: string): void {
    const notification = this.activeNotifications.get(notificationId);
    if (notification) {
      notification.close();
      this.activeNotifications.delete(notificationId);
    }
  }

  /**
   * Close all active notifications
   */
  public closeAllNotifications(): void {
    this.activeNotifications.forEach((notification) => {
      notification.close();
    });
    this.activeNotifications.clear();
  }

  /**
   * Play sound with options
   */
  public async playSound(
    soundType: CallSoundType,
    options: SoundOptions = {}
  ): Promise<void> {
    // Ensure sounds are initialized
    if (!this.initialized) {
      await this.initializeSounds();
    }

    const buffer = this.soundBuffers.get(soundType);
    if (!buffer) {
      console.warn(`Sound buffer not found: ${soundType}`);
      return;
    }

    try {
      // Stop existing sound of same type
      this.stopSound(soundType);

      // Resume audio context if needed
      await getAudioGeneratorService().resumeAudioContext();

      // Play the generated sound
      const source = await getAudioGeneratorService().playBuffer(buffer, options.loop || false);
      if (source) {
        this.activeSources.set(soundType, source);

        // Handle duration limit
        if (options.duration && options.duration > 0) {
          setTimeout(() => {
            this.stopSound(soundType);
          }, options.duration);
        }

        // Clean up when sound ends naturally
        source.onended = () => {
          this.activeSources.delete(soundType);
        };
      }
    } catch (error) {
      console.error(`Failed to play sound ${soundType}:`, error);
    }
  }

  /**
   * Stop specific sound
   */
  public stopSound(soundType: CallSoundType): void {
    const source = this.activeSources.get(soundType);
    if (source) {
      try {
        source.stop();
      } catch (error) {
        // Sound may have already ended
      }
      this.activeSources.delete(soundType);
    }
  }

  /**
   * Stop all sounds
   */
  public stopAllSounds(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (error) {
        // Sound may have already ended
      }
    });
    this.activeSources.clear();
  }

  /**
   * Set volume for all sounds (Web Audio API doesn't have direct volume control on AudioBufferSourceNode)
   * This is a placeholder for potential future implementation with GainNode
   */
  public setGlobalVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume));
    // Note: For proper volume control, we would need to use GainNode
    // This is a simplified implementation
  }

  /**
   * Check if sound is currently playing
   */
  public isSoundPlaying(soundType: CallSoundType): boolean {
    return this.activeSources.has(soundType);
  }

  /**
   * Get notification permission status
   */
  public getPermissionStatus(): NotificationPermission {
    return this.permissionStatus;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.closeAllNotifications();
    this.stopAllSounds();
    this.soundBuffers.clear();
  }
}

// Lazy getter for singleton instance (only initialize on client-side)
export const getCallNotificationService = (): CallNotificationService => {
  if (typeof window === 'undefined') {
    // Return a mock service for SSR
    return {
      requestPermission: async () => 'denied' as NotificationPermission,
      showIncomingCallNotification: async () => null,
      showCallStatusNotification: async () => {},
      playSound: async () => {},
      stopSound: () => {},
      stopAllSounds: () => {},
      closeNotification: () => {},
      closeAllNotifications: () => {},
      isNotificationSupported: () => false,
      getPermissionStatus: () => 'denied' as NotificationPermission,
      setGlobalVolume: () => {},
      isSoundPlaying: () => false,
      dispose: () => {}
    } as any;
  }
  return CallNotificationService.getInstance();
};

// Export singleton instance getter - use getCallNotificationService() instead

// Helper functions
export const requestCallNotificationPermission = () => 
  getCallNotificationService().requestPermission();

export const showIncomingCall = (callerName: string, callData: CallNotificationData) =>
  getCallNotificationService().showIncomingCallNotification(callerName, callData);

export const playCallSound = (soundType: CallSoundType, options?: SoundOptions) =>
  getCallNotificationService().playSound(soundType, options);

export const stopCallSound = (soundType: CallSoundType) =>
  getCallNotificationService().stopSound(soundType);