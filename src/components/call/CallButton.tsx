import React, { useState } from 'react';
import { Button, Dropdown, Menu, Tooltip } from 'antd';
import { 
  PhoneOutlined, 
  VideoCameraOutlined, 
  DownOutlined 
} from '@ant-design/icons';
import { CallType } from '@/types/call';
import { useCall } from '@/hooks/useCall';

interface CallButtonProps {
  userId: string;
  userName?: string;
  compact?: boolean;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
}

export const CallButton: React.FC<CallButtonProps> = ({
  userId,
  userName = 'Unknown User',
  compact = false,
  style,
  className,
  disabled = false
}) => {
  const { initiateCall, isLoading, isConnected } = useCall();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleVoiceCall = async () => {
    try {
      await initiateCall(userId, CallType.VOICE);
    } catch (error) {
      console.error('Failed to start voice call:', error);
    }
  };

  const handleVideoCall = async () => {
    try {
      await initiateCall(userId, CallType.VIDEO);
    } catch (error) {
      console.error('Failed to start video call:', error);
    }
  };

  const callMenuItems = [
    {
      key: 'voice',
      icon: <PhoneOutlined />,
      label: 'Voice Call',
      onClick: handleVoiceCall,
      disabled: isLoading || !isConnected,
    },
    {
      key: 'video',
      icon: <VideoCameraOutlined />,
      label: 'Video Call',
      onClick: handleVideoCall,
      disabled: isLoading || !isConnected,
    },
  ];

  // Compact mode - single button with dropdown
  if (compact) {
    return (
      <Dropdown
        menu={{ items: callMenuItems }}
        trigger={['click']}
        placement="bottomRight"
        disabled={disabled || !isConnected}
        open={isMenuOpen}
        onOpenChange={setIsMenuOpen}
      >
        <Tooltip title={`Call ${userName}`}>
          <Button
            type="text"
            icon={<PhoneOutlined />}
            loading={isLoading}
            disabled={disabled || !isConnected}
            style={style}
            className={className}
          />
        </Tooltip>
      </Dropdown>
    );
  }

  // Full mode - separate buttons
  return (
    <Button.Group style={style} className={className}>
      <Tooltip title={`Voice call ${userName}`}>
        <Button
          type="default"
          icon={<PhoneOutlined />}
          onClick={handleVoiceCall}
          loading={isLoading}
          disabled={disabled || !isConnected}
        />
      </Tooltip>
      <Tooltip title={`Video call ${userName}`}>
        <Button
          type="default"
          icon={<VideoCameraOutlined />}
          onClick={handleVideoCall}
          loading={isLoading}
          disabled={disabled || !isConnected}
        />
      </Tooltip>
    </Button.Group>
  );
};