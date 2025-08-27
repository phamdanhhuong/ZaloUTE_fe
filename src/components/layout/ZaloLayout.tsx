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
  UserOutlined
} from "@ant-design/icons";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/selectors";
import "../../app/styles/zalo-layout.css";

// Import components
import { ConversationList, ChatArea } from "@/features/chat";
import { FriendsList, FriendRequests, UserSearch, UserProfile } from "@/features/friend";
import type { Conversation } from "@/features/chat/service";
import type { User } from "@/features/friend/service";

type ActiveView = "chat" | "friends" | "friend-requests" | "groups";

export const ZaloLayout: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>("chat");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | undefined>();
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [showUserProfile, setShowUserProfile] = useState(false);
  
  const currentUser = useAppSelector(selectUser);

  const getUserDisplayName = () => {
    if (!currentUser) return "User";
    return `${currentUser.firstname} ${currentUser.lastname}`.trim() || currentUser.username;
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

  const renderMainContent = () => {
    if (showUserProfile) {
      return (
        <UserProfile
          user={selectedUser}
          onStartChat={handleChatWithFriend}
          onClose={() => {
            setShowUserProfile(false);
            setSelectedUser(undefined);
          }}
        />
      );
    }

    switch (activeView) {
      case "chat":
        return (
          <ChatArea 
            conversation={selectedConversation}
            currentUser={currentUser}
          />
        );
      case "friends":
        return (
          <div className="empty-state">
            Chọn một người bạn để xem thông tin
          </div>
        );
      case "friend-requests":
        return (
          <div className="empty-state">
            Quản lý lời mời kết bạn
          </div>
        );
      default:
        return (
          <div className="empty-state">
            Chọn một mục để bắt đầu
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
            currentUser={currentUser}
          />
        );
      case "friends":
        return (
          <FriendsList
            onChatWithFriend={handleChatWithFriend}
            onViewProfile={handleViewProfile}
          />
        );
      case "friend-requests":
        return (
          <FriendRequests onViewProfile={handleViewProfile} />
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

          <Button
            className={`nav-button ${activeView === "friends" ? "active" : ""}`}
            onClick={() => {
              setActiveView("friends");
              setShowUserProfile(false);
            }}
            icon={<TeamOutlined />}
          />

          <Button
            className={`nav-button ${activeView === "friend-requests" ? "active" : ""}`}
            onClick={() => {
              setActiveView("friend-requests");
              setShowUserProfile(false);
            }}
            icon={<UserAddOutlined />}
          />
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
                {activeView === "friend-requests" && "Lời mời kết bạn"}
              </h1>
              <div className="header-actions">
                <Button 
                  className="header-action-btn" 
                  icon={<TeamOutlined />}
                  onClick={() => setActiveView("friends")}
                />
                <Button 
                  className="header-action-btn" 
                  icon={<UserAddOutlined />}
                  onClick={() => setActiveView("friend-requests")}
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
          <div className="sidebar-content">
            {renderSidebarContent()}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
};

export default ZaloLayout;
