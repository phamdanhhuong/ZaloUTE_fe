"use client";

import React, { useState } from "react";
import { List, Avatar, Badge, Input, Button, Empty, Spin } from "antd";
import { SearchOutlined, TeamOutlined, PushpinOutlined } from "@ant-design/icons";
import { useConversations } from "../hooks";
import type { Conversation } from "../service";
import styles from "./ConversationList.module.css";

// Import User type from friend service
interface User {
  id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
}

interface ConversationListProps {
  activeConversationId?: string;
  onConversationSelect?: (conversation: Conversation) => void;
  currentUser?: User;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  activeConversationId,
  onConversationSelect,
  currentUser,
}) => {
  const { loading, conversations } = useConversations();
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const getConversationName = (conversation: Conversation) => {
    if (conversation.name) {
      return conversation.name;
    }

    if (conversation.isGroup) {
      return `Nhóm ${conversation.participants.length} thành viên`;
    }

    // For 1-on-1 conversation, get the other participant's name
    const otherParticipant = conversation.participants.find(
      p => p.user.id !== currentUser?.id
    );
    
    if (otherParticipant) {
      const user = otherParticipant.user;
      return `${user.firstname} ${user.lastname}`.trim() || user.username;
    }

    return "Cuộc trò chuyện";
  };

  const getConversationAvatar = (conversation: Conversation) => {
    const name = getConversationName(conversation);
    return name.charAt(0).toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return "Vừa xong";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} phút`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} giờ`;
    } else {
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    if (!conversation.lastMessage) {
      return "Chưa có tin nhắn";
    }

    const { content, sender, messageType } = conversation.lastMessage;
    const senderName = sender.id === currentUser?.id ? "Bạn" : sender.firstname || sender.username;

    switch (messageType) {
      case "image":
        return `${senderName}: 📷 Hình ảnh`;
      case "file":
        return `${senderName}: 📄 Tệp đính kèm`;
      case "sticker":
        return `${senderName}: 📄 Sticker`;
      default:
        return `${senderName}: ${content}`;
    }
  };

  // Filter conversations
  const filteredConversations = React.useMemo(() => {
    let filtered = conversations;

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(conv => {
        const name = getConversationName(conv).toLowerCase();
        return name.includes(searchText.toLowerCase());
      });
    }

    // Filter by tab
    if (activeTab === "unread") {
      filtered = filtered.filter(conv => (conv.unreadCount || 0) > 0);
    }

    // Sort by last message time
    return filtered.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || a.updatedAt;
      const timeB = b.lastMessage?.createdAt || b.updatedAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  }, [conversations, searchText, activeTab]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>
            Zalo - {currentUser?.firstname || "Người dùng"}
          </h1>
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
              icon={<SearchOutlined />} 
              className={styles.actionButton}
            />
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Tìm kiếm"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "all" ? styles.active : ""}`}
          onClick={() => setActiveTab("all")}
        >
          Tất cả
        </button>
        <button
          className={`${styles.tab} ${activeTab === "unread" ? styles.active : ""}`}
          onClick={() => setActiveTab("unread")}
        >
          Chưa đọc
        </button>
      </div>

      {/* Conversation List */}
      <div className={styles.listContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Spin tip="Đang tải cuộc trò chuyện..." />
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className={styles.scrollArea}>
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`${styles.conversationItem} ${activeConversationId === conversation.id ? styles.active : ""}`}
                onClick={() => onConversationSelect?.(conversation)}
              >
                <div className={styles.conversationContent}>
                  {/* Avatar */}
                  <div className={styles.avatarContainer}>
                    <Avatar 
                      size={48} 
                      className={styles.avatar}
                    >
                      {getConversationAvatar(conversation)}
                    </Avatar>

                    {/* Pin indicator for important conversations */}
                    {conversation.id === activeConversationId && (
                      <div className={styles.pinIndicator}>
                        <PushpinOutlined />
                      </div>
                    )}

                    {/* Member count for groups */}
                    {conversation.isGroup && (
                      <div className={styles.memberCount}>
                        {conversation.participants.length}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationHeader}>
                      <div className={styles.nameContainer}>
                        {conversation.isGroup && (
                          <TeamOutlined className={styles.groupIcon} />
                        )}
                        <h3 className={styles.conversationName}>
                          {getConversationName(conversation)}
                        </h3>
                      </div>

                      <div className={styles.timeAndBadge}>
                        <span className={styles.time}>
                          {conversation.lastMessage ? formatTime(conversation.lastMessage.createdAt) : ""}
                        </span>
                        {(conversation.unreadCount || 0) > 0 && (
                          <Badge
                            count={conversation.unreadCount}
                            size="small"
                            style={{ marginLeft: 8 }}
                          />
                        )}
                      </div>
                    </div>

                    <p className={styles.lastMessage}>
                      {getLastMessagePreview(conversation)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty 
            description={
              searchText 
                ? "Không tìm thấy cuộc trò chuyện nào" 
                : activeTab === "unread" 
                  ? "Không có tin nhắn chưa đọc"
                  : "Chưa có cuộc trò chuyện nào"
            }
            className={styles.emptyState}
          />
        )}
      </div>
    </div>
  );
};

export default ConversationList;
