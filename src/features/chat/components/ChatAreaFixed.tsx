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
import { useMessages, useMessageReactions } from "../hooks";
import type { Conversation, Message } from "../service";
import styles from "./ChatArea.module.css";

const { Text, Title } = Typography;

// Import User type from friend service
interface User {
  id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
}

interface ChatAreaProps {
  conversation?: Conversation;
  currentUser?: User;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  currentUser,
}) => {
  const { loading, messages, handleSendMessage } = useMessages(
    conversation?.id
  );
  const { handleAddReaction } = useMessageReactions();
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getConversationName = () => {
    if (!conversation) return "";

    if (conversation.name) {
      return conversation.name;
    }

    if (conversation.isGroup) {
      return `Nhóm ${conversation.participants.length} thành viên`;
    }

    const otherParticipant = conversation.participants.find(
      (p) => p.user.id !== currentUser?.id
    );

    if (otherParticipant) {
      const user = otherParticipant.user;
      return `${user.firstname} ${user.lastname}`.trim() || user.username;
    }

    return "Cuộc trò chuyện";
  };

  const getConversationAvatar = () => {
    const name = getConversationName();
    return name.charAt(0).toUpperCase();
  };

  const handleSend = async () => {
    if (!messageInput.trim() || sending) return;

    setSending(true);
    try {
      await handleSendMessage(messageInput.trim());
      setMessageInput("");
    } catch (error) {
      console.error("Send message failed:", error);
    } finally {
      setSending(false);
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

  const getSenderName = (message: Message) => {
    if (message.sender.id === currentUser?.id) {
      return "Bạn";
    }
    return `${message.sender.firstname} ${message.sender.lastname}`.trim() || message.sender.username;
  };

  const getSenderAvatar = (message: Message) => {
    const name = getSenderName(message);
    return name.charAt(0).toUpperCase();
  };

  const handleReactionClick = async (messageId: string, emoji: string) => {
    try {
      await handleAddReaction(messageId, emoji);
    } catch (error) {
      console.error("Add reaction failed:", error);
    }
  };

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
            {conversation.isGroup && (
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
        {loading ? (
          <div className={styles.loadingContainer}>
            <Spin />
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <Empty description="Chưa có tin nhắn nào" />
          </div>
        ) : (
          <div className={styles.messagesList}>
            {messages.map((message, index) => {
              const isCurrentUser = message.sender.id === currentUser?.id;
              const showAvatar = index === 0 || 
                messages[index - 1].sender.id !== message.sender.id;
              
              return (
                <div
                  key={message.id}
                  className={`${styles.messageWrapper} ${
                    isCurrentUser ? styles.currentUser : styles.otherUser
                  }`}
                >
                  {!isCurrentUser && showAvatar && (
                    <Avatar size="small" className={styles.messageAvatar}>
                      {getSenderAvatar(message)}
                    </Avatar>
                  )}
                  
                  <div className={styles.messageContent}>
                    {!isCurrentUser && showAvatar && (
                      <Text className={styles.senderName}>
                        {getSenderName(message)}
                      </Text>
                    )}
                    
                    <div className={styles.messageBubble}>
                      <div className={styles.messageText}>
                        {message.content}
                      </div>
                      <div className={styles.messageTime}>
                        {formatMessageTime(message.createdAt)}
                        {isCurrentUser && (
                          <CheckCircleOutlined className={styles.readIcon} />
                        )}
                      </div>
                    </div>
                    
                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className={styles.reactions}>
                        {message.reactions.map((reaction) => (
                          <div key={reaction.id} className={styles.reaction}>
                            <span>{reaction.emoji}</span>
                            <span className={styles.reactionCount}>1</span>
                          </div>
                        ))}
                        
                        {/* Add reaction button */}
                        <div
                          className={styles.reaction}
                          onClick={() => handleReactionClick(message.id, "👍")}
                        >
                          <span>👍</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
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
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập tin nhắn..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            className={styles.textInput}
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
            disabled={!messageInput.trim()}
            className={styles.sendButton}
          />
        </div>
      </div>
    </div>
  );
};
