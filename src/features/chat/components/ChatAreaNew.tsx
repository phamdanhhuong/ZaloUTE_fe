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

import {
  Input,
  Button,
  Avatar,
  Empty,
  Spin,
  Typography,
  Popover,
  Tabs,
  Space,
  Dropdown,
  Progress,
} from "antd";
import {
  SearchOutlined,
  TeamOutlined,
  PhoneOutlined,
  PaperClipOutlined,
  SmileOutlined,
  SendOutlined,
  CheckCircleOutlined,
  UserOutlined,
  SettingOutlined,
  MoreOutlined,
  CrownOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { UserAvatar } from "@/components/UserAvatar";
import { useSocket } from "../hooks/useSocket";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { message as antdMessage } from "antd";
import { EditMessageModal } from "./EditMessageModal";
import { setActiveConversationId } from "@/store/slices/chatSlice";
import {
  SocketMessage,
  SocketConversation,
} from "@/infrastructure/socket/socketService";
import { GroupSettingsModal } from "./GroupSettingsModal";
import type { Conversation } from "../service";
import uploadService from "@/infrastructure/http/uploadService";
import styles from "./ChatAreaNew.module.css";

const { Text, Title } = Typography;

interface ChatAreaProps {
  conversation?: SocketConversation;
  onConversationUpdate?: (conversation: Conversation) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  onConversationUpdate,
}) => {
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
    markAsRead,
    editMessage,
    deleteMessage,
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
  const [showReactionPopup, setShowReactionPopup] = useState<string | null>(
    null
  );
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewFiles, setPreviewFiles] = useState<
    {
      file: File;
      type: "image" | "video" | "file";
      preview?: string;
      uploadProgress?: number;
    }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get messages for active conversation and ensure correct order
  const conversationMessages = React.useMemo(() => {
    if (!activeConversationId || !messages[activeConversationId]) {
      return [];
    }

    return [...messages[activeConversationId]].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
  }, [activeConversationId, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Scroll to bottom when messages change, with a small delay to ensure DOM update
    setTimeout(() => {
      scrollToBottom();
    }, 100);
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

          // Mark messages as read when user joins conversation
          await markAsRead(conversation._id);

          // Force scroll to bottom after loading messages
          setTimeout(() => {
            scrollToBottom();
          }, 300);
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

  // Auto mark messages as read when new messages arrive while user is in conversation
  useEffect(() => {
    if (activeConversationId && conversationMessages.length > 0) {
      // Check if there are any unread messages from other users
      const hasUnreadMessages = conversationMessages.some(
        msg => msg.sender._id !== currentUser?.id && !msg.isRead
      );
      
      if (hasUnreadMessages) {
        // Auto mark as read since user is currently viewing the conversation
        markAsRead(activeConversationId);
      }
    }
  }, [conversationMessages, activeConversationId, currentUser?.id, markAsRead]);

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

          // Force scroll to bottom after reconnecting
          setTimeout(() => {
            scrollToBottom();
          }, 300);
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

  // Cleanup object URLs on component unmount
  useEffect(() => {
    return () => {
      previewFiles.forEach((fileData) => {
        if (fileData.preview) {
          URL.revokeObjectURL(fileData.preview);
        }
      });
    };
  }, []);

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

  const isGroupAdmin =
    conversation?.type === "group" &&
    conversation.groupAdmin === currentUser?.id;
  const isGroupMember =
    conversation?.type === "group" &&
    conversation.participants?.includes(currentUser?.id || "");

  const getGroupActions = () => {
    if (conversation?.type !== "group" || !isGroupMember) return null;

    return {
      items: [
        {
          key: "settings",
          icon: <SettingOutlined />,
          label: "Cài đặt nhóm",
          onClick: () => setShowGroupSettings(true),
        },
      ],
    };
  };

  const getConversationAvatar = () => {
    if (!conversation) return null;

    // Nếu là group chat, hiển thị avatar group
    if (conversation.type === "group") {
      return (
        <div style={{ position: "relative" }}>
          <Avatar
            size={40}
            className={styles.avatar}
            src={conversation.avatar}
            style={{ backgroundColor: "#1890ff" }}
          >
            {!conversation.avatar && <TeamOutlined />}
          </Avatar>
          {conversation.groupAdmin === currentUser?.id && (
            <CrownOutlined
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                color: "#faad14",
                fontSize: 10,
                background: "white",
                borderRadius: "50%",
                padding: 1,
              }}
            />
          )}
        </div>
      );
    }

    // Nếu là chat 1-1, hiển thị avatar fallback
    const name = getConversationName();
    return (
      <Avatar size={40} className={styles.avatar}>
        {name.charAt(0).toUpperCase()}
      </Avatar>
    );
  };

  // Unified message sending handler for text, emoji, sticker, files
  const handleSendMessage = async (
    content: string,
    type: "text" | "image" | "video" | "emoji" | "sticker" | "file" = "text",
    file?: File,
    fileIndex?: number
  ) => {
    if ((!content.trim() && !file) || sending || !conversation) return;

    console.log(
      "Sending message:",
      content,
      "type:",
      type,
      "file:",
      file?.name,
      "to conversation:",
      conversation._id,
      "isConnected:",
      isConnected
    );

    setSending(true);
    setUploading(!!file);

    try {
      let messageContent = content;
      let fileUrl = "";

      // If sending a file, upload it first
      if (file) {
        console.log("Uploading file:", file.name);

        // Update progress for this specific file
        if (fileIndex !== undefined) {
          setPreviewFiles((prev) =>
            prev.map((item, index) =>
              index === fileIndex ? { ...item, uploadProgress: 0 } : item
            )
          );
        }

        try {
          const uploadResult = await uploadService.uploadFile(
            file,
            type === "image"
              ? "chat-images"
              : type === "video"
              ? "chat-videos"
              : "chat-files",
            (progress) => {
              // Update progress for this specific file
              if (fileIndex !== undefined) {
                setPreviewFiles((prev) =>
                  prev.map((item, index) =>
                    index === fileIndex
                      ? { ...item, uploadProgress: progress }
                      : item
                  )
                );
              }
            }
          );

          fileUrl = uploadResult.url;
          messageContent = uploadResult.url; // Send the uploaded file URL
          console.log("File uploaded successfully:", fileUrl);
        } catch (uploadError) {
          console.error("File upload failed:", uploadError);
          throw new Error(`Failed to upload file: ${file.name}`);
        }
      }

      await sendMessage({
        conversationId: conversation._id,
        content: messageContent.trim() || fileUrl || file?.name || "",
        type,
      });
      console.log("Message sent successfully");

      // Clear input and files only if not sending multiple files
      if (!file || fileIndex === undefined) {
        setMessageInput("");
        setSelectedFiles([]);
        setPreviewFiles([]);
      }

      // Stop typing when message is sent
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping(conversation._id);
    } catch (error) {
      console.error("Send message failed:", error);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  // Old handleSend now just calls handleSendMessage for text
  const handleSend = async () => {
    if (previewFiles.length > 0) {
      // Send files sequentially to avoid overwhelming the server
      for (let i = 0; i < previewFiles.length; i++) {
        const { file, type } = previewFiles[i];
        try {
          await handleSendMessage("", type, file, i);
        } catch (error) {
          console.error(`Failed to send file ${file.name}:`, error);
          // Continue with other files even if one fails
        }
      }
      // Clear all files after sending
      setPreviewFiles([]);
      setSelectedFiles([]);
    } else {
      // Send text message
      await handleSendMessage(messageInput, "text");
    }
  };

  // Edit message handlers
  const handleEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessage({ id: messageId, content: currentContent });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (messageId: string, newContent: string) => {
    try {
      await editMessage({ messageId, content: newContent });
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingMessage(null);
  };

  // Delete message handlers
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage({ messageId });
      antdMessage.success('Tin nhắn đã được thu hồi');
    } catch (error) {
      console.error('Failed to delete message:', error);
      antdMessage.error('Thu hồi tin nhắn thất bại');
    }
  };

  // File handling functions
  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: "image" | "video" | "file"
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // File validation constants
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
    const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos

    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      // Check file size based on type
      let maxSize = MAX_FILE_SIZE;
      if (
        fileType === "image" ||
        (fileType === "file" && file.type.startsWith("image/"))
      ) {
        maxSize = MAX_IMAGE_SIZE;
      } else if (
        fileType === "video" ||
        (fileType === "file" && file.type.startsWith("video/"))
      ) {
        maxSize = MAX_VIDEO_SIZE;
      }

      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        errors.push(`${file.name} quá lớn (tối đa ${maxSizeMB}MB)`);
        return;
      }

      // Check file type for specific categories
      if (fileType === "image" && !file.type.startsWith("image/")) {
        errors.push(`${file.name} không phải là file hình ảnh`);
        return;
      }

      if (fileType === "video" && !file.type.startsWith("video/")) {
        errors.push(`${file.name} không phải là file video`);
        return;
      }

      validFiles.push(file);
    });

    // Show errors if any
    if (errors.length > 0) {
      console.error("File validation errors:", errors);
      // You can show a toast notification here
      // For now, just log the errors
    }

    if (validFiles.length === 0) return;

    const newPreviewFiles = validFiles.map((file) => {
      let type: "image" | "video" | "file" = fileType;
      let preview: string | undefined;

      // Auto-detect type based on file if not specified
      if (fileType === "file") {
        if (file.type.startsWith("image/")) {
          type = "image";
        } else if (file.type.startsWith("video/")) {
          type = "video";
        }
      }

      // Create preview for images
      if (type === "image") {
        preview = URL.createObjectURL(file);
      }

      return { file, type, preview };
    });

    setPreviewFiles((prev) => [...prev, ...newPreviewFiles]);
    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePreviewFile = (index: number) => {
    const fileToRemove = previewFiles[index];
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }

    setPreviewFiles((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openFileDialog = (
    accept: string,
    fileType: "image" | "video" | "file"
  ) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.onchange = (e) =>
        handleFileSelect(e as any, fileType);
      fileInputRef.current.click();
    }
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
  const handleSendReaction = (reaction: {
    type: "emoji" | "sticker";
    value: string;
  }) => {
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

    console.log(
      "Input change, isConnected:",
      isConnected,
      "conversation:",
      conversation._id
    );

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
      console.log(
        "Stopping typing (empty input) for conversation:",
        conversation._id
      );
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
                conversationMessages[index - 1].sender?._id !==
                  message.sender?._id;

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
                if (reactionPopupTimer.current)
                  clearTimeout(reactionPopupTimer.current);
                setShowReactionPopup(message._id);
              };
              const handlePlaceholderLeave = () => {
                // Auto-hide popup sau 2.5s nếu không hover lại
                reactionPopupTimer.current = setTimeout(() => {
                  setShowReactionPopup((cur) =>
                    cur === message._id ? null : cur
                  );
                }, 1500);
              };
              const handlePopupEnter = () => {
                if (reactionPopupTimer.current)
                  clearTimeout(reactionPopupTimer.current);
                setShowReactionPopup(message._id);
              };
              const handlePopupLeave = () => {
                reactionPopupTimer.current = setTimeout(() => {
                  setShowReactionPopup((cur) =>
                    cur === message._id ? null : cur
                  );
                }, 1500);
              };

              return (
                <div
                  key={message._id}
                  className={`${styles.messageWrapper} ${
                    isCurrentUser ? styles.currentUser : styles.otherUser
                  }`}
                >
                  {!isCurrentUser &&
                    showAvatar &&
                    getMessageSenderAvatar(message)}
                  <div className={styles.messageContent}>
                    {!isCurrentUser && showAvatar && (
                      <Text className={styles.senderName}>
                        {getMessageSenderName(message)}
                      </Text>
                    )}
                    <div className={styles.messageBubble}>
                      {/* Render different content based on message type */}
                      {message.type === "image" &&
                      message.content.startsWith("http") ? (
                        <div className={styles.messageImage}>
                          <img
                            src={message.content}
                            alt="Shared image"
                            style={{
                              maxWidth: 300,
                              maxHeight: 300,
                              borderRadius: 8,
                              cursor: "pointer",
                            }}
                            onClick={() =>
                              window.open(message.content, "_blank")
                            }
                          />
                        </div>
                      ) : message.type === "video" &&
                        message.content.startsWith("http") ? (
                        <div className={styles.messageVideo}>
                          <video
                            src={message.content}
                            controls
                            style={{
                              maxWidth: 300,
                              maxHeight: 300,
                              borderRadius: 8,
                            }}
                          />
                        </div>
                      ) : message.type === "file" &&
                        message.content.startsWith("http") ? (
                        <div className={styles.messageFile}>
                          <a
                            href={message.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: 8,
                              background: "#f0f0f0",
                              borderRadius: 8,
                              textDecoration: "none",
                              color: "#1890ff",
                            }}
                          >
                            <span style={{ fontSize: 24 }}>📄</span>
                            <div>
                              <div style={{ fontWeight: "bold" }}>
                                {message.content.split("/").pop() ||
                                  "Download File"}
                              </div>
                              <div style={{ fontSize: 12, color: "#666" }}>
                                Click to download
                              </div>
                            </div>
                          </a>
                        </div>
                      ) : (
                        <div className={styles.messageText}>
                          {message.content}
                        </div>
                      )}

                      <div className={styles.messageTime}>
                        {formatMessageTime(message.createdAt)}
                        {isCurrentUser && (
                          <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.8 }}>
                            {message.isRead ? "Đã xem" : "Đã gửi"}
                          </span>
                        )}
                      </div>
                      {/* Reaction display + placeholder icon */}
                      <div
                        style={{
                          position: "relative",
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {/* Hiển thị reaction đã thả (nếu có) */}
                        {message.reactions &&
                          typeof message.reactions === "object" &&
                          Object.values(message.reactions).some(
                            (r: any) => r && r.count > 0
                          ) && (
                            <div
                              className={styles.reactionSummary}
                              style={{
                                display: "flex",
                                gap: 2,
                                alignItems: "center",
                                background: "#f5f5f5",
                                borderRadius: 16,
                                padding: "0 6px",
                                fontSize: 15,
                                border: "1px solid #eee",
                              }}
                            >
                              {REACTION_TYPES.filter(
                                (rt) =>
                                  message.reactions &&
                                  message.reactions[rt.type]?.count > 0
                              ).map((rt) => (
                                <span key={rt.type} style={{ marginRight: 2 }}>
                                  {rt.icon}
                                </span>
                              ))}
                              <span
                                style={{
                                  fontSize: 13,
                                  color: "#888",
                                  marginLeft: 2,
                                }}
                              >
                                {Object.values(message.reactions).reduce(
                                  (sum: number, r: any) =>
                                    sum + ((r && r.count) || 0),
                                  0
                                )}
                              </span>
                            </div>
                          )}
                        {/* Reaction placeholder icon */}
                        <div
                          className={styles.reactionPlaceholder}
                          onMouseEnter={handlePlaceholderEnter}
                          onMouseLeave={handlePlaceholderLeave}
                          style={{
                            display: "inline-block",
                            position: "relative",
                          }}
                        >
                          <span
                            style={{
                              border: "1px solid #ccc",
                              borderRadius: "50%",
                              padding: 2,
                              color: "#bbb",
                              background: "#fff",
                              fontSize: 18,
                              cursor: "pointer",
                              transition: "border 0.2s",
                            }}
                          >
                            👍
                          </span>
                          {/* Reaction popup */}
                          {showReactionPopup === message._id && (
                            <div
                              className={styles.reactionPopup}
                              style={{
                                position: "absolute",
                                zIndex: 1000,
                                background: "#fff",
                                border: "1px solid #eee",
                                borderRadius: 24,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                                padding: "4px 8px",
                                display: "flex",
                                gap: 6,
                                bottom: 32,
                                left: "50%",
                                transform: "translateX(-50%)",
                              }}
                              onMouseEnter={handlePopupEnter}
                              onMouseLeave={handlePopupLeave}
                            >
                              {REACTION_TYPES.map((r) => (
                                <span
                                  key={r.type}
                                  style={{
                                    fontSize: 22,
                                    cursor: "pointer",
                                    transition: "transform 0.1s",
                                  }}
                                  onClick={() => handleReact(r.type)}
                                >
                                  {r.icon}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Message menu for current user's messages */}
                      {isCurrentUser && message.type === 'text' && (
                        <div style={{ position: 'absolute', top: 4, right: 4, opacity: 0.7 }}>
                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: 'edit',
                                  label: 'Sửa tin nhắn',
                                  icon: <EditOutlined />,
                                  onClick: () => handleEditMessage(message._id, message.content),
                                },
                                {
                                  key: 'delete',
                                  label: 'Thu hồi tin nhắn',
                                  icon: <DeleteOutlined />,
                                  danger: true,
                                  onClick: () => handleDeleteMessage(message._id),
                                },
                              ],
                            }}
                            trigger={['click']}
                            placement="bottomRight"
                          >
                            <Button
                              type="text"
                              size="small"
                              icon={<MoreOutlined />}
                              style={{ 
                                color: '#666',
                                fontSize: '12px',
                                padding: '2px 4px',
                                height: 'auto',
                                minWidth: 'auto'
                              }}
                            />
                          </Dropdown>
                        </div>
                      )}
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
        {/* File Preview Section */}
        {previewFiles.length > 0 && (
          <div className={styles.filePreviewContainer}>
            {previewFiles.map((fileData, index) => (
              <div key={index} className={styles.filePreviewItem}>
                {/* Progress bar overlay when uploading */}
                {fileData.uploadProgress !== undefined && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "rgba(0,0,0,0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      zIndex: 10,
                    }}
                  >
                    <div style={{ textAlign: "center", color: "white" }}>
                      <Progress
                        type="circle"
                        percent={fileData.uploadProgress}
                        size={40}
                        strokeColor="#1890ff"
                      />
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Đang tải lên...
                      </div>
                    </div>
                  </div>
                )}

                {fileData.type === "image" && fileData.preview && (
                  <div className={styles.imagePreview}>
                    <img
                      src={fileData.preview}
                      alt="Preview"
                      style={{
                        maxWidth: 100,
                        maxHeight: 100,
                        objectFit: "cover",
                        borderRadius: 8,
                      }}
                    />
                    <button
                      className={styles.removeFileBtn}
                      onClick={() => removePreviewFile(index)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(0,0,0,0.5)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: 20,
                        height: 20,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {fileData.type === "video" && (
                  <div
                    className={styles.videoPreview}
                    style={{ position: "relative" }}
                  >
                    <div
                      style={{
                        width: 100,
                        height: 100,
                        background: "#f0f0f0",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                      }}
                    >
                      <span style={{ fontSize: 24 }}>🎥</span>
                      <span style={{ fontSize: 12, marginTop: 4 }}>
                        {fileData.file.name.substring(0, 10)}...
                      </span>
                    </div>
                    <button
                      className={styles.removeFileBtn}
                      onClick={() => removePreviewFile(index)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(0,0,0,0.5)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: 20,
                        height: 20,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {fileData.type === "file" && (
                  <div
                    className={styles.filePreview}
                    style={{ position: "relative" }}
                  >
                    <div
                      style={{
                        width: 100,
                        height: 100,
                        background: "#f0f0f0",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                      }}
                    >
                      <span style={{ fontSize: 24 }}>📄</span>
                      <span style={{ fontSize: 12, marginTop: 4 }}>
                        {fileData.file.name.substring(0, 10)}...
                      </span>
                    </div>
                    <button
                      className={styles.removeFileBtn}
                      onClick={() => removePreviewFile(index)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(0,0,0,0.5)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: 20,
                        height: 20,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
            ]
          </div>
        )}

        <div className={styles.inputContainer}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            multiple
          />

          <Dropdown
            menu={{
              items: [
                {
                  key: "image",
                  label: "Hình ảnh",
                  icon: "🖼️",
                  onClick: () => openFileDialog("image/*", "image"),
                },
                {
                  key: "video",
                  label: "Video",
                  icon: "🎥",
                  onClick: () => openFileDialog("video/*", "video"),
                },
                {
                  key: "file",
                  label: "Tệp tin",
                  icon: "📄",
                  onClick: () => openFileDialog("*/*", "file"),
                },
              ],
            }}
            trigger={["click"]}
            placement="topLeft"
          >
            <Button
              type="text"
              icon={<PaperClipOutlined />}
              className={styles.inputAction}
            />
          </Dropdown>

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
                items={[
                  {
                    key: "emoji",
                    label: "Emoji",
                    children: (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          maxWidth: 220,
                        }}
                      >
                        {emojis.map((emoji) => (
                          <span
                            key={emoji}
                            style={{ fontSize: 24, cursor: "pointer" }}
                            onClick={() =>
                              handleSendReaction({
                                type: "emoji",
                                value: emoji,
                              })
                            }
                          >
                            {emoji}
                          </span>
                        ))}
                      </div>
                    ),
                  },
                  {
                    key: "sticker",
                    label: "Sticker",
                    children: (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          maxWidth: 220,
                        }}
                      >
                        {stickers.map((sticker) => (
                          <img
                            key={sticker.id}
                            src={sticker.url}
                            alt={sticker.id}
                            style={{ width: 40, height: 40, cursor: "pointer" }}
                            onClick={() =>
                              handleSendReaction({
                                type: "sticker",
                                value: sticker.id,
                              })
                            }
                          />
                        ))}
                      </div>
                    ),
                  },
                ]}
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
            loading={sending || uploading}
            disabled={
              (!messageInput.trim() && previewFiles.length === 0) ||
              !isConnected ||
              uploading
            }
            className={styles.sendButton}
          />
        </div>

        {!isConnected && (
          <div className={styles.connectionStatus}>
            <Text type="danger">Đã mất kết nối với máy chủ</Text>
          </div>
        )}
      </div>
      
      {/* Edit Message Modal */}
      <EditMessageModal
        visible={showEditModal}
        messageId={editingMessage?.id || ''}
        currentContent={editingMessage?.content || ''}
        onCancel={handleCancelEdit}
        onSave={handleSaveEdit}
      />
    </div>
  );
};
