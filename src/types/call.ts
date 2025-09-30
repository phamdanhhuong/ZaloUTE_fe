// Call Types & Enums
export enum CallType {
  VOICE = 'voice',
  VIDEO = 'video',
}

export enum CallStatus {
  PENDING = 'pending',
  RINGING = 'ringing',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  ENDED = 'ended',
  MISSED = 'missed',
  FAILED = 'failed',
}

export enum CallDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
}

// Call Entity
export interface Call {
  _id: string;
  callerId: string;
  receiverId: string;
  callType: CallType;
  status: CallStatus;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  failureReason?: string;
  metadata?: {
    quality?: string;
    networkType?: string;
    deviceInfo?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Call State Management
export interface CallState {
  currentCall: ActiveCall | null;
  incomingCall: IncomingCall | null;
  callHistory: Call[];
  isConnected: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  callWindow: {
    isOpen: boolean;
    callId: string | null;
  };
}

// Active Call
export interface ActiveCall {
  callId: string;
  participants: CallParticipant[];
  callType: CallType;
  status: CallStatus;
  startTime: Date;
  duration: number;
  isConnected: boolean;
}

// Call Participant
export interface CallParticipant {
  userId: string;
  socketId: string;
  userName: string;
  avatar?: string;
  isReady: boolean;
  mediaStatus: {
    audio: boolean;
    video: boolean;
  };
}

// Incoming Call
export interface IncomingCall {
  callId: string;
  call: Call;
  caller: CallUser;
  timestamp: Date;
}

// Call User
export interface CallUser {
  userId: string;
  username: string;
  avatar?: string;
  email?: string;
  isOnline?: boolean;
}

// Call Settings
export interface CallSettings {
  audioEnabled: boolean;
  videoEnabled: boolean;
  selectedAudioDevice?: string;
  selectedVideoDevice?: string;
  selectedOutputDevice?: string;
  autoAnswer: boolean;
  ringtoneEnabled: boolean;
  notificationsEnabled: boolean;
}

// WebRTC Signal
export interface WebRTCSignal {
  callId: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  data: RTCSessionDescriptionInit | RTCIceCandidate;
  from: string;
  to?: string;
}

// Call Events
export type CallEvent =
  | 'call:initiate'
  | 'call:accept'
  | 'call:reject'
  | 'call:end'
  | 'call:incoming'
  | 'call:accepted'
  | 'call:rejected'
  | 'call:ended'
  | 'call:error'
  | 'webrtc:offer'
  | 'webrtc:answer'
  | 'webrtc:ice-candidate';

// Call Event Payloads
export interface CallEventPayload {
  'call:initiate': {
    receiverId: string;
    callType: CallType;
    metadata?: string;
  };
  'call:accept': {
    callId: string;
  };
  'call:reject': {
    callId: string;
    reason?: string;
  };
  'call:end': {
    callId: string;
    reason?: string;
  };
  'call:incoming': {
    callId: string;
    call: Call;
    caller: CallUser;
  };
  'call:accepted': {
    callId: string;
    call: Call;
    acceptedBy: string;
  };
  'call:rejected': {
    callId: string;
    call: Call;
    rejectedBy: string;
    reason?: string;
  };
  'call:ended': {
    callId: string;
    call: Call;
    endedBy: string;
    reason?: string;
  };
  'call:error': {
    message: string;
    event?: string;
  };
  'webrtc:offer': {
    callId: string;
    from: string;
    data: RTCSessionDescriptionInit;
  };
  'webrtc:answer': {
    callId: string;
    from: string;
    data: RTCSessionDescriptionInit;
  };
  'webrtc:ice-candidate': {
    callId: string;
    from: string;
    candidate: RTCIceCandidate;
  };
}

// Media Constraints
export interface MediaConstraints {
  audio: boolean | MediaTrackConstraints;
  video: boolean | MediaTrackConstraints;
}

// Call Quality
export interface CallQuality {
  audioLevel: number;
  videoQuality: 'low' | 'medium' | 'high';
  connectionType: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
  packetLoss: number;
}

// Device Info
export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
}

// Call Notification
export interface CallNotification {
  id: string;
  type: 'incoming' | 'missed' | 'ended';
  call: Call;
  caller?: CallUser;
  timestamp: Date;
  isRead: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface CallHistoryResponse extends ApiResponse<Call[]> {
  pagination?: {
    limit: number;
    offset: number;
    count: number;
  };
}

// Hook Return Types
export interface UseCallReturn {
  // State
  currentCall: ActiveCall | null;
  incomingCall: IncomingCall | null;
  isConnected: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initiateCall: (receiverId: string, callType: CallType) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  rejectCall: (callId: string, reason?: string) => Promise<void>;
  endCall: (callId: string, reason?: string) => Promise<void>;
  
  // Media Controls
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => void;
  
  // Utility
  clearError: () => void;
  getCallHistory: () => Promise<Call[]>;
}

// Component Props
export interface CallWindowProps {
  callId: string;
  onClose?: () => void;
}

export interface IncomingCallModalProps {
  call: IncomingCall;
  onAccept: () => void;
  onReject: () => void;
}

export interface CallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  onSwitchCamera?: () => void;
}