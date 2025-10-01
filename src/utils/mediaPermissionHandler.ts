import { MediaConstraints } from '@/types/call';

export interface MediaPermissionStatus {
  camera: PermissionState;
  microphone: PermissionState;
  screen: boolean; // Screen share doesn't have permission API
}

export interface MediaPermissionError {
  type: 'permission_denied' | 'device_not_found' | 'constraint_not_satisfied' | 'not_supported' | 'unknown';
  message: string;
  details?: string;
  code?: string;
}

export class MediaPermissionHandler {
  private static instance: MediaPermissionHandler;
  private permissionStatus: Partial<MediaPermissionStatus> = {};

  static getInstance(): MediaPermissionHandler {
    if (!MediaPermissionHandler.instance) {
      MediaPermissionHandler.instance = new MediaPermissionHandler();
    }
    return MediaPermissionHandler.instance;
  }

  // Check if WebRTC is supported
  isWebRTCSupported(): boolean {
    return !!(
      navigator.mediaDevices && 
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      window.RTCPeerConnection
    );
  }

  // Check specific browser capabilities
  getBrowserSupport() {
    return {
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      webRTC: !!window.RTCPeerConnection,
      screenShare: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      permissions: !!navigator.permissions,
      isSecureContext: window.isSecureContext, // HTTPS required for media access
    };
  }

