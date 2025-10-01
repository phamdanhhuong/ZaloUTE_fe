import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  CallType, 
  UseCallReturn, 
  MediaConstraints,
  CallEventPayload,
  ActiveCall
} from '@/types/call';
import { 
  selectCurrentCall,
  selectIncomingCall,
  selectIsConnected,
  selectLocalStream,
  selectRemoteStream,
  selectCallError,
  selectCallLoading,
  setConnected,
  setLocalStream,
  setRemoteStream,
  clearError,
  handleCallInitiated,
  handleIncomingCall,
  handleCallAccepted,
  handleCallRejected,
  handleCallEnded,
  handleCallError,
  initiateCallAsync,
  acceptCallAsync,
  rejectCallAsync,
  endCallAsync,
  getCallHistoryAsync,
  updateParticipantMediaStatus
} from '@/store/slices/callSlice';
import { RootState, AppDispatch } from '@/store';
import { WebRTCService } from '@/services/webrtc.service';
import { callSocketService } from '@/services/call-socket.service';
import useCallNotifications from '@/features/call/hooks/useCallNotifications';
import { getAudioGeneratorService } from '@/features/call/utils/audioGenerator';
import useErrorHandling from '@/features/call/hooks/useErrorHandling';
import { CallErrorType } from '@/features/call/services/errorHandler.service';
import { CallNotificationData } from '@/features/call/services/notification.service';

interface UseCallOptions {
  autoConnect?: boolean;
  defaultMediaConstraints?: MediaConstraints;
}

