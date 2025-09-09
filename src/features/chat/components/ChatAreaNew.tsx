"use client";

import React, { useState, useRef, useEffect } from "react";
// Reaction types and icons (Messenger style)
const REACTION_TYPES = [
  { type: "like", icon: "👍" },
  { type: "love", icon: "❤️" },
  { type: "haha", icon: "😂" },
  { type: "wow", icon: "😮" },
  { type: "sad", icon: "😢" },
  { type: "angry", icon: "😡" },
];

import { Input, Button, Avatar, Empty, Spin, Typography, Popover, Tabs } from "antd";
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
import { UserAvatar } from "@/components/UserAvatar";
import { useSocket } from "../hooks/useSocket";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setActiveConversationId } from "@/store/slices/chatSlice";
import {
  SocketMessage,
  SocketConversation,
} from "@/infrastructure/socket/socketService";
import styles from "./ChatAreaNew.module.css";

const { Text, Title } = Typography;

interface ChatAreaProps {
  conversation?: SocketConversation;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ conversation }) => {
  console.log("ChatAreaNew received conversation:", conversation);

  const dispatch = useDispatch();
  const {
    sendMessage,
    getMessages,
    startTyping,
    stopTyping,
    joinConversation,
    isConnected,
    sendReaction,
  } = useSocket();
  const {
    messages,
    activeConversationId,
    typingUsers,
    onlineUsers,
    isLoading,
  } = useSelector((state: RootState) => state.chat);
  const { user: currentUser } = useSelector((state: RootState) => state.user);

  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionPopup, setShowReactionPopup] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get messages for active conversation
  const conversationMessages = activeConversationId
    ? messages[activeConversationId] || []
    : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  // Set active conversation and load messages
  useEffect(() => {
    if (conversation && conversation._id !== activeConversationId) {
      console.log("Setting active conversation:", conversation._id);
      dispatch(setActiveConversationId(conversation._id));

      // Use async functions properly
      const initializeConversation = async () => {
        try {
          console.log(
            "Joining conversation and loading messages for:",
            conversation._id
          );
          await joinConversation(conversation._id);
          await getMessages({ conversationId: conversation._id, limit: 50 });
        } catch (error) {
          console.error("Failed to initialize conversation:", error);
        }
      };

      initializeConversation();
    }
  }, [
    conversation,
    activeConversationId,
    dispatch,
    joinConversation,
    getMessages,
  ]);

  // Load messages when socket reconnects
  useEffect(() => {
    if (
      isConnected &&
      activeConversationId &&
      activeConversationId === conversation?._id
    ) {
      // Rejoin conversation and reload messages when socket reconnects
      console.log(
        "Socket reconnected, rejoining conversation:",
        activeConversationId
      );

      const reconnectConversation = async () => {
        try {
          await joinConversation(activeConversationId);
          await getMessages({
            conversationId: activeConversationId,
            limit: 50,
          });
        } catch (error) {
          console.error("Failed to reconnect conversation:", error);
        }
      };

      reconnectConversation();
    }
  }, [
    isConnected,
    activeConversationId,
    conversation?._id,
    joinConversation,
    getMessages,
  ]);

  const getConversationName = () => {
    if (!conversation) return "";

    // Name should already be calculated and passed from parent
    if (conversation.name) {
      return conversation.name;
    }

    // Fallback logic
    if (conversation.type === "group") {
      return `Nhóm ${conversation.participants?.length || 0} thành viên`;
    }

    return "Cuộc trò chuyện";
  };

  const getConversationAvatar = () => {
    const name = getConversationName();
    return (
      <Avatar size={40} className={styles.avatar}>
        {name.charAt(0).toUpperCase()}
      </Avatar>
    );
  };


  // Unified message sending handler for text, emoji, sticker
  const handleSendMessage = async (content: string, type: "text" | "emoji" | "sticker" = "text") => {
    if (!content.trim() || sending || !conversation) return;

    console.log("Sending message:", content, "to conversation:", conversation._id, "isConnected:", isConnected);
    
    setSending(true);
    try {
      await sendMessage({
        conversationId: conversation._id,
        content: content.trim(),
        type,
      });
      console.log("Message sent successfully");
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

  // Old handleSend now just calls handleSendMessage for text
  const handleSend = () => {
    handleSendMessage(messageInput, "text");
  };

  // Dummy sticker list
  const stickers = [
    { id: "sticker1", url: "/public/file.svg" },
    { id: "sticker2", url: "/public/globe.svg" },
  ];

  // Dummy emoji list

  // Reaction popup state (messageId) and timer for auto-hide
  const reactionPopupTimer = useRef<NodeJS.Timeout | null>(null);
  const emojis = ["😀", "😂", "😍", "👍", "🎉", "😢", "😡", "❤️"];
  // Chọn emoji thì chèn vào input, chọn sticker thì gửi luôn message type 'sticker'
  // handleSendReaction now only inserts emoji or calls handleSendMessage for sticker
  const handleSendReaction = (reaction: { type: "emoji" | "sticker"; value: string }) => {
    if (!conversation || !currentUser) return;
    if (reaction.type === "emoji") {
      setMessageInput((prev) => prev + reaction.value);
      setShowEmojiPicker(false);
      return;
    }
    if (reaction.type === "sticker") {
      handleSendMessage(reaction.value, "sticker");
      setShowEmojiPicker(false);
      return;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    if (!conversation) return;

    console.log("Input change, isConnected:", isConnected, "conversation:", conversation._id);

    // Handle typing indicators
    if (value.trim()) {
      console.log("Starting typing for conversation:", conversation._id);
      startTyping(conversation._id);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        console.log("Stopping typing for conversation:", conversation._id);
        stopTyping(conversation._id);
      }, 3000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      console.log("Stopping typing (empty input) for conversation:", conversation._id);
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
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMessageSenderName = (message: SocketMessage) => {
    if (message.sender && message.sender.firstName && message.sender.lastName) {
      return `${message.sender.firstName} ${message.sender.lastName}`.trim();
    }
    return message.sender?.email || "Unknown User";
  };

  const isCurrentUserMessage = (message: SocketMessage) => {
    return message.sender?._id === currentUser?.id;
  };

  const getMessageSenderAvatar = (message: SocketMessage) => {
    if (!message.sender) {
      return (
        <Avatar size="small" className={styles.messageAvatar}>
          <UserOutlined />
        </Avatar>
      );
    }

    return (
      <UserAvatar
        user={{
          id: message.sender._id,
          username: message.sender.username || "",
          firstname: message.sender.firstName,
          lastname: message.sender.lastName,
          avatarUrl: message.sender.avatarUrl,
        }}
        size="small"
        className={styles.messageAvatar}
      />
    );
  };

  // Get typing users for current conversation (excluding current user)
  const currentTypingUsers = typingUsers.filter(
    (user) =>
      user.conversationId === conversation?._id &&
      user.userId !== currentUser?.id
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
          {getConversationAvatar()}
          <div className={styles.participantDetails}>
            <Title level={5} className={styles.participantName}>
              {getConversationName()}
            </Title>
            {conversation.type === "group" && (
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
              const showAvatar =
                index === 0 ||
                conversationMessages[index - 1].sender?._id !== message.sender?._id;

              // Handler: send reaction
              const handleReact = (reactionType: string) => {
                if (!currentUser) return;
                sendReaction({
                  messageId: message._id,
                  userId: currentUser.id,
                  type: reactionType,
                  conversationId: message.conversation,
                  value: reactionType,
                });
                setShowReactionPopup(null);
              };

              // Reaction placeholder hover handlers
              const handlePlaceholderEnter = () => {
                if (reactionPopupTimer.current) clearTimeout(reactionPopupTimer.current);
                setShowReactionPopup(message._id);
              };
              const handlePlaceholderLeave = () => {
                // Auto-hide popup sau 2.5s nếu không hover lại
                reactionPopupTimer.current = setTimeout(() => {
                  setShowReactionPopup((cur) => (cur === message._id ? null : cur));
                }, 1500);
              };
              const handlePopupEnter = () => {
                if (reactionPopupTimer.current) clearTimeout(reactionPopupTimer.current);
                setShowReactionPopup(message._id);
              };
              const handlePopupLeave = () => {
                reactionPopupTimer.current = setTimeout(() => {
                  setShowReactionPopup((cur) => (cur === message._id ? null : cur));
                }, 1500);
              };

              return (
                <div
                  key={message._id}
                  className={`${styles.messageWrapper} ${isCurrentUser ? styles.currentUser : styles.otherUser}`}
                >
                  {!isCurrentUser && showAvatar && getMessageSenderAvatar(message)}
                  <div className={styles.messageContent}>
                    {!isCurrentUser && showAvatar && (
                      <Text className={styles.senderName}>{getMessageSenderName(message)}</Text>
                    )}
                    <div className={styles.messageBubble}>
                      <div className={styles.messageText}>{message.content}</div>
                      <div className={styles.messageTime}>
                        {formatMessageTime(message.createdAt)}
                        {isCurrentUser && message.isRead && (
                          <CheckCircleOutlined className={styles.readIcon} />
                        )}
                      </div>
                      {/* Reaction display + placeholder icon */}
                      <div style={{ position: 'relative', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {/* Hiển thị reaction đã thả (nếu có) */}
                        {message.reactions &&
                          typeof message.reactions === 'object' &&
                          Object.values(message.reactions).some((r: any) => r && r.count > 0) && (
                            <div className={styles.reactionSummary} style={{ display: 'flex', gap: 2, alignItems: 'center', background: '#f5f5f5', borderRadius: 16, padding: '0 6px', fontSize: 15, border: '1px solid #eee' }}>
                              {REACTION_TYPES.filter(rt => message.reactions && message.reactions[rt.type]?.count > 0).map(rt => (
                                <span key={rt.type} style={{ marginRight: 2 }}>{rt.icon}</span>
                              ))}
                              <span style={{ fontSize: 13, color: '#888', marginLeft: 2 }}>
                                {Object.values(message.reactions).reduce((sum: number, r: any) => sum + ((r && r.count) || 0), 0)}
                              </span>
                            </div>
                        )}
                        {/* Reaction placeholder icon */}
                        <div
                          className={styles.reactionPlaceholder}
                          onMouseEnter={handlePlaceholderEnter}
                          onMouseLeave={handlePlaceholderLeave}
                          style={{ display: 'inline-block', position: 'relative' }}
                        >
                          <span
                            style={{
                              border: '1px solid #ccc',
                              borderRadius: '50%',
                              padding: 2,
                              color: '#bbb',
                              background: '#fff',
                              fontSize: 18,
                              cursor: 'pointer',
                              transition: 'border 0.2s',
                            }}
                          >
                            👍
                          </span>
                          {/* Reaction popup */}
                          {showReactionPopup === message._id && (
                            <div
                              className={styles.reactionPopup}
                              style={{
                                position: 'absolute',
                                zIndex: 1000,
                                background: '#fff',
                                border: '1px solid #eee',
                                borderRadius: 24,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                padding: '4px 8px',
                                display: 'flex',
                                gap: 6,
                                bottom: 32,
                                left: '50%',
                                transform: 'translateX(-50%)',
                              }}
                              onMouseEnter={handlePopupEnter}
                              onMouseLeave={handlePopupLeave}
                            >
                              {REACTION_TYPES.map((r) => (
                                <span
                                  key={r.type}
                                  style={{ fontSize: 22, cursor: 'pointer', transition: 'transform 0.1s' }}
                                  onClick={() => handleReact(r.type)}
                                >
                                  {r.icon}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
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

          <Popover
            content={
              <Tabs
                defaultActiveKey="emoji"
                items={[{
                  key: "emoji",
                  label: "Emoji",
                  children: (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 220 }}>
                      {emojis.map((emoji) => (
                        <span
                          key={emoji}
                          style={{ fontSize: 24, cursor: "pointer" }}
                          onClick={() => handleSendReaction({ type: "emoji", value: emoji })}
                        >
                          {emoji}
                        </span>
                      ))}
                    </div>
                  ),
                }, {
                  key: "sticker",
                  label: "Sticker",
                  children: (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 220 }}>
                      {stickers.map((sticker) => (
                        <img
                          key={sticker.id}
                          src={sticker.url}
                          alt={sticker.id}
                          style={{ width: 40, height: 40, cursor: "pointer" }}
                          onClick={() => handleSendReaction({ type: "sticker", value: sticker.id })}
                        />
                      ))}
                    </div>
                  ),
                }]}
              />
            }
            trigger="click"
            open={showEmojiPicker}
            onOpenChange={setShowEmojiPicker}
            placement="topRight"
          >
            <Button
              type="text"
              icon={<SmileOutlined />}
              className={styles.inputAction}
            />
          </Popover>

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
