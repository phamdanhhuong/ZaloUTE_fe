import { MediaConstraints, CallQuality, MediaDevice } from '@/types/call';

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private isInitiator: boolean = false;

  // ICE servers configuration
  private readonly iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN servers for production
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'username',
    //   credential: 'password'
    // }
  ];

  // Event listeners
  private onLocalStreamCallback?: (stream: MediaStream) => void;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;
  private onIceCandidateCallback?: (candidate: RTCIceCandidate) => void;
  private onConnectionStateChangeCallback?: (state: RTCPeerConnectionState) => void;
  private onDataChannelMessageCallback?: (message: string) => void;

  constructor() {
    this.setupPeerConnection();
  }

  // Initialize WebRTC Peer Connection
  private setupPeerConnection(): void {
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
        iceCandidatePoolSize: 10,
      });

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.onIceCandidateCallback) {
          this.onIceCandidateCallback(event.candidate);
        }
      };

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('Remote stream received');
        this.remoteStream = event.streams[0];
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        if (this.peerConnection && this.onConnectionStateChangeCallback) {
          this.onConnectionStateChangeCallback(this.peerConnection.connectionState);
        }
      };

      // Handle data channel (for chat during calls)
      this.peerConnection.ondatachannel = (event) => {
        const channel = event.channel;
        channel.onmessage = (messageEvent) => {
          if (this.onDataChannelMessageCallback) {
            this.onDataChannelMessageCallback(messageEvent.data);
          }
        };
      };

    } catch (error) {
      console.error('Failed to create peer connection:', error);
      throw new Error('WebRTC not supported in this browser');
    }
  }

  // Get user media (camera and microphone)
  async getUserMedia(constraints: MediaConstraints): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      
      // Add tracks to peer connection
      if (this.peerConnection) {
        stream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, stream);
        });
      }

      if (this.onLocalStreamCallback) {
        this.onLocalStreamCallback(stream);
      }

      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }

  // Create and send offer
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      this.isInitiator = true;
      
      // Create data channel for text messages during call
      this.dataChannel = this.peerConnection.createDataChannel('messages');
      this.setupDataChannel();

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw new Error('Failed to create call offer');
    }
  }

  // Handle incoming offer
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.setRemoteDescription(offer);
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      return answer;
    } catch (error) {
      console.error('Failed to handle offer:', error);
      throw new Error('Failed to handle call offer');
    }
  }

  // Handle incoming answer
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error('Failed to handle answer:', error);
      throw new Error('Failed to handle call answer');
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Failed to handle ICE candidate:', error);
    }
  }

  // Setup data channel for messages
  private setupDataChannel(): void {
    if (this.dataChannel) {
      this.dataChannel.onopen = () => {
        console.log('Data channel opened');
      };

      this.dataChannel.onmessage = (event) => {
        if (this.onDataChannelMessageCallback) {
          this.onDataChannelMessageCallback(event.data);
        }
      };

      this.dataChannel.onclose = () => {
        console.log('Data channel closed');
      };
    }
  }

  // Send message through data channel
  sendMessage(message: string): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(message);
    }
  }

  // Toggle audio track
  toggleAudio(): boolean {
    if (!this.localStream) return false;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  // Toggle video track
  toggleVideo(): boolean {
    if (!this.localStream) return false;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  // Switch camera (front/back)
  async switchCamera(): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const constraints = videoTrack.getConstraints() as MediaTrackConstraints;
      const currentFacingMode = constraints.facingMode;
      
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: true,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace the video track in peer connection
      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      // Stop old video track
      videoTrack.stop();
      
      // Update local stream
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newVideoTrack);

      if (this.onLocalStreamCallback) {
        this.onLocalStreamCallback(this.localStream);
      }
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  }

  // Get available media devices
  async getAvailableDevices(): Promise<MediaDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `${device.kind} ${device.deviceId.slice(0, 8)}`,
        kind: device.kind as 'audioinput' | 'audiooutput' | 'videoinput',
      }));
    } catch (error) {
      console.error('Failed to get available devices:', error);
      return [];
    }
  }

  // Switch to specific device
  async switchToDevice(deviceId: string, kind: 'audioinput' | 'videoinput'): Promise<void> {
    if (!this.localStream) return;

    try {
      const constraints: MediaStreamConstraints = {
        audio: kind === 'audioinput' ? { deviceId: { exact: deviceId } } : true,
        video: kind === 'videoinput' ? { deviceId: { exact: deviceId } } : true,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = newStream.getTracks().find(track => track.kind === kind.replace('input', ''));
      
      if (!newTrack) return;

      // Replace track in peer connection
      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find(
          s => s.track && s.track.kind === newTrack.kind
        );
        if (sender) {
          await sender.replaceTrack(newTrack);
        }
      }

      // Update local stream
      const oldTrack = this.localStream.getTracks().find(track => track.kind === newTrack.kind);
      if (oldTrack) {
        oldTrack.stop();
        this.localStream.removeTrack(oldTrack);
      }
      this.localStream.addTrack(newTrack);

      if (this.onLocalStreamCallback) {
        this.onLocalStreamCallback(this.localStream);
      }
    } catch (error) {
      console.error(`Failed to switch to ${kind}:`, error);
    }
  }

  // Get call quality metrics
  async getCallQuality(): Promise<CallQuality> {
    if (!this.peerConnection) {
      return {
        audioLevel: 0,
        videoQuality: 'low',
        connectionType: 'poor',
        latency: 0,
        packetLoss: 0,
      };
    }

    try {
      const stats = await this.peerConnection.getStats();
      let audioLevel = 0;
      let videoQuality: 'low' | 'medium' | 'high' = 'low';
      let connectionType: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
      let latency = 0;
      let packetLoss = 0;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp') {
          if (report.kind === 'audio' && report.audioLevel !== undefined) {
            audioLevel = report.audioLevel;
          }
          if (report.kind === 'video') {
            const bitrate = report.bytesReceived * 8 / report.timestamp * 1000;
            if (bitrate > 1000000) videoQuality = 'high';
            else if (bitrate > 500000) videoQuality = 'medium';
            else videoQuality = 'low';
          }
          
          if (report.packetsLost && report.packetsReceived) {
            packetLoss = (report.packetsLost / (report.packetsLost + report.packetsReceived)) * 100;
          }
        }
        
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          latency = report.currentRoundTripTime * 1000;
          
          if (latency < 100 && packetLoss < 1) connectionType = 'excellent';
          else if (latency < 200 && packetLoss < 3) connectionType = 'good';
          else if (latency < 400 && packetLoss < 5) connectionType = 'fair';
          else connectionType = 'poor';
        }
      });

      return {
        audioLevel,
        videoQuality,
        connectionType,
        latency,
        packetLoss,
      };
    } catch (error) {
      console.error('Failed to get call quality:', error);
      return {
        audioLevel: 0,
        videoQuality: 'low',
        connectionType: 'poor',
        latency: 0,
        packetLoss: 0,
      };
    }
  }

  // Event listener setters
  setOnLocalStream(callback: (stream: MediaStream) => void): void {
    this.onLocalStreamCallback = callback;
  }

  setOnRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
  }

  setOnIceCandidate(callback: (candidate: RTCIceCandidate) => void): void {
    this.onIceCandidateCallback = callback;
  }

  setOnConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  setOnDataChannelMessage(callback: (message: string) => void): void {
    this.onDataChannelMessageCallback = callback;
  }

  // Getters
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }

  // Cleanup
  cleanup(): void {
    console.log('Cleaning up WebRTC resources');

    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clear remote stream
    this.remoteStream = null;

    // Clear callbacks
    this.onLocalStreamCallback = undefined;
    this.onRemoteStreamCallback = undefined;
    this.onIceCandidateCallback = undefined;
    this.onConnectionStateChangeCallback = undefined;
    this.onDataChannelMessageCallback = undefined;
  }
}