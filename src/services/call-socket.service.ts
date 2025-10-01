import io from 'socket.io-client';
import { 
  CallEvent, 
  CallEventPayload,
  Call,
  CallType,
  CallUser, 
  IncomingCall,
  WebRTCSignal 
} from '@/types/call';

export class CallSocketService {
  private socket: any = null;
  private isConnected: boolean = false;
  private authToken: string | null = null;

  // Event listeners
  private eventListeners: Map<CallEvent, ((data: any) => void)[]> = new Map();

  constructor() {
    // Initialize event listeners map
    const events: CallEvent[] = [
      'call:initiate',
      'call:accept', 
      'call:reject',
      'call:end',
      'call:incoming',
      'call:accepted',
      'call:rejected',
      'call:ended',
      'call:error',
      'webrtc:offer',
      'webrtc:answer',
      'webrtc:ice-candidate'
    ];

    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  // Connect to call socket namespace
  async connect(authToken: string): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    this.authToken = authToken;

    try {
      // Extract base URL from socket URL (remove /chat if present)
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080/chat';
      const serverUrl = socketUrl.replace('/chat', '');
      console.log('🔗 Call socket connecting to:', `${serverUrl}/call`);
      
      this.socket = io(`${serverUrl}/call`, {
        query: {
          token: authToken,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      // Setup connection event handlers
      this.setupConnectionHandlers();
      
      // Setup call event handlers  
      this.setupCallEventHandlers();

      // Wait for connection
      await this.waitForConnection();
      
      this.isConnected = true;
      
    } catch (error) {
      console.error('Call socket connection failed:', error);
      this.isConnected = false;
      // Don't throw error - allow app to continue without call service
    }
  }

  // Wait for socket connection
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  // Setup connection event handlers
  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason: any) => {
      this.isConnected = false;
      
      // Attempt to reconnect after a delay
      if (reason === 'io server disconnect') {
        setTimeout(() => this.reconnect(), 5000);
      }
    });

    this.socket.on('connect_error', (error: any) => {
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber: any) => {
      this.isConnected = true;
    });

    // Add authentication error handling
    this.socket.on('auth_error', (error: any) => {
      console.error('Auth error:', error);
    });
  }

  // Setup call event handlers
  private setupCallEventHandlers(): void {
    if (!this.socket) return;

    // Call management events
    this.socket.on('call:initiated', (data: any) => {
      this.emitToListeners('call:initiate', data);
    });

    this.socket.on('call:incoming', (data: any) => {
      this.emitToListeners('call:incoming', data);
    });

    this.socket.on('call:accepted', (data: any) => {
      this.emitToListeners('call:accepted', data);
    });

    this.socket.on('call:rejected', (data: any) => {
      console.log('📨 Frontend: Received call:rejected event:', data);
      this.emitToListeners('call:rejected', data);
    });

    this.socket.on('call:ended', (data: any) => {
      this.emitToListeners('call:ended', data);
    });

    this.socket.on('call:error', (data: any) => {
      console.error('Call error:', data);
      this.emitToListeners('call:error', data);
    });

    // WebRTC signaling events
    this.socket.on('webrtc:offer', (data: any) => {
      this.emitToListeners('webrtc:offer', data);
    });

    this.socket.on('webrtc:answer', (data: any) => {
      this.emitToListeners('webrtc:answer', data);
    });

    this.socket.on('webrtc:ice-candidate', (data: any) => {
      this.emitToListeners('webrtc:ice-candidate', data);
    });

    // Call participant events
    this.socket.on('call:participant-joined', (data: any) => {
      // Handle participant join
    });

    this.socket.on('call:media-status-changed', (data: any) => {
      // Handle media status change
    });
  }

