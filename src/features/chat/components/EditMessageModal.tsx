import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface EditMessageModalProps {
  visible: boolean;
  messageId: string;
  currentContent: string;
  onCancel: () => void;
  onSave: (messageId: string, newContent: string) => Promise<void>;
}

export const EditMessageModal: React.FC<EditMessageModalProps> = ({
  visible,
  messageId,
  currentContent,
  onCancel,
  onSave,
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setContent(currentContent);
    }
  }, [visible, currentContent]);

  const handleSave = async () => {
    if (!content.trim()) {
      message.error('Nội dung tin nhắn không được để trống');
      return;
    }

    if (content.trim() === currentContent.trim()) {
      message.info('Nội dung tin nhắn không thay đổi');
      onCancel();
      return;
    }

    setLoading(true);
    try {
      await onSave(messageId, content.trim());
      message.success('Sửa tin nhắn thành công');
      onCancel();
    } catch (error) {
      console.error('Edit message error:', error);
      message.error('Sửa tin nhắn thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setContent(currentContent);
    onCancel();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EditOutlined />
          Sửa tin nhắn
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Hủy
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={loading}
          onClick={handleSave}
        >
          Lưu
        </Button>,
      ]}
      width={500}
    >
      <TextArea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Nhập nội dung tin nhắn..."
        autoSize={{ minRows: 3, maxRows: 6 }}
        maxLength={1000}
        showCount
      />
    </Modal>
  );
};

