import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Button, 
  Space, 
  Typography, 
  Alert, 
  Steps, 
  List, 
  Card,
  Tooltip,
  Badge,
  Spin
} from 'antd';
import {
  VideoCameraOutlined,
  AudioOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { 
  mediaPermissionHandler, 
  MediaPermissionStatus, 
  MediaPermissionError 
} from '@/utils/mediaPermissionHandler';
import { MediaConstraints } from '@/types/call';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface MediaPermissionModalProps {
  open: boolean;
  onClose: () => void;
  onPermissionGranted: (stream: MediaStream) => void;
  onPermissionDenied: (error: MediaPermissionError) => void;
  constraints: MediaConstraints;
  title?: string;
  showDeviceTest?: boolean;
}

export const MediaPermissionModal: React.FC<MediaPermissionModalProps> = ({
  open,
  onClose,
  onPermissionGranted,
  onPermissionDenied,
  constraints,
  title = 'Camera & Microphone Access',
  showDeviceTest = true
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<MediaPermissionStatus | null>(null);
  const [error, setError] = useState<MediaPermissionError | null>(null);
  const [browserSupport, setBrowserSupport] = useState<any>(null);
  const [deviceTest, setDeviceTest] = useState<any>(null);

  // Check permissions and browser support on mount
  useEffect(() => {
    if (open) {
      checkInitialStatus();
    }
  }, [open]);

  const checkInitialStatus = async () => {
    setLoading(true);
    try {
      const support = mediaPermissionHandler.getBrowserSupport();
      const permissions = await mediaPermissionHandler.checkPermissionStatus();
      
      setBrowserSupport(support);
      setPermissionStatus(permissions);

      // Auto-advance if everything is already granted
      if (permissions.camera === 'granted' && permissions.microphone === 'granted') {
        setCurrentStep(2);
      } else if (!support.isSecureContext) {
        setError({
          type: 'not_supported',
          message: 'HTTPS Required',
          details: 'Media access requires HTTPS in production'
        });
      }
    } catch (err) {
      console.error('Failed to check initial status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermissions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await mediaPermissionHandler.requestMediaPermissions(constraints, {
        showPermissionModal: false,
        retryOnError: true,
        fallbackToAudioOnly: true
      });

      setPermissionStatus(result.permissions);

      if (result.stream) {
        setCurrentStep(2);
        onPermissionGranted(result.stream);
      } else if (result.error) {
        setError(result.error);
        setCurrentStep(1);
        onPermissionDenied(result.error);
      }
    } catch (err) {
      console.error('Permission request failed:', err);
      setError({
        type: 'unknown',
        message: 'Failed to request permissions',
        details: 'An unexpected error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestDevices = async () => {
    setLoading(true);
    try {
      const testResults = await mediaPermissionHandler.testDevices();
      setDeviceTest(testResults);
      setCurrentStep(3);
    } catch (err) {
      console.error('Device test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setCurrentStep(0);
    checkInitialStatus();
  };

  const getStepStatus = (step: number) => {
    if (currentStep > step) return 'finish';
    if (currentStep === step) return 'process';
    return 'wait';
  };

  const renderBrowserSupport = () => (
    <Card title="Browser Support Check" size="small">
      <List size="small">
        <List.Item>
          <List.Item.Meta
            avatar={
              <Badge 
                status={browserSupport?.getUserMedia ? 'success' : 'error'} 
                dot 
              />
            }
            title="getUserMedia API"
            description={browserSupport?.getUserMedia ? 'Supported' : 'Not supported'}
          />
        </List.Item>
        <List.Item>
          <List.Item.Meta
            avatar={
              <Badge 
                status={browserSupport?.webRTC ? 'success' : 'error'} 
                dot 
              />
            }
            title="WebRTC"
            description={browserSupport?.webRTC ? 'Supported' : 'Not supported'}
          />
        </List.Item>
        <List.Item>
          <List.Item.Meta
            avatar={
              <Badge 
                status={browserSupport?.isSecureContext ? 'success' : 'warning'} 
                dot 
              />
            }
            title="Secure Context (HTTPS)"
            description={browserSupport?.isSecureContext ? 'Secure' : 'Not secure'}
          />
        </List.Item>
      </List>
    </Card>
  );

  const renderPermissionStatus = () => (
    <Card title="Permission Status" size="small">
      <List size="small">
        <List.Item>
          <List.Item.Meta
            avatar={<VideoCameraOutlined />}
            title="Camera"
            description={
              <Badge 
                status={
                  permissionStatus?.camera === 'granted' ? 'success' :
                  permissionStatus?.camera === 'denied' ? 'error' : 'processing'
                }
                text={permissionStatus?.camera || 'Unknown'}
              />
            }
          />
        </List.Item>
        <List.Item>
          <List.Item.Meta
            avatar={<AudioOutlined />}
            title="Microphone"
            description={
              <Badge 
                status={
                  permissionStatus?.microphone === 'granted' ? 'success' :
                  permissionStatus?.microphone === 'denied' ? 'error' : 'processing'
                }
                text={permissionStatus?.microphone || 'Unknown'}
              />
            }
          />
        </List.Item>
      </List>
    </Card>
  );

  const renderDeviceTest = () => (
    <Card title="Device Test Results" size="small">
      <List size="small">
        <List.Item>
          <List.Item.Meta
            avatar={
              deviceTest?.camera ? 
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
              <CloseCircleOutlined style={{ color: '#f5222d' }} />
            }
            title="Camera"
            description={deviceTest?.camera ? 'Working' : 'Not working'}
          />
        </List.Item>
        <List.Item>
          <List.Item.Meta
            avatar={
              deviceTest?.microphone ? 
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
              <CloseCircleOutlined style={{ color: '#f5222d' }} />
            }
            title="Microphone"
            description={deviceTest?.microphone ? 'Working' : 'Not working'}
          />
        </List.Item>
        <List.Item>
          <List.Item.Meta
            avatar={
              deviceTest?.speaker ? 
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
              <CloseCircleOutlined style={{ color: '#f5222d' }} />
            }
            title="Speaker"
            description={deviceTest?.speaker ? 'Working' : 'Not working'}
          />
        </List.Item>
      </List>
    </Card>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Paragraph>
              To make voice and video calls, we need access to your camera and microphone.
              Your privacy is important - we only access these when you're in a call.
            </Paragraph>
            
            {browserSupport && renderBrowserSupport()}
            
            {error && (
              <Alert
                type="error"
                message={error.message}
                description={error.details}
                showIcon
                action={
                  <Button size="small" type="text" onClick={handleRetry}>
                    <ReloadOutlined /> Retry
                  </Button>
                }
              />
            )}
          </Space>
        );

      case 1:
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Paragraph>
              Click "Allow Access" when your browser asks for camera and microphone permissions.
            </Paragraph>
            
            {permissionStatus && renderPermissionStatus()}
            
            {error && (
              <Alert
                type="error"
                message={error.message}
                description={
                  <div>
                    <p>{error.details}</p>
                    <p>
                      <strong>Troubleshooting:</strong>
                      <br />• Check if camera/microphone are connected
                      <br />• Try refreshing the page
                      <br />• Check browser settings for site permissions
                    </p>
                  </div>
                }
                showIcon
              />
            )}
          </Space>
        );

      case 2:
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              type="success"
              message="Permissions Granted!"
              description="Your camera and microphone are now accessible for calls."
              showIcon
            />
            
            {permissionStatus && renderPermissionStatus()}
          </Space>
        );

      case 3:
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Paragraph>
              Device test completed. Check the results below:
            </Paragraph>
            
            {deviceTest && renderDeviceTest()}
          </Space>
        );

      default:
        return null;
    }
  };

  const renderFooter = () => {
    const buttons = [];

    switch (currentStep) {
      case 0:
        buttons.push(
          <Button key="cancel" onClick={onClose}>
            Cancel
          </Button>,
          <Button 
            key="request" 
            type="primary" 
            onClick={handleRequestPermissions}
            loading={loading}
            disabled={error?.type === 'not_supported'}
          >
            Request Permissions
          </Button>
        );
        break;

      case 1:
        buttons.push(
          <Button key="cancel" onClick={onClose}>
            Cancel
          </Button>,
          <Button 
            key="retry" 
            onClick={handleRequestPermissions}
            loading={loading}
          >
            <ReloadOutlined /> Try Again
          </Button>
        );
        break;

      case 2:
        buttons.push(
          <Button key="close" onClick={onClose}>
            Close
          </Button>
        );
        
        if (showDeviceTest) {
          buttons.push(
            <Button 
              key="test" 
              type="primary" 
              onClick={handleTestDevices}
              loading={loading}
            >
              Test Devices
            </Button>
          );
        }
        break;

      case 3:
        buttons.push(
          <Button key="done" type="primary" onClick={onClose}>
            Done
          </Button>
        );
        break;
    }

    return buttons;
  };

  return (
    <Modal
      title={
        <Space>
          <VideoCameraOutlined />
          {title}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={renderFooter()}
      width={600}
      centered
      maskClosable={false}
    >
      <Spin spinning={loading}>
        <Steps current={currentStep} size="small" style={{ marginBottom: 24 }}>
          <Step 
            title="Check Support" 
            status={getStepStatus(0)}
            icon={<SettingOutlined />}
          />
          <Step 
            title="Request Access" 
            status={getStepStatus(1)}
            icon={<ExclamationCircleOutlined />}
          />
          <Step 
            title="Permissions Ready" 
            status={getStepStatus(2)}
            icon={<CheckCircleOutlined />}
          />
          {showDeviceTest && (
            <Step 
              title="Test Devices" 
              status={getStepStatus(3)}
              icon={<DesktopOutlined />}
            />
          )}
        </Steps>

        {renderStepContent()}
      </Spin>
    </Modal>
  );
};