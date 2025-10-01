import React, { useEffect, useState } from 'react';
import { Modal, Button, Avatar, Typography, Space, Row, Col, Badge, Spin } from 'antd';
import { 
  PhoneOutlined, 
  VideoCameraOutlined, 
  CloseOutlined,
  UserOutlined,
  AudioOutlined
} from '@ant-design/icons';
import { IncomingCallModalProps, CallType } from '@/types/call';
import { useCall } from '@/hooks/useCall';
import './IncomingCallModal.module.css';

const { Title, Text } = Typography;

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onReject
}) => {
  const { acceptCall, rejectCall, isLoading } = useCall();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Timer for call duration display
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-reject call after 30 seconds if not answered
  useEffect(() => {
    const autoRejectTimer = setTimeout(() => {
      handleReject('timeout');
    }, 30000);

    return () => clearTimeout(autoRejectTimer);
  }, []);

  // Handle accept call
  const handleAccept = async () => {
    // Prevent duplicate calls
    if (isProcessing || isAccepting || isRejecting) {
      console.log('🚫 IncomingCallModal: Already processing, ignoring duplicate accept');
      return;
    }
    
    console.log('🎯 IncomingCallModal: handleAccept called for callId:', call.callId);
    setIsAccepting(true);
    setIsProcessing(true);
    try {
      console.log('🎯 IncomingCallModal: Calling acceptCall...');
      await acceptCall(call.callId);
      console.log('🎯 IncomingCallModal: acceptCall completed successfully');
      onAccept();
    } catch (error) {
      console.error('❌ IncomingCallModal: Failed to accept call:', error);
    } finally {
      setIsAccepting(false);
      setIsProcessing(false);
    }
  };

  // Handle reject call
  const handleReject = async (reason?: string) => {
    // Prevent duplicate calls
    if (isProcessing || isAccepting || isRejecting) {
      console.log('🚫 IncomingCallModal: Already processing, ignoring duplicate reject');
      return;
    }
    
    console.log('🎯 IncomingCallModal: handleReject called for callId:', call.callId, 'reason:', reason);
    setIsRejecting(true);
    setIsProcessing(true);
    try {
      console.log('🎯 IncomingCallModal: Calling rejectCall...');
      await rejectCall(call.callId, reason);
      console.log('🎯 IncomingCallModal: rejectCall completed successfully');
      onReject();
    } catch (error) {
      console.error('❌ IncomingCallModal: Failed to reject call:', error);
    } finally {
      setIsRejecting(false);
      setIsProcessing(false);
    }
  };

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get call type icon
  const getCallTypeIcon = () => {
    return call.call.callType === CallType.VIDEO ? (
      <VideoCameraOutlined className="call-type-icon video" />
    ) : (
      <AudioOutlined className="call-type-icon audio" />
    );
  };

  // Get call type text
  const getCallTypeText = (): string => {
    return call.call.callType === CallType.VIDEO ? 'Video call' : 'Voice call';
  };

  return (
    <Modal
      open={true}
      closable={false}
      maskClosable={false}
      footer={null}
      centered
      width={400}
      className="incoming-call-modal"
      bodyStyle={{ padding: 0 }}
      style={{ borderRadius: '16px', overflow: 'hidden' }}
    >
      <div className="incoming-call-container">
        {/* Header with call type */}
        <div className="call-header">
          <Space>
            {getCallTypeIcon()}
            <Text className="call-type-text">{getCallTypeText()}</Text>
          </Space>
          <Badge 
            status="processing" 
            text={`${formatDuration(callDuration)}`}
            className="call-timer"
          />
        </div>

        {/* Caller information */}
        <div className="caller-info">
          <div className="caller-avatar-container">
            <Avatar
              size={120}
              src={call.caller.avatar}
              icon={<UserOutlined />}
              className="caller-avatar"
            />
            <div className="avatar-ring"></div>
          </div>
          
          <div className="caller-details">
            <Title level={3} className="caller-name">
              {call.caller.username}
            </Title>
            <Text className="caller-subtitle">
              Incoming {call.call.callType} call...
            </Text>
            {call.caller.email && (
              <Text type="secondary" className="caller-email">
                {call.caller.email}
              </Text>
            )}
          </div>
        </div>

        {/* Call actions */}
        <div className="call-actions">
          <Row gutter={24} justify="center">
            {/* Reject button */}
            <Col>
              <Button
                type="primary"
                danger
                shape="circle"
                size="large"
                icon={<CloseOutlined />}
                onClick={() => handleReject('user_rejected')}
                loading={isRejecting}
                disabled={isAccepting || isLoading || isProcessing}
                className="action-button reject-button"
              />
              <Text className="action-label">Decline</Text>
            </Col>

            {/* Accept button */}
            <Col>
              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={call.call.callType === CallType.VIDEO ? <VideoCameraOutlined /> : <PhoneOutlined />}
                onClick={handleAccept}
                loading={isAccepting}
                disabled={isRejecting || isLoading || isProcessing}
                className="action-button accept-button"
              />
              <Text className="action-label">Accept</Text>
            </Col>
          </Row>
        </div>

        {/* Additional call options */}
        <div className="call-options">
          <Space direction="vertical" size="small" className="options-list">
            {call.call.callType === CallType.VIDEO && (
              <Button
                type="text"
                size="small"
                icon={<PhoneOutlined />}
                onClick={() => {
                  // Accept as voice call instead of video
                  handleAccept();
                }}
                disabled={isAccepting || isRejecting || isLoading || isProcessing}
                className="option-button"
              >
                Answer as voice call
              </Button>
            )}
            
            <Button
              type="text"
              size="small"
              onClick={() => handleReject('user_busy')}
              disabled={isAccepting || isRejecting || isLoading}
              className="option-button"
            >
              I'm busy
            </Button>
          </Space>
        </div>

        {/* Loading overlay */}
        {(isAccepting || isRejecting || isLoading || isProcessing) && (
          <div className="loading-overlay">
            <Spin size="large" />
            <Text className="loading-text">
              {isAccepting ? 'Accepting call...' : isRejecting ? 'Declining call...' : 'Loading...'}
            </Text>
          </div>
        )}
      </div>
    </Modal>
  );
};