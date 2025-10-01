import React, { useState } from 'react';
import { Button, Space, Tooltip, Dropdown, Menu } from 'antd';
import {
  PhoneOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  VideoCameraAddOutlined,
  SwapOutlined,
  MoreOutlined,
  SettingOutlined,
  FullscreenOutlined,
  PlayCircleOutlined,
  ShareAltOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { CallControlsProps, CallType } from '@/types/call';
import './CallControls.module.css';

interface ExtendedCallControlsProps extends CallControlsProps {
  callType?: CallType;
  isFullscreen?: boolean;
  canSwitchCamera?: boolean;
  canShareScreen?: boolean;
  canRecord?: boolean;
  showChatButton?: boolean;
  onToggleFullscreen?: () => void;
  onShareScreen?: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onOpenChat?: () => void;
  onOpenSettings?: () => void;
  isRecording?: boolean;
  isSharingScreen?: boolean;
  compact?: boolean;
  vertical?: boolean;
}

export const CallControls: React.FC<ExtendedCallControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  onSwitchCamera,
  callType = CallType.VIDEO,
  isFullscreen = false,
  canSwitchCamera = true,
  canShareScreen = true,
  canRecord = false,
  showChatButton = true,
  onToggleFullscreen,
  onShareScreen,
  onStartRecording,
  onStopRecording,
  onOpenChat,
  onOpenSettings,
  isRecording = false,
  isSharingScreen = false,
  compact = false,
  vertical = false
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Handle recording toggle
  const handleRecordingToggle = () => {
    if (isRecording) {
      onStopRecording?.();
    } else {
      onStartRecording?.();
    }
  };

  // Create more options menu
  const moreOptionsMenu = (
    <Menu>
      {onToggleFullscreen && (
        <Menu.Item 
          key="fullscreen" 
          icon={<FullscreenOutlined />}
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </Menu.Item>
      )}
      
      {canShareScreen && onShareScreen && (
        <Menu.Item 
          key="screen-share" 
          icon={<ShareAltOutlined />}
          onClick={onShareScreen}
        >
          {isSharingScreen ? 'Stop Sharing' : 'Share Screen'}
        </Menu.Item>
      )}
      
      {canRecord && (onStartRecording || onStopRecording) && (
        <Menu.Item 
          key="recording" 
          icon={<PlayCircleOutlined />}
          onClick={handleRecordingToggle}
          className={isRecording ? 'recording-active' : ''}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Menu.Item>
      )}
      
      {showChatButton && onOpenChat && (
        <Menu.Item 
          key="chat" 
          icon={<MessageOutlined />}
          onClick={onOpenChat}
        >
          Open Chat
        </Menu.Item>
      )}
      
      {onOpenSettings && (
        <Menu.Item 
          key="settings" 
          icon={<SettingOutlined />}
          onClick={onOpenSettings}
        >
          Call Settings
        </Menu.Item>
      )}
    </Menu>
  );

  const controlsClassName = `call-controls-container ${compact ? 'compact' : ''} ${vertical ? 'vertical' : ''}`;

  return (
    <div className={controlsClassName}>
      <Space 
        size={compact ? 'small' : 'middle'} 
        direction={vertical ? 'vertical' : 'horizontal'}
        className="controls-space"
      >
        {/* Audio toggle */}
        <Tooltip title={isAudioEnabled ? 'Mute' : 'Unmute'}>
          <Button
            type={isAudioEnabled ? 'default' : 'primary'}
            danger={!isAudioEnabled}
            shape="circle"
            size={compact ? 'middle' : 'large'}
            icon={isAudioEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
            onClick={onToggleAudio}
            className={`control-btn ${!isAudioEnabled ? 'muted' : ''}`}
          />
        </Tooltip>

        {/* Video toggle (only for video calls) */}
        {callType === CallType.VIDEO && (
          <Tooltip title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}>
            <Button
              type={isVideoEnabled ? 'default' : 'primary'}
              danger={!isVideoEnabled}
              shape="circle"
              size={compact ? 'middle' : 'large'}
              icon={isVideoEnabled ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
              onClick={onToggleVideo}
              className={`control-btn ${!isVideoEnabled ? 'video-off' : ''}`}
            />
          </Tooltip>
        )}

        {/* Camera switch (only for video calls with camera) */}
        {callType === CallType.VIDEO && canSwitchCamera && onSwitchCamera && isVideoEnabled && (
          <Tooltip title="Switch camera">
            <Button
              type="default"
              shape="circle"
              size={compact ? 'middle' : 'large'}
              icon={<SwapOutlined />}
              onClick={onSwitchCamera}
              className="control-btn"
            />
          </Tooltip>
        )}

        {/* Screen share (quick access for common action) */}
        {!compact && canShareScreen && onShareScreen && (
          <Tooltip title={isSharingScreen ? 'Stop sharing screen' : 'Share screen'}>
            <Button
              type={isSharingScreen ? 'primary' : 'default'}
              shape="circle"
              size={compact ? 'middle' : 'large'}
              icon={<ShareAltOutlined />}
              onClick={onShareScreen}
              className={`control-btn ${isSharingScreen ? 'sharing-screen' : ''}`}
            />
          </Tooltip>
        )}

        {/* Recording indicator (quick access) */}
        {!compact && isRecording && (
          <Tooltip title="Recording in progress">
            <Button
              type="primary"
              danger
              shape="circle"
              size={compact ? 'middle' : 'large'}
              icon={<PlayCircleOutlined />}
              onClick={handleRecordingToggle}
              className="control-btn recording-active"
            />
          </Tooltip>
        )}

        {/* More options */}
        {!compact && (
          <Dropdown
            overlay={moreOptionsMenu}
            trigger={['click']}
            placement="topCenter"
            open={isMenuOpen}
            onOpenChange={setIsMenuOpen}
          >
            <Tooltip title="More options">
              <Button
                type="default"
                shape="circle"
                size={compact ? 'middle' : 'large'}
                icon={<MoreOutlined />}
                className="control-btn"
              />
            </Tooltip>
          </Dropdown>
        )}

        {/* End call */}
        <Tooltip title="End call">
          <Button
            type="primary"
            danger
            shape="circle"
            size={compact ? 'middle' : 'large'}
            icon={<PhoneOutlined />}
            onClick={onEndCall}
            className="control-btn end-call-btn"
          />
        </Tooltip>
      </Space>
    </div>
  );
};