export const useCall = (options: UseCallOptions = {}): UseCallReturn => {
  const {
    autoConnect = true,
    defaultMediaConstraints = { audio: true, video: true }
  } = options;

  const dispatch = useDispatch<AppDispatch>();
  
  // Redux state
  const currentCall = useSelector(selectCurrentCall);
  const incomingCall = useSelector(selectIncomingCall);
  const isConnected = useSelector(selectIsConnected);
  const localStream = useSelector(selectLocalStream);
  const remoteStream = useSelector(selectRemoteStream);
  const error = useSelector(selectCallError);
  const isLoading = useSelector(selectCallLoading);

  // Services
  const webRTCServiceRef = useRef<WebRTCService | null>(null);
  const webRTCInitializedRef = useRef<Set<string>>(new Set());
  const processedAnswersRef = useRef<Set<string>>(new Set());
  const processedEventsRef = useRef<Set<string>>(new Set());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  // Cleanup function for call-specific tracking
  const cleanupCallTracking = useCallback((callId: string) => {
    const keysToRemove = Array.from(webRTCInitializedRef.current).filter(key => key.includes(callId));
    keysToRemove.forEach(key => webRTCInitializedRef.current.delete(key));
    
    const answerKeysToRemove = Array.from(processedAnswersRef.current).filter(key => key.includes(callId));
    answerKeysToRemove.forEach(key => processedAnswersRef.current.delete(key));
    
    console.log('🧹 useCall: Cleaned up tracking for call:', callId, 'Removed keys:', keysToRemove.length, 'Answer keys:', answerKeysToRemove.length);
  }, []);
  
  // Debouncing for duplicate operations
  const lastAcceptCallRef = useRef<number>(0);
  const lastRejectCallRef = useRef<number>(0);
  const DEBOUNCE_TIME = 2000; // 2 seconds

  // Notifications
  const {
    showIncomingCall,
    showCallStatus,
    closeAllNotifications,
    playSound,
    stopSound,
    stopAllSounds
  } = useCallNotifications({
    onNotificationClick: (action, callData) => {
      if (action === 'answer') {
        acceptCall(callData.callId);
      } else if (action === 'decline') {
        rejectCall(callData.callId, 'declined_by_user');
      }
    }
  });

  // Error Handling
  const {
    reportError,
    clearCurrentError,
    currentError,
    isRecovering
  } = useErrorHandling({
    callId: currentCall?.callId,
    onError: (error) => {
      console.error('Call error:', error);
    },
    onRecoverySuccess: (error) => {

    },
    onRecoveryFailed: (error) => {
      console.error('Recovery failed for:', error.type);
    }
  });

  // Get user token from auth state (adjust path based on your auth slice)
  const authToken = useSelector((state: RootState) => state.user?.token || '');

  // Initialize WebRTC service
  useEffect(() => {
    webRTCServiceRef.current = new WebRTCService();
    
    const webRTC = webRTCServiceRef.current;
    
    // Setup WebRTC event listeners
    webRTC.setOnLocalStream((stream) => {
      console.log('🎬 useCall: Local stream received, dispatching to store:', stream);
      dispatch(setLocalStream(stream));
    });

    webRTC.setOnRemoteStream((stream) => {
      console.log('🎬 useCall: Remote stream received, dispatching to store:', {
        stream,
        id: stream?.id,
        active: stream?.active,
        videoTracks: stream?.getVideoTracks().length,
        audioTracks: stream?.getAudioTracks().length
      });
      dispatch(setRemoteStream(stream));
    });

    webRTC.setOnIceCandidate((candidate) => {
      if (currentCall) {
        callSocketService.sendIceCandidate(currentCall.callId, candidate);
      }
    });

    webRTC.setOnConnectionStateChange((state) => {

      if (state === 'connected') {
        dispatch(setConnected(true));
        // Clear any connection errors on successful connection
        clearCurrentError();
      } else if (state === 'disconnected') {
        dispatch(setConnected(false));
        reportError(CallErrorType.CONNECTION_LOST, {
          message: 'Connection to the other participant was lost'
        });
      } else if (state === 'failed') {
        dispatch(setConnected(false));
        reportError(CallErrorType.ICE_CONNECTION_FAILED, {
          message: 'Failed to establish connection with the other participant'
        });
      }
    });

    return () => {
      webRTC.cleanup();
    };
  }, [dispatch, currentCall]);

  // Initialize socket connection
  useEffect(() => {
    if (autoConnect && authToken && !callSocketService.isConnectedToSocket()) {
      connectToCallService();
    }
  }, [authToken, autoConnect]);

  // Setup socket event listeners
  useEffect(() => {
    const handleIncomingCallEvent = async (data: CallEventPayload['call:incoming']) => {
      dispatch(handleIncomingCall(data));
      
      // Show notification for incoming call
      const callData: CallNotificationData = {
        callId: data.callId,
        callType: data.call.callType,
        callerName: data.caller?.username || 'Unknown caller',
        callerAvatar: data.caller?.avatar,
        timestamp: Date.now()
      };
      
      await showIncomingCall(callData.callerName, callData);
    };

    const handleCallAcceptedEvent = async (data: CallEventPayload['call:accepted']) => {
      console.log('🎉 useCall: Received call:accepted event:', data);
      
      // Ultra-strong deduplication with multiple checks using content hash
      const callKey = `${data.callId}-accepted`;
      const contentHash = btoa(JSON.stringify({
        callId: data.callId,
        acceptedBy: data.acceptedBy,
        timestamp: Math.floor(Date.now() / 1000) // Round to seconds to group rapid events
      }));
      
      // Check if we've processed ANY acceptance for this call
      if (webRTCInitializedRef.current.has(callKey) || processedEventsRef.current.has(contentHash)) {
        console.log('🔗 useCall: Call acceptance already processed for:', data.callId);
        return;
      }
      
      // Mark this call as being processed
      webRTCInitializedRef.current.add(callKey);
      processedEventsRef.current.add(contentHash);
      
      dispatch(handleCallAccepted(data));
      
      // Stop incoming call sounds and play connected sound
      stopSound('incoming');
      await playSound('connected');
      
      // Close notifications
      closeAllNotifications();
      
      try {
        console.log('🔗 useCall: Initializing WebRTC after call acceptance...');
        
        if (webRTCServiceRef.current) {
          // Only recreate WebRTC service if it doesn't exist or is corrupted
          // Avoid unnecessary cleanup that destroys remote streams
          const needsRecreation = !webRTCServiceRef.current || 
                                 (webRTCServiceRef.current as any).__destroyed;
          
          if (needsRecreation) {
            console.log('🔄 useCall: Creating new WebRTC service (needed)...');
            if (webRTCServiceRef.current) {
              webRTCServiceRef.current.cleanup();
            }
            webRTCServiceRef.current = new WebRTCService();
          } else {
            console.log('🔄 useCall: Reusing existing WebRTC service...');
          }
          
          // Re-setup WebRTC event listeners
          const webRTC = webRTCServiceRef.current;
          webRTC.setOnLocalStream((stream) => {
            console.log('🎬 useCall (accepted): Local stream received, dispatching to store:', stream);
            dispatch(setLocalStream(stream));
          });
          webRTC.setOnRemoteStream((stream) => {
            console.log('🎬 useCall (accepted): Remote stream received, dispatching to store:', {
              stream,
              id: stream?.id,
              active: stream?.active,
              videoTracks: stream?.getVideoTracks().length,
              audioTracks: stream?.getAudioTracks().length
            });
            dispatch(setRemoteStream(stream));
          });
          webRTC.setOnIceCandidate((candidate) => {
            if (currentCall) {
              callSocketService.sendIceCandidate(currentCall.callId, candidate);
            }
          });
          webRTC.setOnConnectionStateChange((state) => {
            if (state === 'connected') {
              dispatch(setConnected(true));
              clearCurrentError();
            } else if (state === 'disconnected') {
              dispatch(setConnected(false));
              reportError(CallErrorType.CONNECTION_LOST, {
                message: 'Connection to the other participant was lost'
              });
            } else if (state === 'failed') {
              dispatch(setConnected(false));
              reportError(CallErrorType.ICE_CONNECTION_FAILED, {
                message: 'Failed to establish connection with the other participant'
              });
            }
          });
          
          // Get media using WebRTC service
          const stream = await webRTCServiceRef.current.getUserMedia({ audio: true, video: true });
          console.log('🎥 useCall: Local media stream obtained for call:', data.callId);
          
          // Dispatch to Redux
          dispatch(setLocalStream(stream));
          
          // Determine call role and start WebRTC signaling
          const call = data.call;
          const acceptedBy = data.acceptedBy;
          
          // Safely parse JWT token
          let currentUserId: string | null = null;
          try {
            if (authToken && authToken.includes('.')) {
              const payload = JSON.parse(atob(authToken.split('.')[1]));
              currentUserId = payload.sub;
            }
          } catch (error) {
            console.warn('🔍 useCall: Failed to parse JWT token:', error);
          }
          
          // Extract IDs from populated objects
          let callerId: string | null = null;
          let receiverId: string | null = null;
          
          if (call?.callerId) {
            if (typeof call.callerId === 'object' && (call.callerId as any)?._id) {
              callerId = (call.callerId as any)._id.toString();
            } else if (typeof call.callerId === 'string' && call.callerId.includes('ObjectId(')) {
              const match = call.callerId.match(/ObjectId\('([^']+)'\)/);
              callerId = match ? match[1] : call.callerId;
            } else {
              callerId = String(call.callerId);
            }
          }
          
          if (call?.receiverId) {
            if (typeof call.receiverId === 'object' && (call.receiverId as any)?._id) {
              receiverId = (call.receiverId as any)._id.toString();
            } else if (typeof call.receiverId === 'string' && call.receiverId.includes('ObjectId(')) {
              const match = call.receiverId.match(/ObjectId\('([^']+)'\)/);
              receiverId = match ? match[1] : call.receiverId;
            } else {
              receiverId = String(call.receiverId);
            }
          }
          
          console.log('🔍 useCall: Call roles - callerId:', callerId, 'receiverId:', receiverId);
          console.log('🔍 useCall: AcceptedBy:', acceptedBy, 'CurrentUser:', currentUserId);
          
          // If current user is the caller (not the one who accepted), create offer
          if (currentUserId && callerId && currentUserId === callerId && currentUserId !== acceptedBy && receiverId) {
            // Prevent multiple offer creation for the same call
            const offerCreationKey = `${data.callId}-offer-creation`;
            if (webRTCInitializedRef.current.has(offerCreationKey)) {
              console.log('� useCall: Offer already created for this call, skipping...');
              return;
            }
            webRTCInitializedRef.current.add(offerCreationKey);
            
            console.log('�🚀 useCall: Current user is caller, creating WebRTC offer...');
            try {
              // Give the receiver a moment to fully initialize their WebRTC service
              await new Promise(resolve => setTimeout(resolve, 200));
              
              const offer = await webRTCServiceRef.current.createOffer();
              console.log('📤 useCall: WebRTC offer created, sending to receiver...');
              callSocketService.sendOffer(data.callId, offer, receiverId);
            } catch (offerError) {
              console.error('❌ useCall: Failed to create WebRTC offer:', offerError);
              // Remove the key if offer creation failed so it can retry
              webRTCInitializedRef.current.delete(offerCreationKey);
            }
          } else {
            console.log('🎯 useCall: Current user is receiver, waiting for WebRTC offer...');
          }
          
          console.log('🚀 useCall: WebRTC connection initialized, ready for signaling...');
        }
      } catch (error) {
        console.error('❌ useCall: Failed to initialize WebRTC after acceptance:', error);
        reportError(CallErrorType.MEDIA_STREAM_FAILED, {
          message: 'Failed to access camera/microphone after call acceptance'
        });
      }
      
      // Show status notification
      await showCallStatus('Call Connected', 'Call has been accepted');
    };

    const handleCallRejectedEvent = async (data: CallEventPayload['call:rejected']) => {
      console.log('❌ useCall: Received call:rejected event:', data);
      dispatch(handleCallRejected(data));
      
      // Clean up call tracking for this call
      const callId = data.callId;
      console.log('🧹 Cleaning up call tracking for rejected call:', callId);
      cleanupCallTracking(callId);
      webRTCInitializedRef.current.clear();
      
      // Stop all call sounds and play busy tone
      stopAllSounds();
      await playSound('busy', { duration: 3000 });
      
      // Close notifications
      closeAllNotifications();
      
      // Show status notification
      await showCallStatus('Call Rejected', 'The call was declined');
    };

    const handleCallEndedEvent = async (data: CallEventPayload['call:ended']) => {
      dispatch(handleCallEnded(data));
      
      // Cleanup WebRTC resources and initialization tracking
      webRTCServiceRef.current?.cleanup();
      webRTCInitializedRef.current.clear();
      
      // Stop all sounds and play end sound
      stopAllSounds();
      await playSound('ended');
      
      // Close notifications
      closeAllNotifications();
      
      // Show status notification if call had duration
      if (data.call?.duration && data.call.duration > 0) {
        const duration = Math.round(data.call.duration);
        await showCallStatus('Call Ended', `Call duration: ${duration} seconds`);
      } else {
        await showCallStatus('Call Ended', 'Call has ended');
      }
    };

    const handleCallErrorEvent = async (data: CallEventPayload['call:error']) => {
      dispatch(handleCallError(data));
      
      // Stop all sounds
      stopAllSounds();
      
      // Close notifications
      closeAllNotifications();
      
      // Show error notification
      await showCallStatus('Call Failed', data.message || 'An error occurred during the call');
    };

    const handleWebRTCOffer = async (data: CallEventPayload['webrtc:offer']) => {
      try {
        console.log('📥 useCall: Received WebRTC offer for call:', data.callId);
        
        // Strong offer deduplication - track offers by callId + offer content hash
        const offerHash = btoa(JSON.stringify(data.data)).substring(0, 20);
        const offerKey = `${data.callId}-offer-${offerHash}`;
        
        if (webRTCInitializedRef.current.has(offerKey)) {
          console.log('🔁 useCall: Duplicate offer ignored for:', data.callId);
          return;
        }
        webRTCInitializedRef.current.add(offerKey);
        
        if (!webRTCServiceRef.current) {
          console.error('❌ useCall: WebRTC service not initialized when handling offer');
          return;
        }
        
        // Check if we're in a valid state to handle offers
        const peerConnection = (webRTCServiceRef.current as any).peerConnection;
        if (!peerConnection) {
          console.error('❌ useCall: Peer connection not available when handling offer');
          return;
        }
        
        console.log('🔄 useCall: Peer connection state before handling offer:', peerConnection.signalingState);
        
        // Only process offers in stable state (first time) or if we don't have remote description
        if (peerConnection.signalingState !== 'stable' && peerConnection.remoteDescription) {
          console.warn('⚠️ useCall: Ignoring duplicate offer - already processing. State:', peerConnection.signalingState);
          return;
        }
        
        const answer = await webRTCServiceRef.current.handleOffer(data.data);
        console.log('📤 useCall: WebRTC answer created, sending to caller...');
        callSocketService.sendAnswer(data.callId, answer, data.from);
      } catch (error) {
        console.error('❌ useCall: Failed to handle WebRTC offer:', error);
        reportError(CallErrorType.OFFER_ANSWER_FAILED, {
          message: 'Failed to process incoming video call offer',
          details: error
        });
      }
    };

    const handleWebRTCAnswer = async (data: CallEventPayload['webrtc:answer']) => {
      try {
        console.log('📥 useCall: Received WebRTC answer for call:', data.callId);
        
        // Check for duplicate answers using content hash
        const answerHash = btoa(JSON.stringify(data.data));
        const answerKey = `answer_${data.callId}_${answerHash}`;
        
        if (processedAnswersRef.current.has(answerKey)) {
          console.log('🔁 useCall: Duplicate answer ignored for:', data.callId);
          return;
        }
        
        // Mark as processed
        processedAnswersRef.current.add(answerKey);
        
        if (webRTCServiceRef.current) {
          await webRTCServiceRef.current.handleAnswer(data.data);
        }
      } catch (error) {
        console.error('🚫 Failed to handle WebRTC answer:', error);
      }
    };

    const handleWebRTCIceCandidate = async (data: CallEventPayload['webrtc:ice-candidate']) => {
      try {
        if (webRTCServiceRef.current) {
          await webRTCServiceRef.current.handleIceCandidate(data.candidate);
        }
      } catch (error) {
        console.error('Failed to handle WebRTC ICE candidate:', error);
      }
    };

    // Register event listeners
    callSocketService.on('call:incoming', handleIncomingCallEvent);
    callSocketService.on('call:accepted', handleCallAcceptedEvent);
    callSocketService.on('call:rejected', handleCallRejectedEvent);
    callSocketService.on('call:ended', handleCallEndedEvent);
    callSocketService.on('call:error', handleCallErrorEvent);
    callSocketService.on('webrtc:offer', handleWebRTCOffer);
    callSocketService.on('webrtc:answer', handleWebRTCAnswer);
    callSocketService.on('webrtc:ice-candidate', handleWebRTCIceCandidate);

    return () => {
      // Cleanup event listeners
      callSocketService.off('call:incoming', handleIncomingCallEvent);
      callSocketService.off('call:accepted', handleCallAcceptedEvent);
      callSocketService.off('call:rejected', handleCallRejectedEvent);
      callSocketService.off('call:ended', handleCallEndedEvent);
      callSocketService.off('call:error', handleCallErrorEvent);
      callSocketService.off('webrtc:offer', handleWebRTCOffer);
      callSocketService.off('webrtc:answer', handleWebRTCAnswer);
      callSocketService.off('webrtc:ice-candidate', handleWebRTCIceCandidate);
    };
  }, [dispatch]);

  // Connect to call service
  const connectToCallService = useCallback(async () => {
    if (!authToken) {
      console.warn('No auth token available for call service connection');
      return;
    }

    try {
      await callSocketService.connect(authToken);
      dispatch(setConnected(true));
    } catch (error) {
      console.error('Failed to connect to call service:', error);
      dispatch(setConnected(false));
    }
  }, [authToken, dispatch]);

  // Initiate a call
  const initiateCall = useCallback(async (receiverId: string, callType: CallType) => {
    if (!authToken) {
      throw new Error('Authentication required');
    }

    try {
      // First get user media
      if (webRTCServiceRef.current) {
        const constraints: MediaConstraints = {
          audio: true,
          video: callType === CallType.VIDEO
        };
        
        await webRTCServiceRef.current.getUserMedia(constraints);
        setIsAudioEnabled(true);
        setIsVideoEnabled(callType === CallType.VIDEO);
      }

      // Initiate call via API and socket
      await dispatch(initiateCallAsync({ receiverId, callType, token: authToken })).unwrap();
      
      // Play outgoing call sound
      await playSound('outgoing', { loop: true, duration: 30000 });
      
      // Socket event will be handled by the event listeners above
      
    } catch (error) {
      console.error('Failed to initiate call:', error);
      // Stop outgoing sound on error
      stopSound('outgoing');
      
      // Report error
      reportError(CallErrorType.UNEXPECTED_ERROR, {
        message: 'Failed to initiate call',
        details: error
      });
      
      throw error;
    }
  }, [authToken, dispatch]);

  // Accept incoming call
  const acceptCall = useCallback(async (callId: string) => {
    console.log('🎯 useCall: acceptCall called with callId:', callId);
    console.log('🎯 useCall: authToken present:', !!authToken);
    
    // Debounce duplicate accept calls
    const now = Date.now();
    if (now - lastAcceptCallRef.current < DEBOUNCE_TIME) {
      console.log('🚫 useCall: Debouncing duplicate acceptCall, ignoring');
      return;
    }
    lastAcceptCallRef.current = now;
    
    if (!authToken) {
      throw new Error('Authentication required');
    }

    try {
      // Release any existing media streams first
      if (webRTCServiceRef.current) {
        console.log('🎯 useCall: Cleaning up existing media streams...');
        webRTCServiceRef.current.cleanup();
      }

      // Get user media first
      if (webRTCServiceRef.current && incomingCall) {
        const constraints: MediaConstraints = {
          audio: true,
          video: incomingCall.call.callType === CallType.VIDEO
        };
        
        console.log('🎯 useCall: Requesting media with constraints:', constraints);
        await webRTCServiceRef.current.getUserMedia(constraints);
        setIsAudioEnabled(true);
        setIsVideoEnabled(incomingCall.call.callType === CallType.VIDEO);
        console.log('🎯 useCall: Media access granted successfully');
      }

      // Accept call via API and socket
      await dispatch(acceptCallAsync({ callId, token: authToken })).unwrap();
      
      // Join the call room
      callSocketService.joinCall(callId, {
        audio: true,
        video: incomingCall?.call.callType === CallType.VIDEO
      });

    } catch (error) {
      console.error('Failed to accept call:', error);
      
      // If media error, try to accept call anyway and request media later
      if (error instanceof DOMException && (error.name === 'NotReadableError' || error.name === 'NotAllowedError')) {
        console.log('🎯 useCall: Media error, accepting call without media first...');
        try {
          // Accept call via API and socket without media
          await dispatch(acceptCallAsync({ callId, token: authToken })).unwrap();
          
          // Join the call room
          callSocketService.joinCall(callId, {
            audio: false, // Will enable later
            video: false
          });
          
          console.log('🎯 useCall: Call accepted, will retry media access later');
          return; // Success path
        } catch (acceptError) {
          console.error('🎯 useCall: Failed to accept call even without media:', acceptError);
        }
      }
      
      // Report error - check if it's a media error
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          reportError(CallErrorType.MEDIA_PERMISSION_DENIED, {
            message: 'Camera/microphone access denied',
            details: error
          });
        } else if (error.name === 'NotFoundError') {
          reportError(CallErrorType.MEDIA_DEVICE_NOT_FOUND, {
            message: 'Camera or microphone not found',
            details: error
          });
        } else {
          reportError(CallErrorType.MEDIA_STREAM_FAILED, {
            message: 'Failed to access media devices',
            details: error
          });
        }
      } else {
        reportError(CallErrorType.UNEXPECTED_ERROR, {
          message: 'Failed to accept call',
          details: error
        });
      }
      
      throw error;
    }
  }, [authToken, dispatch, incomingCall]);

  // Reject incoming call
  const rejectCall = useCallback(async (callId: string, reason?: string) => {
    console.log('🎯 useCall: rejectCall called with callId:', callId, 'reason:', reason);
    console.log('🎯 useCall: authToken present:', !!authToken);
    
    // Debounce duplicate reject calls
    const now = Date.now();
    if (now - lastRejectCallRef.current < DEBOUNCE_TIME) {
      console.log('🚫 useCall: Debouncing duplicate rejectCall, ignoring');
      return;
    }
    lastRejectCallRef.current = now;
    
    if (!authToken) {
      throw new Error('Authentication required');
    }

    try {
      await dispatch(rejectCallAsync({ callId, reason, token: authToken })).unwrap();
    } catch (error) {
      console.error('Failed to reject call:', error);
      throw error;
    }
  }, [authToken, dispatch]);

  // End current call
  const endCall = useCallback(async (callId: string, reason?: string) => {
    if (!authToken) {
      throw new Error('Authentication required');
    }

    try {
      await dispatch(endCallAsync({ callId, reason, token: authToken })).unwrap();
      
      // Cleanup WebRTC resources
      webRTCServiceRef.current?.cleanup();
      
    } catch (error) {
      console.error('Failed to end call:', error);
      throw error;
    }
  }, [authToken, dispatch]);

  // Toggle audio (mute/unmute)
  const toggleMute = useCallback(() => {
    if (webRTCServiceRef.current) {
      const newAudioState = webRTCServiceRef.current.toggleAudio();
      setIsAudioEnabled(newAudioState);
      
      // Notify other participants
      if (currentCall) {
        callSocketService.updateMediaStatus(currentCall.callId, newAudioState, isVideoEnabled);
        dispatch(updateParticipantMediaStatus({
          callId: currentCall.callId,
          userId: 'current_user', // Should be actual user ID
          audio: newAudioState
        }));
      }
    }
  }, [currentCall, dispatch, isVideoEnabled]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (webRTCServiceRef.current) {
      const newVideoState = webRTCServiceRef.current.toggleVideo();
      setIsVideoEnabled(newVideoState);
      
      // Notify other participants
      if (currentCall) {
        callSocketService.updateMediaStatus(currentCall.callId, isAudioEnabled, newVideoState);
        dispatch(updateParticipantMediaStatus({
          callId: currentCall.callId,
          userId: 'current_user', // Should be actual user ID
          video: newVideoState
        }));
      }
    }
  }, [currentCall, dispatch, isAudioEnabled]);

  // Switch camera (front/back)
  const switchCamera = useCallback(async () => {
    if (webRTCServiceRef.current) {
      try {
        await webRTCServiceRef.current.switchCamera();
      } catch (error) {
        console.error('Failed to switch camera:', error);
      }
    }
  }, []);

  // Clear error
  const clearCallError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Get call history
  const getCallHistory = useCallback(async () => {
    if (!authToken) {
      throw new Error('Authentication required');
    }

    try {
      const result = await dispatch(getCallHistoryAsync({ token: authToken })).unwrap();
      return result.data || [];
    } catch (error) {
      console.error('Failed to get call history:', error);
      throw error;
    }
  }, [authToken, dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      webRTCServiceRef.current?.cleanup();
    };
  }, []);

  return {
    // State
    currentCall,
    incomingCall,
    isConnected,
    localStream,
    remoteStream,
    isLoading,
    error,
    
    // Error Handling
    currentError,
    isRecovering,
    
    // Actions
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    
    // Media Controls
    toggleMute,
    toggleVideo,
    switchCamera,
    
    // Media Status
    isAudioEnabled,
    isVideoEnabled,
    
    // Utility
    clearError: clearCallError,
    getCallHistory,
    connectToCallService,
  };
};