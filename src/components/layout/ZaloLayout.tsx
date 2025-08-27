"use client";

import React, { useState } from "react";
import { Button, Avatar } from "antd";
import {
  MessageOutlined,
  TeamOutlined,
  UserAddOutlined,
  CloudOutlined,
  PhoneOutlined,
  SettingOutlined,
  UserOutlined,
  ContactsOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/selectors";
import "../../app/styles/zalo-layout.css";

// Import components
import { ConversationList, ChatArea } from "@/features/chat";
import {
  Friend,
  UserSearch,
  ListFriend,
  useFriends,
  FriendRequests,
  useFriendRequests,
} from "@/features/friend";
import type { Conversation } from "@/features/chat/service";
import type { User } from "@/features/friend/service";

type ActiveView = "chat" | "friends" | "friend-list" | "groups";
type FriendTab = "friends" | "groups" | "friend-requests" | "group-invites";

export const ZaloLayout: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>("chat");
  const [selectedConversation, setSelectedConversation] = useState<
    Conversation | undefined
  >();
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedFriendTab, setSelectedFriendTab] =
    useState<FriendTab>("friends");

  const currentUser = useAppSelector(selectUser);
  const { loading, friends } = useFriends();
  const { requests: friendRequests, loadPendingRequests } = useFriendRequests();

  const getUserDisplayName = () => {
    if (!currentUser) return "User";
    return (
      `${currentUser.firstname} ${currentUser.lastname}`.trim() ||
      currentUser.username
    );
  };

  const getUserAvatar = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  const handleChatWithFriend = (friend: User) => {
    // In a real app, this would create a conversation or find existing one
    console.log("Start chat with:", friend);
    setActiveView("chat");
  };

  const handleViewProfile = (user: User) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  const handleFriendTabChange = (tab: FriendTab) => {
    setSelectedFriendTab(tab);
    setShowUserProfile(false); // Hide profile when changing tabs
  };

  const renderMainContent = () => {
    if (showUserProfile && selectedUser) {
    }

    switch (activeView) {
      case "chat":
        return <ChatArea conversation={selectedConversation} />;
      case "friends":
        return renderFriendTabContent();
      default:
        return <div className="empty-state">Chọn một mục để bắt đầu</div>;
    }
  };

  const renderFriendTabContent = () => {
    switch (selectedFriendTab) {
      case "friends":
        return (
          <ListFriend
            friends={friends}
            loading={loading}
            onChatWithFriend={handleChatWithFriend}
            onViewProfile={handleViewProfile}
          />
        );
      case "groups":
        return (
          <div style={{ padding: 20, textAlign: "center" }}>
            <h3>Danh sách nhóm và cộng đồng</h3>
            <p>Tính năng này sẽ được phát triển trong tương lai</p>
          </div>
        );
      case "friend-requests":
        return (
          <FriendRequests
            onAcceptRequest={(requestId) => {
              console.log("Accepted friend request:", requestId);
              // Refresh friend requests and friends list
              loadPendingRequests();
            }}
            onRejectRequest={(requestId) => {
              console.log("Rejected friend request:", requestId);
              // Refresh friend requests
              loadPendingRequests();
            }}
          />
        );
      case "group-invites":
        return (
          <div style={{ padding: 20, textAlign: "center" }}>
            <h3>Lời mời vào nhóm và cộng đồng</h3>
            <p>Tính năng này sẽ được phát triển trong tương lai</p>
          </div>
        );
      default:
        return (
          <div style={{ padding: 20, textAlign: "center" }}>
            Chọn một mục từ menu bên trái
          </div>
        );
    }
  };

  const renderSidebarContent = () => {
    switch (activeView) {
      case "chat":
        return (
          <ConversationList
            activeConversationId={selectedConversation?.id}
            onConversationSelect={setSelectedConversation}
          />
        );
      case "friends":
        return (
          <Friend
            onChatWithFriend={handleChatWithFriend}
            onViewProfile={handleViewProfile}
            onTabChange={handleFriendTabChange}
            activeTab={selectedFriendTab}
          />
        );
      default:
        return <div>Chọn một mục từ sidebar</div>;
    }
  };

  return (
    <div className="zalo-container">
      {/* Left Sidebar */}
      <div className="left-sidebar">
        {/* User Avatar */}
        <Avatar className="user-avatar" size={40}>
          {getUserAvatar()}
        </Avatar>

        {/* Navigation Icons */}
        <div className="nav-icons">
          <Button
            className={`nav-button ${activeView === "chat" ? "active" : ""}`}
            onClick={() => {
              setActiveView("chat");
              setShowUserProfile(false);
            }}
            icon={<MessageOutlined />}
          />

          <div className="nav-button-wrapper">
            <Button
              className={`nav-button ${
                activeView === "friends" ? "active" : ""
              }`}
              onClick={() => {
                setActiveView("friends");
                setShowUserProfile(false);
              }}
              icon={<ContactsOutlined />}
            />
            {/* Notification badge for friend requests */}
            {friendRequests.length > 0 && (
              <div className="notification-badge">{friendRequests.length}</div>
            )}
          </div>
        </div>

        {/* Bottom Icons */}
        <div className="bottom-icons">
          <Button className="nav-button" icon={<CloudOutlined />} />
          <Button className="nav-button" icon={<PhoneOutlined />} />
          <Button className="nav-button" icon={<SettingOutlined />} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Chat List / Friends List Sidebar */}
        <div className="chat-list-sidebar">
          {/* Header */}
          <div className="sidebar-header">
            <div className="header-title">
              <h1 className="title-text">
                {activeView === "chat" && `Zalo - ${getUserDisplayName()}`}
                {activeView === "friends" && "Danh sách bạn bè"}
              </h1>
              <div className="header-actions">
                <Button className="header-action-btn" icon={<TeamOutlined />} />
                <Button
                  className="header-action-btn"
                  icon={<UserAddOutlined />}
                />
              </div>
            </div>

            {/* Search functionality for friends view */}
            {activeView === "friends" && (
              <div style={{ marginTop: 12 }}>
                <UserSearch onUserSelect={handleUserSelect} />
              </div>
            )}
          </div>

          {/* Content based on active view */}
          <div className="sidebar-content">{renderSidebarContent()}</div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">{renderMainContent()}</div>
      </div>
    </div>
  );
};

export default ZaloLayout;
