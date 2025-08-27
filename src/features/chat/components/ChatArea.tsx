"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input, Button, Avatar, Empty, Spin } from "antd";
import { 
  SearchOutlined, 
  TeamOutlined, 
  PhoneOutlined, 
  PaperClipOutlined,
  SmileOutlined,
  SendOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import { useMessages, useMessageReactions } from "../hooks";
import type { Conversation, Message } from "../service";
import styles from "./ChatArea.module.css";

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

export const ChatArea: React.FC<ChatAreaProps> = ({ conversation, currentUser }) => {
  const { loading, messages, handleSendMessage } = useMessages(conversation?.id);
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
      p => p.user.id !== currentUser?.id
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

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSenderName = (message: Message) => {
    if (message.sender.id === currentUser?.id) {
      return "Bạn";
    }
    return message.sender.firstname || message.sender.username;
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
      <div className={styles.emptyState}>
        <Empty 
          description="Chọn một cuộc trò chuyện để bắt đầu nhắn tin"
          style={{ color: "#6b7280", fontSize: 16 }}
        />
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      {/* Chat Header */}
      <div className={styles.chatHeader}>
        <div className={styles.headerContent}>
          <div className={styles.userInfo}>
            <Avatar size={40} style={{ backgroundColor: "#0084ff" }}>
              {getConversationAvatar()}
            </Avatar>
            <div className={styles.userDetails}>
              <h2 className={styles.userName}>
                {getConversationName()}
                <CheckCircleOutlined style={{ color: "#0084ff" }} />
              </h2>
              <div className={styles.userStatus}>
                {conversation.isGroup && (
                  <>
                    <TeamOutlined style={{ width: 12, height: 12 }} />
                    <span>{conversation.participants.length} thành viên</span>
                    <span>•</span>
                  </>
                )}
                <div className={styles.statusDot} />
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <Button 
              type="text" 
              size="small" 
              icon={<TeamOutlined />}
              className={styles.actionButton}
            />
            <Button 
              type="text" 
              size="small" 
              icon={<PhoneOutlined />}
              className={styles.actionButton}
            />
            <Button 
              type="text" 
              size="small" 
              icon={<SearchOutlined />}
              className={styles.actionButton}
            />
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className={styles.messagesArea}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Spin tip="Đang tải tin nhắn..." />
          </div>
        ) : messages.length > 0 ? (
          <div className={styles.messagesContainer}>
            {messages.map((message) => (
              <div key={message.id} className={styles.messageGroup}>
                <Avatar size={32} style={{ backgroundColor: "#0084ff" }}>
                  {getSenderAvatar(message)}
                </Avatar>

                <div className={styles.messageContent}>
                  <div className={styles.messageHeader}>
                    <span className={styles.senderName}>
                      {getSenderName(message)}
                    </span>
                    <span className={styles.messageTime}>
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>

                  <div className={`${styles.messageBubble} ${message.sender.id === currentUser?.id ? styles.highlighted : ''}`}>
                    {message.messageType === "text" ? (
                      <p className={styles.messageText}>
                        {message.content}
                      </p>
                    ) : (
                      <div className={styles.messageTypeInfo}>
                        {message.messageType === "image" && "📷 Hình ảnh"}
                        {message.messageType === "file" && "📄 Tệp đính kèm"}
                        {message.messageType === "sticker" && "📄 Sticker"}
                      </div>
                    )}
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
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <Empty description="Chưa có tin nhắn nào" />
        )}
      </div>

      {/* Chat Input */}
      <div className={styles.chatInput}>
        <div className={styles.inputContainer}>
          {/* Input Tools */}
          <div className={styles.inputTools}>
            <Button 
              type="text" 
              size="small" 
              icon={<PaperClipOutlined />}
              className={styles.actionButton}
            />
            <Button 
              type="text" 
              size="small" 
              icon={<SmileOutlined />}
              className={styles.actionButton}
            />
          </div>

          {/* Input Field */}
          <div className={styles.inputField}>
            <Input.TextArea
              placeholder={`Nhập @, tin nhắn tới ${getConversationName()}`}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              autoSize={{ minRows: 1, maxRows: 4 }}
              className={styles.textArea}
            />
            <Button
              type="text"
              size="small"
              icon={messageInput.trim() ? <SendOutlined /> : <SmileOutlined />}
              onClick={messageInput.trim() ? handleSend : undefined}
              loading={sending}
              className={`${styles.sendButton} ${messageInput.trim() ? styles.active : styles.inactive}`}
            />
          </div>
        </div>

        {/* Input Note */}
        <div className={styles.inputNote}>
          <span>Nhấn Enter để gửi</span>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
