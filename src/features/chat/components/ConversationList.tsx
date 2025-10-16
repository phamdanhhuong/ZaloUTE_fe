"use client";

import React, { useState } from "react";
import { List, Avatar, Badge, Input, Button, Empty, Spin, Dropdown, Space, Typography } from "antd";
import {
  SearchOutlined,
  TeamOutlined,
  PushpinOutlined,
  PlusOutlined,
  SettingOutlined,
  CrownOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { UserAvatar } from "@/components/UserAvatar";
import { useConversations } from "../hooks";
import { CreateGroupModal } from "./CreateGroupModal";
import { GroupSettingsModal } from "./GroupSettingsModal";
import type { Conversation } from "../service";
import { LoginUser } from "@/features/auth/login/service";
import styles from "./ConversationList.module.css";

const { Text } = Typography;

interface ConversationListProps {
  activeConversationId?: string;
  onConversationSelect?: (conversation: Conversation) => void;
  currentUser?: LoginUser | null;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  activeConversationId,
  onConversationSelect,
  currentUser,
}) => {
  const { loading, conversations, refreshConversations } = useConversations();
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [selectedGroupForSettings, setSelectedGroupForSettings] = useState<Conversation | null>(null);

  console.log('ConversationList currentUser prop:', currentUser); // Debug log
  console.log('ConversationList currentUser.id:', currentUser?.id); // Debug log

  const getConversationName = (conversation: Conversation) => {
    console.log('Getting name for conversation:', conversation); // Debug log
    
    if (conversation.name) {
      return conversation.name;
    }

    // Check for group conversation - MongoDB uses type field
    if (conversation.type === 'group' || conversation.isGroup) {
      return conversation.groupName || conversation.name || `Nhóm ${conversation.participants?.length || 0} thành viên`;
    }

    // For 1-on-1 conversation, get the other participant's name
    console.log('Participants:', conversation.participants); // Debug log
    console.log('Participants detailed structure:', JSON.stringify(conversation.participants, null, 2));
    console.log('Current user ID:', currentUser?.id);
    
    if (!conversation.participants || conversation.participants.length === 0) {
      return "Cuộc trò chuyện";
    }
    
    // With the simplified backend structure, participants is an array of User objects directly
    const otherParticipant = conversation.participants.find(user => {
      const userId = user._id;
      console.log('Checking user ID:', userId, 'vs current user:', currentUser?.id);
      return userId && userId !== currentUser?.id;
    });

    console.log('Other participant:', otherParticipant); // Debug log

    if (otherParticipant) {
      const firstName = otherParticipant.firstname || '';
      const lastName = otherParticipant.lastname || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || otherParticipant.username || otherParticipant.email || 'Unknown User';
    }

    return "Cuộc trò chuyện";
  };

  const getConversationAvatar = (conversation: Conversation) => {
    // Nếu là group chat, hiển thị avatar group
    if (conversation.type === 'group' || conversation.isGroup) {
      const name = getConversationName(conversation);
      return (
        <div style={{ position: 'relative' }}>
          <Avatar 
            size={48} 
            className={styles.avatar} 
            src={conversation.avatar}
            style={{ backgroundColor: '#1890ff' }}
          >
            {!conversation.avatar && <TeamOutlined />}
          </Avatar>
          {conversation.groupAdmin?._id === currentUser?.id && (
            <CrownOutlined 
              style={{ 
                position: 'absolute', 
                top: -2, 
                right: -2, 
                color: '#faad14',
                fontSize: 12,
                background: 'white',
                borderRadius: '50%',
                padding: 1
              }} 
            />
          )}
        </div>
      );
    }

    // Nếu là chat 1-1, hiển thị avatar của người kia
    const otherParticipant = conversation.participants?.find(user => {
      const userId = user._id;
      return userId && userId !== currentUser?.id;
    });

    if (otherParticipant) {
      return (
        <UserAvatar
          user={{
            id: otherParticipant._id,
            username: otherParticipant.username || '',
            firstname: otherParticipant.firstname,
            lastname: otherParticipant.lastname,
            avatarUrl: otherParticipant.avatarUrl,
          }}
          size={48}
          className={styles.avatar}
        />
      );
    }

    // Fallback
    const name = getConversationName(conversation);
    return (
      <Avatar size={48} className={styles.avatar}>
        {name.charAt(0).toUpperCase()}
      </Avatar>
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

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

    const { content, sender, type, messageType } = conversation.lastMessage;
    if (!sender) {
      return "Tin nhắn không xác định";
    }
    const senderName =
      (sender._id || sender.id) === currentUser?.id
        ? "Bạn"
        : sender.firstname || sender.username || "Người dùng";

    const messageTypeToUse = type || messageType;
    switch (messageTypeToUse) {
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
    if (!conversations || !Array.isArray(conversations)) {
      return [];
    }
    
    let filtered = [...conversations]; // Create copy to avoid mutation

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter((conv) => {
        const name = getConversationName(conv).toLowerCase();
        return name.includes(searchText.toLowerCase());
      });
    }

    // Filter by tab
    if (activeTab === "unread") {
      filtered = filtered.filter((conv) => (conv.unreadCount || 0) > 0);
    }

    // Sort by last message time
    return filtered.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || a.updatedAt;
      const timeB = b.lastMessage?.createdAt || b.updatedAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  }, [conversations, searchText, activeTab]);

  // Handle create group success
  const handleCreateGroupSuccess = (groupId: string) => {
    setShowCreateGroupModal(false);
    refreshConversations();
    // Optionally select the new group
    const newGroup = conversations.find(c => c._id === groupId);
    if (newGroup && onConversationSelect) {
      onConversationSelect(newGroup);
    }
  };

  const handleGroupSettingsClick = (conversation: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Opening group settings for:', conversation.name);
    setSelectedGroupForSettings(conversation);
    setShowGroupSettingsModal(true);
  };

  const handleConversationUpdate = (updatedConversation: Conversation) => {
    refreshConversations();
  };

  const handleLeaveGroup = () => {
    refreshConversations();
    setSelectedGroupForSettings(null);
    setShowGroupSettingsModal(false);
  };

  const getGroupActionMenu = (conversation: Conversation) => {
    if (conversation.type !== 'group') return undefined;

    const isAdmin = conversation.groupAdmin?._id === currentUser?.id;
    const isMember = conversation.participants.some(p => p._id === currentUser?.id);

    console.log('Group action menu for:', conversation.name, {
      isAdmin,
      isMember,
      currentUserId: currentUser?.id,
      groupAdminId: conversation.groupAdmin?._id
    });

    if (!isMember) return undefined;

    return {
      items: [
        {
          key: 'settings',
          icon: <SettingOutlined />,
          label: 'Cài đặt nhóm',
          onClick: () => {
            handleGroupSettingsClick(conversation, new MouseEvent('click') as any);
          },
        },
      ],
    };
  };

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
          className={`${styles.tab} ${
            activeTab === "all" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("all")}
        >
          Tất cả
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "unread" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("unread")}
        >
          Chưa đọc
        </button>
      </div>

      {/* Create Group Button */}
      <div style={{ padding: "8px 16px", marginBottom: 8 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowCreateGroupModal(true)}
          block
          size="middle"
        >
          Tạo nhóm chat
        </Button>
      </div>

      {/* Conversation List */}
      <div className={styles.listContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Spin size="large">
              <div style={{ padding: "20px", textAlign: "center" }}>
                Đang tải cuộc trò chuyện...
              </div>
            </Spin>
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className={styles.scrollArea}>
            {filteredConversations.map((conversation) => (
              <div
                key={conversation._id || conversation.id}
                className={`${styles.conversationItem} ${
                  activeConversationId === (conversation._id || conversation.id) ? styles.active : ""
                }`}
                onClick={() => onConversationSelect?.(conversation)}
              >
                <div className={styles.conversationContent}>
                  {/* Avatar */}
                  <div className={styles.avatarContainer}>
                    {getConversationAvatar(conversation)}

                    {/* Pin indicator for important conversations */}
                    {conversation._id === activeConversationId && (
                      <div className={styles.pinIndicator}>
                        <PushpinOutlined />
                      </div>
                    )}

                    {/* Member count for groups */}
                    {(conversation.type === 'group' || conversation.isGroup) && (
                      <div className={styles.memberCount}>
                        {conversation.participants.length}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationHeader}>
                      <div className={styles.nameContainer}>
                        <div>
                          <h3 className={styles.conversationName}>
                            <Space>
                              {(conversation.type === 'group' || conversation.isGroup) && (
                                <TeamOutlined style={{ color: '#1890ff' }} />
                              )}
                              {getConversationName(conversation)}
                              {conversation.groupAdmin?._id === currentUser?.id && (
                                <CrownOutlined style={{ color: '#faad14', fontSize: 14 }} />
                              )}
                            </Space>
                          </h3>
                          {(conversation.type === 'group' || conversation.isGroup) && (
                            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                              {conversation.participants.length} thành viên
                              
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.timeAndBadge}>
                        <span className={styles.time}>
                          {conversation.lastMessage
                            ? formatTime(conversation.lastMessage.createdAt)
                            : ""}
                        </span>
                        {(conversation.unreadCount || 0) > 0 && (
                          <Badge
                            count={conversation.unreadCount}
                            size="small"
                            style={{ marginLeft: 8 }}
                          />
                        )}
                        
                        {/* Group Settings Dropdown */}
                        {(conversation.type === 'group' || conversation.isGroup) && (
                          <Dropdown 
                            menu={getGroupActionMenu(conversation)}
                            trigger={['click']}
                            placement="bottomRight"
                          >
                            <Button 
                              type="text" 
                              size="small" 
                              icon={<MoreOutlined />}
                              onClick={(e) => e.stopPropagation()}
                              style={{ marginLeft: 4 }}
                            />
                          </Dropdown>
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

      {/* Create Group Modal */}
      <CreateGroupModal
        visible={showCreateGroupModal}
        onCancel={() => setShowCreateGroupModal(false)}
        onSuccess={handleCreateGroupSuccess}
      />

      {/* Group Settings Modal */}
      <GroupSettingsModal
        visible={showGroupSettingsModal}
        onCancel={() => {
          setShowGroupSettingsModal(false);
          setSelectedGroupForSettings(null);
        }}
        conversation={selectedGroupForSettings}
        onConversationUpdate={handleConversationUpdate}
        onLeaveGroup={handleLeaveGroup}
        onGroupDissolved={() => {
          setShowGroupSettingsModal(false);
          setSelectedGroupForSettings(null);
          refreshConversations();
        }}
      />
    </div>
  );
};

export default ConversationList;
