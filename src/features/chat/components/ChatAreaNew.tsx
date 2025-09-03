"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input, Button, Avatar, Empty, Spin, Typography } from "antd";
import {
  SearchOutlined,
  TeamOutlined,
  PhoneOutlined,
  PaperClipOutlined,
  SmileOutlined,
  SendOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useSocket } from "../hooks/useSocket";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setActiveConversationId } from "@/store/slices/chatSlice";
import { SocketMessage, SocketConversation } from "@/infrastructure/socket/socketService";
import styles from "./ChatAreaNew.module.css";

const { Text, Title } = Typography;

interface ChatAreaProps {
  conversation?: SocketConversation;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ conversation }) => {
  console.log('ChatAreaNew received conversation:', conversation);
  
  const dispatch = useDispatch();
  const { sendMessage, getMessages, startTyping, stopTyping, joinConversation, isConnected } = useSocket();
  const { 
    messages, 
    activeConversationId, 
    typingUsers, 
    onlineUsers, 
    isLoading 
  } = useSelector((state: RootState) => state.chat);
  const { user: currentUser } = useSelector((state: RootState) => state.user);

  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get messages for active conversation
  const conversationMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  // Set active conversation and load messages
  useEffect(() => {
    if (conversation && conversation._id !== activeConversationId) {
      console.log('Setting active conversation:', conversation._id);
      dispatch(setActiveConversationId(conversation._id));
      
      // Use async functions properly
      const initializeConversation = async () => {
        try {
          console.log('Joining conversation and loading messages for:', conversation._id);
          await joinConversation(conversation._id);
          await getMessages({ conversationId: conversation._id, limit: 50 });
        } catch (error) {
          console.error('Failed to initialize conversation:', error);
        }
      };

      initializeConversation();
    }
  }, [conversation, activeConversationId, dispatch, joinConversation, getMessages]);

  // Load messages when socket reconnects
  useEffect(() => {
    if (isConnected && activeConversationId && activeConversationId === conversation?._id) {
      // Rejoin conversation and reload messages when socket reconnects
      console.log('Socket reconnected, rejoining conversation:', activeConversationId);
      
      const reconnectConversation = async () => {
        try {
          await joinConversation(activeConversationId);
          await getMessages({ conversationId: activeConversationId, limit: 50 });
        } catch (error) {
          console.error('Failed to reconnect conversation:', error);
        }
      };

      reconnectConversation();
    }
  }, [isConnected, activeConversationId, conversation?._id, joinConversation, getMessages]);

  const getConversationName = () => {
    if (!conversation) return "";

    // Name should already be calculated and passed from parent
    if (conversation.name) {
      return conversation.name;
    }

    // Fallback logic
    if (conversation.type === 'group') {
      return `Nhóm ${conversation.participants?.length || 0} thành viên`;
    }

    return "Cuộc trò chuyện";
  };

  const getConversationAvatar = () => {
    const name = getConversationName();
    return name.charAt(0).toUpperCase();
  };

  const handleSend = async () => {
    if (!messageInput.trim() || sending || !conversation) return;

    setSending(true);
    try {
      sendMessage({
        conversationId: conversation._id,
        content: messageInput.trim(),
        type: 'text'
      });
      setMessageInput("");
      
      // Stop typing when message is sent
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping(conversation._id);
    } catch (error) {
      console.error("Send message failed:", error);
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    if (!conversation) return;

    // Handle typing indicators
    if (value.trim()) {
      startTyping(conversation._id);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(conversation._id);
      }, 3000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping(conversation._id);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageSenderName = (message: SocketMessage) => {
    if (message.sender && message.sender.firstName && message.sender.lastName) {
      return `${message.sender.firstName} ${message.sender.lastName}`.trim();
    }
    return message.sender?.email || 'Unknown User';
  };

  const isCurrentUserMessage = (message: SocketMessage) => {
    return message.sender?._id === currentUser?.id;
  };

  // Get typing users for current conversation (excluding current user)
  const currentTypingUsers = typingUsers.filter(
    user => user.conversationId === conversation?._id && user.userId !== currentUser?.id
  );

  if (!conversation) {
    return (
      <div className={styles.chatContainer}>
        <div className={styles.emptyState}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chọn một cuộc trò chuyện để bắt đầu nhắn tin"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      {/* Chat Header */}
      <div className={styles.chatHeader}>
        <div className={styles.participantInfo}>
          <Avatar size={40} className={styles.avatar}>
            {getConversationAvatar()}
          </Avatar>
          <div className={styles.participantDetails}>
            <Title level={5} className={styles.participantName}>
              {getConversationName()}
            </Title>
            {conversation.type === 'group' && (
              <Text type="secondary" className={styles.participantStatus}>
                {conversation.participants.length} thành viên
              </Text>
            )}
          </div>
        </div>
        
        <div className={styles.chatActions}>
          <Button
            type="text"
            icon={<SearchOutlined />}
            className={styles.actionButton}
          />
          <Button
            type="text"
            icon={<PhoneOutlined />}
            className={styles.actionButton}
          />
          <Button
            type="text"
            icon={<TeamOutlined />}
            className={styles.actionButton}
          />
        </div>
      </div>

      {/* Messages Area */}
      <div className={styles.messagesContainer}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Spin />
          </div>
        ) : conversationMessages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <Empty description="Chưa có tin nhắn nào" />
          </div>
        ) : (
          <div className={styles.messagesList}>
            {conversationMessages.map((message, index) => {
              const isCurrentUser = isCurrentUserMessage(message);
              const showAvatar = index === 0 || 
                conversationMessages[index - 1].sender?._id !== message.sender?._id;
              
              return (
                <div
                  key={message._id}
                  className={`${styles.messageWrapper} ${
                    isCurrentUser ? styles.currentUser : styles.otherUser
                  }`}
                >
                  {!isCurrentUser && showAvatar && (
                    <Avatar size="small" className={styles.messageAvatar}>
                      <UserOutlined />
                    </Avatar>
                  )}
                  
                  <div className={styles.messageContent}>
                    {!isCurrentUser && showAvatar && (
                      <Text className={styles.senderName}>
                        {getMessageSenderName(message)}
                      </Text>
                    )}
                    
                    <div className={styles.messageBubble}>
                      <div className={styles.messageText}>
                        {message.content}
                      </div>
                      <div className={styles.messageTime}>
                        {formatMessageTime(message.createdAt)}
                        {isCurrentUser && message.isRead && (
                          <CheckCircleOutlined className={styles.readIcon} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator */}
            {currentTypingUsers.length > 0 && (
              <div className={styles.typingIndicator}>
                <Avatar size="small" className={styles.messageAvatar}>
                  <UserOutlined />
                </Avatar>
                <div className={styles.typingBubble}>
                  <div className={styles.typingDots}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className={styles.messageInput}>
        <div className={styles.inputContainer}>
          <Button
            type="text"
            icon={<PaperClipOutlined />}
            className={styles.inputAction}
          />
          
          <Input.TextArea
            value={messageInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Nhập tin nhắn..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            className={styles.textInput}
            disabled={!isConnected}
          />
          
          <Button
            type="text"
            icon={<SmileOutlined />}
            className={styles.inputAction}
          />
          
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={sending}
            disabled={!messageInput.trim() || !isConnected}
            className={styles.sendButton}
          />
        </div>
        
        {!isConnected && (
          <div className={styles.connectionStatus}>
            <Text type="danger">Đã mất kết nối với máy chủ</Text>
          </div>
        )}
      </div>
    </div>
  );
};
