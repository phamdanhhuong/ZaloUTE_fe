"use client";

import React, { useEffect } from "react";
import { List, Avatar, Typography, Badge, Empty, Spin, Input } from "antd";
import { UserOutlined, TeamOutlined, SearchOutlined } from "@ant-design/icons";
import { useSocket } from "../hooks/useSocket";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setActiveConversationId } from "@/store/slices/chatSlice";
import { SocketConversation } from "@/infrastructure/socket/socketService";
import styles from "./ConversationListNew.module.css";

const { Text } = Typography;
const { Search } = Input;

interface ConversationListProps {
  onSelectConversation?: (conversation: SocketConversation) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ onSelectConversation }) => {
  const dispatch = useDispatch();
  const { isConnected, isLoading, conversations, activeConversationId, messages, onlineUsers } = useSelector(
    (state: RootState) => state.chat
  );
  const { user: currentUser } = useSelector((state: RootState) => state.user);

  const handleSelectConversation = (conversation: SocketConversation) => {
    dispatch(setActiveConversationId(conversation._id));
    onSelectConversation?.(conversation);
  };

  const getConversationName = (conversation: SocketConversation) => {
    if (conversation.name) {
      return conversation.name;
    }

    if (conversation.type === 'group') {
      return `Nhóm ${conversation.participants.length} thành viên`;
    }

    // For private conversations, we would need to get the other participant's info
    // This requires backend to populate participant data
    return "Cuộc trò chuyện";
  };

  const getConversationAvatar = (conversation: SocketConversation) => {
    const name = getConversationName(conversation);
    return name.charAt(0).toUpperCase();
  };

  const getLastMessage = (conversation: SocketConversation) => {
    const conversationMessages = messages[conversation._id];
    if (!conversationMessages || conversationMessages.length === 0) {
      return null;
    }
    
    return conversationMessages[conversationMessages.length - 1];
  };

  const getLastMessageText = (conversation: SocketConversation) => {
    const lastMessage = getLastMessage(conversation);
    if (!lastMessage) {
      return "Chưa có tin nhắn";
    }

    if (lastMessage.type === 'text') {
      return lastMessage.content;
    }

    switch (lastMessage.type) {
      case 'image':
        return "📷 Hình ảnh";
      case 'file':
        return "📎 Tệp đính kèm";
      default:
        return lastMessage.content;
    }
  };

  const getLastMessageTime = (conversation: SocketConversation) => {
    const lastMessage = getLastMessage(conversation);
    if (!lastMessage) {
      return "";
    }

    const date = new Date(lastMessage.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 48) {
      return "Hôm qua";
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit'
      });
    }
  };

  const getUnreadCount = (conversation: SocketConversation) => {
    const conversationMessages = messages[conversation._id];
    if (!conversationMessages) {
      return 0;
    }

    return conversationMessages.filter(
      message => !message.isRead && message.sender?._id !== currentUser?.id
    ).length;
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.some(user => user.userId === userId);
  };

  const formatLastMessageSender = (conversation: SocketConversation) => {
    const lastMessage = getLastMessage(conversation);
    if (!lastMessage) {
      return "";
    }

    const isCurrentUserMessage = lastMessage.sender?._id === currentUser?.id;
    if (isCurrentUserMessage) {
      return "Bạn: ";
    }

    if (conversation.type === 'group' && lastMessage.sender) {
      const senderName = lastMessage.sender.firstName || lastMessage.sender.email;
      return `${senderName}: `;
    }

    return "";
  };

  if (!isConnected) {
    return (
      <div className={styles.conversationList}>
        <div className={styles.header}>
          <Typography.Title level={4}>Tin nhắn</Typography.Title>
        </div>
        <div className={styles.connectionError}>
          <Text type="danger">Đã mất kết nối với máy chủ</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.conversationList}>
      {/* Header */}
      <div className={styles.header}>
        <Typography.Title level={4}>Tin nhắn</Typography.Title>
      </div>

      {/* Search */}
      <div className={styles.searchContainer}>
        <Search
          placeholder="Tìm kiếm cuộc trò chuyện..."
          prefix={<SearchOutlined />}
          className={styles.searchInput}
        />
      </div>

      {/* Conversations List */}
      <div className={styles.listContainer}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Spin />
          </div>
        ) : conversations.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có cuộc trò chuyện nào"
          />
        ) : (
          <List
            className={styles.list}
            dataSource={conversations}
            renderItem={(conversation) => {
              const isActive = activeConversationId === conversation._id;
              const unreadCount = getUnreadCount(conversation);
              
              return (
                <List.Item
                  className={`${styles.conversationItem} ${
                    isActive ? styles.activeItem : ""
                  }`}
                  onClick={() => handleSelectConversation(conversation)}
                >
                  <div className={styles.conversationContent}>
                    <div className={styles.avatarContainer}>
                      <Badge
                        dot={conversation.type === 'private' && isUserOnline(conversation._id)}
                        offset={[-8, 8]}
                      >
                        <Avatar size={48} className={styles.avatar}>
                          {conversation.type === 'group' ? (
                            <TeamOutlined />
                          ) : (
                            getConversationAvatar(conversation)
                          )}
                        </Avatar>
                      </Badge>
                    </div>

                    <div className={styles.conversationInfo}>
                      <div className={styles.conversationHeader}>
                        <Text strong className={styles.conversationName}>
                          {getConversationName(conversation)}
                        </Text>
                        <Text type="secondary" className={styles.messageTime}>
                          {getLastMessageTime(conversation)}
                        </Text>
                      </div>

                      <div className={styles.lastMessageContainer}>
                        <Text
                          type="secondary"
                          className={styles.lastMessage}
                          ellipsis
                        >
                          {formatLastMessageSender(conversation)}
                          {getLastMessageText(conversation)}
                        </Text>
                        
                        {unreadCount > 0 && (
                          <Badge
                            count={unreadCount}
                            size="small"
                            className={styles.unreadBadge}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </div>
    </div>
  );
};