  // Check current permission status
  async checkPermissionStatus(): Promise<MediaPermissionStatus> {
    const status: Partial<MediaPermissionStatus> = {};

    try {
      if (navigator.permissions) {
        // Check camera permission
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          status.camera = cameraPermission.state;
        } catch (error) {
          console.warn('Camera permission query not supported:', error);
        }

        // Check microphone permission
        try {
          const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          status.microphone = micPermission.state;
        } catch (error) {
          console.warn('Microphone permission query not supported:', error);
        }
      }

      // Screen share doesn't have permission API, always assume available if supported
      status.screen = this.getBrowserSupport().screenShare;

      this.permissionStatus = status;
      return status as MediaPermissionStatus;
    } catch (error) {
      console.error('Error checking permission status:', error);
      return {
        camera: 'prompt',
        microphone: 'prompt',
        screen: false
      };
    }
  }

  // Request media permissions with detailed error handling
  async requestMediaPermissions(
    constraints: MediaConstraints,
    options: {
      showPermissionModal?: boolean;
      retryOnError?: boolean;
      fallbackToAudioOnly?: boolean;
    } = {}
  ): Promise<{
    stream: MediaStream | null;
    error: MediaPermissionError | null;
    permissions: MediaPermissionStatus;
  }> {
    const {
      showPermissionModal = true,
      retryOnError = true,
      fallbackToAudioOnly = true
    } = options;

    let stream: MediaStream | null = null;
    let error: MediaPermissionError | null = null;

    try {
      // Check browser support first
      if (!this.isWebRTCSupported()) {
        return {
          stream: null,
          error: {
            type: 'not_supported',
            message: 'WebRTC is not supported in this browser',
            details: 'Please use a modern browser like Chrome, Firefox, or Safari'
          },
          permissions: await this.checkPermissionStatus()
        };
      }

      // Check secure context (HTTPS required in production)
      if (!window.isSecureContext && window.location.protocol !== 'http:') {
        return {
          stream: null,
          error: {
            type: 'not_supported',
            message: 'Media access requires HTTPS',
            details: 'Please access this site over HTTPS to use camera and microphone'
          },
          permissions: await this.checkPermissionStatus()
        };
      }

      // Try to get media with original constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (originalError: any) {
        console.warn('Initial media request failed:', originalError);

        // Handle specific error types
        switch (originalError.name) {
          case 'NotAllowedError':
            error = {
              type: 'permission_denied',
              message: 'Permission denied for camera/microphone access',
              details: 'Please allow camera and microphone access in your browser settings',
              code: originalError.name
            };
            break;

          case 'NotFoundError':
            error = {
              type: 'device_not_found',
              message: 'Camera or microphone not found',
              details: 'Please check that your camera and microphone are connected',
              code: originalError.name
            };
            break;

          case 'ConstraintNotSatisfiedError':
            error = {
              type: 'constraint_not_satisfied',
              message: 'Camera or microphone constraints cannot be satisfied',
              details: 'The requested video/audio settings are not supported by your device',
              code: originalError.name
            };
            break;

          default:
            error = {
              type: 'unknown',
              message: 'Failed to access camera/microphone',
              details: originalError.message || 'Unknown error occurred',
              code: originalError.name
            };
        }

        // Try fallback strategies
        if (retryOnError) {
          // Strategy 1: Try with relaxed video constraints
          if (constraints.video && typeof constraints.video === 'object') {
            try {
              console.log('Trying with relaxed video constraints...');
              const relaxedConstraints = {
                ...constraints,
                video: true // Use simple boolean instead of complex constraints
              };
              stream = await navigator.mediaDevices.getUserMedia(relaxedConstraints);
              error = null; // Clear error if successful
            } catch (retryError) {
              console.warn('Retry with relaxed constraints failed:', retryError);
            }
          }

          // Strategy 2: Fallback to audio-only if video fails
          if (!stream && fallbackToAudioOnly && constraints.video) {
            try {
              console.log('Falling back to audio-only...');
              const audioOnlyConstraints = {
                audio: constraints.audio,
                video: false
              };
              stream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraints);
              
              // Update error to indicate fallback
              error = {
                type: 'constraint_not_satisfied',
                message: 'Video unavailable, using audio only',
                details: 'Camera access failed, but microphone is working',
                code: 'VIDEO_FALLBACK'
              };
            } catch (audioError) {
              console.warn('Audio-only fallback failed:', audioError);
            }
          }
        }
      }

    } catch (unexpectedError: any) {
      console.error('Unexpected error in media permission handler:', unexpectedError);
      error = {
        type: 'unknown',
        message: 'Unexpected error occurred',
        details: unexpectedError.message || 'Please try again',
        code: 'UNEXPECTED_ERROR'
      };
    }

    // Get final permission status
    const permissions = await this.checkPermissionStatus();

    return {
      stream,
      error,
      permissions
    };
  }

  // Request screen share permission
  async requestScreenShare(): Promise<{
    stream: MediaStream | null;
    error: MediaPermissionError | null;
  }> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        return {
          stream: null,
          error: {
            type: 'not_supported',
            message: 'Screen sharing is not supported in this browser',
            details: 'Please use Chrome, Firefox, or Safari for screen sharing'
          }
        };
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      return {
        stream,
        error: null
      };

    } catch (error: any) {
      let permissionError: MediaPermissionError;

      switch (error.name) {
        case 'NotAllowedError':
          permissionError = {
            type: 'permission_denied',
            message: 'Screen sharing permission denied',
            details: 'You cancelled screen sharing or denied permission',
            code: error.name
          };
          break;

        case 'NotFoundError':
          permissionError = {
            type: 'device_not_found',
            message: 'No screen available for sharing',
            details: 'No displays or windows available to share',
            code: error.name
          };
          break;

        default:
          permissionError = {
            type: 'unknown',
            message: 'Screen sharing failed',
            details: error.message || 'Unknown error occurred',
            code: error.name
          };
      }

      return {
        stream: null,
        error: permissionError
      };
    }
  }

  // Get available media devices
  async getAvailableDevices(): Promise<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      return {
        cameras: devices.filter(device => device.kind === 'videoinput'),
        microphones: devices.filter(device => device.kind === 'audioinput'),
        speakers: devices.filter(device => device.kind === 'audiooutput')
      };
    } catch (error) {
      console.error('Error enumerating devices:', error);
      return {
        cameras: [],
        microphones: [],
        speakers: []
      };
    }
  }

  // Test media devices functionality
  async testDevices(): Promise<{
    camera: boolean;
    microphone: boolean;
    speaker: boolean;
  }> {
    const results = {
      camera: false,
      microphone: false,
      speaker: false
    };

    // Test camera
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      results.camera = true;
      videoStream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.warn('Camera test failed:', error);
    }

    // Test microphone
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      results.microphone = true;
      audioStream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.warn('Microphone test failed:', error);
    }

    // Test speaker (basic check)
    try {
      results.speaker = !!(window.AudioContext || (window as any).webkitAudioContext);
    } catch (error) {
      console.warn('Speaker test failed:', error);
    }

    return results;
  }

  // Clean up media stream
  cleanupStream(stream: MediaStream): void {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
    }
  }

  // Listen for permission changes
  onPermissionChange(callback: (permissions: MediaPermissionStatus) => void): () => void {
    const handlePermissionChange = async () => {
      const permissions = await this.checkPermissionStatus();
      callback(permissions);
    };

    // Listen for visibility changes (user might have granted permission in another tab)
    document.addEventListener('visibilitychange', handlePermissionChange);
    
    // Poll permission status occasionally
    const interval = setInterval(handlePermissionChange, 30000); // Check every 30 seconds

    // Return cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handlePermissionChange);
      clearInterval(interval);
    };
  }
}

// Export singleton instance
export const mediaPermissionHandler = MediaPermissionHandler.getInstance();