  // Emit events to registered listeners
  private emitToListeners(event: CallEvent, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  // Call Management Methods
  
  // Initiate a call
  initiateCall(receiverId: string, callType: CallType, metadata?: string): void {
    console.log('🚀 Frontend: initiateCall called with:', { receiverId, callType, metadata });
    console.log('🚀 Frontend: Socket connected:', !!this.socket?.connected);
    console.log('🚀 Frontend: isConnected flag:', this.isConnected);
    
    if (!this.isSocketReady()) {
      console.log('❌ Frontend: Socket not ready, aborting call initiation');
      return;
    }

    const payload: CallEventPayload['call:initiate'] = {
      receiverId,
      callType,
      metadata,
    };

    console.log('📤 Frontend: Emitting call:initiate with payload:', payload);
    this.socket!.emit('call:initiate', payload);
  }

  // Accept an incoming call
  acceptCall(callId: string): void {
    console.log('✅ Frontend: acceptCall called with callId:', callId);
    console.log('✅ Frontend: Socket exists:', !!this.socket);
    console.log('✅ Frontend: Socket connected:', !!this.socket?.connected);
    console.log('✅ Frontend: isConnected flag:', this.isConnected);
    console.log('✅ Frontend: isSocketReady result:', this.isSocketReady());
    
    if (!this.isSocketReady()) {
      console.log('❌ Frontend: Socket not ready, aborting call accept');
      return;
    }

    const payload: CallEventPayload['call:accept'] = { callId };
    console.log('📤 Frontend: Emitting call:accept with payload:', payload);
    this.socket!.emit('call:accept', payload);
    console.log('📤 Frontend: call:accept event emitted successfully');
  }

  // Reject an incoming call
  rejectCall(callId: string, reason?: string): void {
    console.log('❌ Frontend: rejectCall called with callId:', callId, 'reason:', reason);
    console.log('❌ Frontend: Socket connected:', !!this.socket?.connected);
    
    if (!this.isSocketReady()) {
      console.log('❌ Frontend: Socket not ready, aborting call reject');
      return;
    }

    const payload: CallEventPayload['call:reject'] = { callId, reason };
    console.log('📤 Frontend: Emitting call:reject with payload:', payload);
    this.socket!.emit('call:reject', payload);
  }

  // End an active call
  endCall(callId: string, reason?: string): void {
    if (!this.isSocketReady()) return;

    const payload: CallEventPayload['call:end'] = { callId, reason };
    this.socket!.emit('call:end', payload);
  }

  // Join a call room
  joinCall(callId: string, mediaConstraints?: { video: boolean; audio: boolean }): void {
    if (!this.isSocketReady()) return;

    this.socket!.emit('call:join', { callId, mediaConstraints });
  }

  // WebRTC Signaling Methods

  // Send WebRTC offer
  sendOffer(callId: string, offer: RTCSessionDescriptionInit, targetUserId?: string): void {
    if (!this.isSocketReady()) return;

    const payload = {
      callId,
      type: 'offer' as const,
      data: offer,
      targetUserId,
    };

    this.socket!.emit('webrtc:offer', payload);
  }

  // Send WebRTC answer
  sendAnswer(callId: string, answer: RTCSessionDescriptionInit, targetUserId?: string): void {
    if (!this.isSocketReady()) return;

    const payload = {
      callId,
      type: 'answer' as const,
      data: answer,
      targetUserId,
    };

    this.socket!.emit('webrtc:answer', payload);
  }

  // Send ICE candidate
  sendIceCandidate(callId: string, candidate: RTCIceCandidate, targetUserId?: string): void {
    if (!this.isSocketReady()) return;

    const payload = {
      callId,
      type: 'ice-candidate' as const,
      data: candidate,
      targetUserId,
    };

    this.socket!.emit('webrtc:ice-candidate', payload);
  }

  // Update media status (mute/unmute, video on/off)
  updateMediaStatus(callId: string, audio?: boolean, video?: boolean): void {
    if (!this.isSocketReady()) return;

    this.socket!.emit('call:media-status', { callId, audio, video });
  }

  // Event Listener Management

  // Add event listener
  on<T extends CallEvent>(event: T, listener: (data: CallEventPayload[T]) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  // Remove event listener
  off<T extends CallEvent>(event: T, listener: (data: CallEventPayload[T]) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    const filteredListeners = listeners.filter(l => l !== listener);
    this.eventListeners.set(event, filteredListeners);
  }

  // Remove all listeners for an event
  removeAllListeners(event?: CallEvent): void {
    if (event) {
      this.eventListeners.set(event, []);
    } else {
      this.eventListeners.forEach((_, key) => {
        this.eventListeners.set(key, []);
      });
    }
  }

  // Utility Methods

  // Check if socket is ready
  private isSocketReady(): boolean {
    if (!this.socket) {
      console.warn('❌ Socket is null/undefined');
      return false;
    }
    if (!this.isConnected) {
      console.warn('❌ Socket isConnected flag is false');
      return false;
    }
    if (!this.socket.connected) {
      console.warn('❌ Socket.connected is false');
      return false;
    }
    return true;
  }

  // Reconnect to socket
  private async reconnect(): Promise<void> {
    if (this.authToken) {
  
      try {
        await this.connect(this.authToken);
      } catch (error) {
        console.error('Failed to reconnect:', error);
      }
    }
  }

  // Get connection status
  isConnectedToSocket(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Get socket ID
  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  // Disconnect from socket
  disconnect(): void {
    if (this.socket) {
  
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.authToken = null;
      
      // Clear all event listeners
      this.removeAllListeners();
    }
  }

  // Force reconnect
  async forceReconnect(): Promise<void> {
    this.disconnect();
    if (this.authToken) {
      await this.connect(this.authToken);
    }
  }
}

// Singleton instance
export const callSocketService = new CallSocketService();