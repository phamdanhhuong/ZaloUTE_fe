import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Avatar, Typography, Space, Badge, Spin } from 'antd';
import { 
  PhoneOutlined, 
  VideoCameraOutlined, 
  AudioOutlined, 
  AudioMutedOutlined,
  VideoCameraAddOutlined,
  SwapOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { CallWindowProps, CallType, CallStatus } from '@/types/call';
import { useCall } from '@/hooks/useCall';
import './CallWindow.module.css';

const { Title, Text } = Typography;

export const CallWindow: React.FC<CallWindowProps> = ({ 
  callId, 
  onClose 
}) => {
  const {
    currentCall,
    localStream,
    remoteStream,
    isConnected,
    isLoading,
    error,
    toggleMute,
    toggleVideo,
    switchCamera,
    endCall,
    isAudioEnabled,
    isVideoEnabled
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const callWindowRef = useRef<HTMLDivElement>(null);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentCall && currentCall.status === CallStatus.ACCEPTED) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentCall]);

  // Setup video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log('🎬 Setting local video stream:', localStream);
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log('🎬 Setting remote video stream:', {
        stream: remoteStream,
        id: remoteStream.id,
        active: remoteStream.active,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length
      });
      
      const videoElement = remoteVideoRef.current;
      
      // Check if stream is actually different to prevent unnecessary updates
      if (videoElement.srcObject !== remoteStream) {
        videoElement.srcObject = remoteStream;
        
        // Add delay to prevent rapid play() interruptions
        const playTimeout = setTimeout(() => {
          if (videoElement.srcObject === remoteStream && videoElement.paused) {
            // Only try to play if video is paused
            videoElement.play().catch(err => {
              console.warn('⚠️ Could not auto-play remote video:', err);
            });
          }
        }, 150);
        
        // Clean up timeout on unmount
        return () => clearTimeout(playTimeout);
      }
      
      // Add event listeners for video element (reuse same videoElement variable)
      
      videoElement.onloadedmetadata = () => {
        console.log('📹 Remote video metadata loaded:', {
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          duration: videoElement.duration,
          readyState: videoElement.readyState
        });
      };
      
      videoElement.onplay = () => {
        console.log('▶️ Remote video started playing');
      };
      
      videoElement.onpause = () => {
        console.log('⏸️ Remote video paused');
      };
      
      videoElement.onended = () => {
        console.log('🏁 Remote video ended');
      };
      
      videoElement.oncanplay = () => {
        console.log('🎬 Remote video can play');
      };
      
      videoElement.oncanplaythrough = () => {
        console.log('🎬 Remote video can play through');
      };
      
      videoElement.onstalled = () => {
        console.log('⚠️ Remote video stalled');
      };
      
      videoElement.onerror = (e) => {
        console.error('❌ Remote video error:', {
          error: e,
          networkState: videoElement.networkState,
          readyState: videoElement.readyState
        });
      };
    } else {
      console.log('❓ Remote video setup - missing refs or stream:', {
        hasRef: !!remoteVideoRef.current,
        hasStream: !!remoteStream
      });
    }
  }, [remoteStream]);

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    let hideTimer: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (isFullscreen) {
          setShowControls(false);
        }
      }, 3000);
    };

    if (isFullscreen) {
      document.addEventListener('mousemove', handleMouseMove);
      hideTimer = setTimeout(() => setShowControls(false), 3000);
    } else {
      setShowControls(true);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideTimer);
    };
  }, [isFullscreen]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    if (!callWindowRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await callWindowRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
    }
  };

  // Handle end call
  const handleEndCall = async () => {
    if (currentCall) {
      try {
        await endCall(currentCall.callId);
        onClose?.();
      } catch (error) {
        console.error('Failed to end call:', error);
      }
    }
  };

  // Get call status text
  const getCallStatusText = (): string => {
    if (!currentCall) return 'No active call';
    
    switch (currentCall.status) {
      case CallStatus.PENDING:
        return 'Connecting...';
      case CallStatus.RINGING:
        return 'Ringing...';
      case CallStatus.ACCEPTED:
        return isConnected ? `Connected • ${formatDuration(callDuration)}` : 'Connecting...';
      case CallStatus.ENDED:
        return 'Call ended';
      case CallStatus.FAILED:
        return 'Call failed';
      default:
        return 'Unknown status';
    }
  };

  // Get participant name (get the other participant, not current user)
  const getParticipantName = (): string => {
    if (!currentCall || currentCall.participants.length === 0) return 'Unknown';
    // Get the first participant (assuming 1-on-1 call for now)
    const participant = currentCall.participants[0];
    return participant?.userName || 'Unknown User';
  };

  // Get participant avatar
  const getParticipantAvatar = (): string | null => {
    if (!currentCall || currentCall.participants.length === 0) return null;
    const participant = currentCall.participants[0];
    return participant?.avatar || null;
  };

  if (!currentCall) {
    return (
      <Card className="call-window-error">
        <div className="call-error-content">
          <Text>No active call found</Text>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Card>
    );
  }

  const isVideoCall = currentCall.callType === CallType.VIDEO;
  const participantName = getParticipantName();
  const participantAvatar = getParticipantAvatar();

  return (
    <div 
      ref={callWindowRef}
      className={`call-window ${isFullscreen ? 'call-window-fullscreen' : ''}`}
    >
      {/* Remote Video/Audio Stream */}
      <div className="remote-stream-container">
        {isVideoCall ? (
          <div>
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="remote-video"
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div className="waiting-for-stream">
                <Avatar 
                  size={120} 
                  src={participantAvatar}
                  className="participant-avatar"
                >
                  {participantName.charAt(0).toUpperCase()}
                </Avatar>
                <Text>Waiting for video...</Text>
              </div>
            )}
          </div>
        ) : (
          <div className="audio-call-avatar">
            <Avatar 
              size={120} 
              src={participantAvatar}
              className="participant-avatar"
            >
              {participantName.charAt(0).toUpperCase()}
            </Avatar>
          </div>
        )}
        
        {/* Call Status Overlay */}
        <div className={`call-status-overlay ${showControls ? 'visible' : ''}`}>
          <div className="call-info">
            <Title level={4} className="participant-name">
              {participantName}
            </Title>
            <Text className="call-status">
              {getCallStatusText()}
            </Text>
            {error && (
              <Text type="danger" className="call-error">
                {error}
              </Text>
            )}
          </div>
        </div>
      </div>

      {/* Local Video Stream (Picture-in-Picture for video calls) */}
      {isVideoCall && localStream && (
        <div className="local-stream-container">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video"
          />
          {!isVideoEnabled && (
            <div className="video-disabled-overlay">
              <VideoCameraAddOutlined />
            </div>
          )}
        </div>
      )}

      {/* Call Controls */}
      <div className={`call-controls ${showControls ? 'visible' : ''}`}>
        <Space size="large" className="control-buttons">
          {/* Audio toggle */}
          <Button
            type={isAudioEnabled ? 'default' : 'primary'}
            danger={!isAudioEnabled}
            shape="circle"
            size="large"
            icon={isAudioEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
            onClick={toggleMute}
            className="control-button"
          />

          {/* Video toggle (only for video calls) */}
          {isVideoCall && (
            <Button
              type={isVideoEnabled ? 'default' : 'primary'}
              danger={!isVideoEnabled}
              shape="circle"
              size="large"
              icon={<VideoCameraOutlined />}
              onClick={toggleVideo}
              className="control-button"
            />
          )}

          {/* Camera switch (only for video calls) */}
          {isVideoCall && (
            <Button
              type="default"
              shape="circle"
              size="large"
              icon={<SwapOutlined />}
              onClick={switchCamera}
              className="control-button"
            />
          )}

          {/* Fullscreen toggle */}
          <Button
            type="default"
            shape="circle"
            size="large"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
            className="control-button"
          />

          {/* End call */}
          <Button
            type="primary"
            danger
            shape="circle"
            size="large"
            icon={<PhoneOutlined />}
            onClick={handleEndCall}
            className="control-button end-call-button"
            loading={isLoading}
          />
        </Space>
      </div>

      {/* Connection indicator */}
      <div className="connection-indicator">
        <Badge 
          status={isConnected ? 'success' : 'processing'} 
          text={isConnected ? 'Connected' : 'Connecting...'}
        />
        {/* Debug info */}
        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
          Local: {localStream ? `${localStream.getVideoTracks().length}v, ${localStream.getAudioTracks().length}a` : 'None'} | 
          Remote: {remoteStream ? `${remoteStream.getVideoTracks().length}v, ${remoteStream.getAudioTracks().length}a` : 'None'}
        </div>
      </div>

      {/* Close button for windowed mode */}
      {!isFullscreen && (
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          className="close-button"
        />
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};