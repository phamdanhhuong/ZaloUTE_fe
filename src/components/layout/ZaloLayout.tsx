"use client";

import React, { useState, useEffect } from "react";
import { Button, Avatar, Dropdown, Menu, Spin } from "antd";
import {
  MessageOutlined,
  TeamOutlined,
  UserAddOutlined,
  CloudOutlined,
  PhoneOutlined,
  SettingOutlined,
  UserOutlined,
  ContactsOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { selectUser, selectIsAuthenticated } from "@/store/selectors";
import { logout, initializeFromStorage } from "@/store/slices/userSlice";
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
  const [isInitialized, setIsInitialized] = useState(false);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { loading, friends } = useFriends();
  const { requests: friendRequests, loadPendingRequests } = useFriendRequests();

  // Authentication guard and initialization
  useEffect(() => {
    // Initialize user from localStorage on component mount
    dispatch(initializeFromStorage());
    setIsInitialized(true);
  }, [dispatch]);

  useEffect(() => {
    // Redirect to login if not authenticated after initialization
    if (isInitialized && !isAuthenticated) {
      router.push('/login');
    }
  }, [isInitialized, isAuthenticated, router]);

  // Show loading spinner while initializing
  if (!isInitialized || (!isAuthenticated && isInitialized)) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <Spin size="large" />
      </div>
    );
  }

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

  const handleLogout = () => {
    // Dispatch logout action to clear user data from store
    dispatch(logout());
    router.push('/login');
  };

  const handleViewAccountInfo = () => {
    router.push('/profile');
  };

  // Create dropdown menu items
  const menuItems = [
    {
      key: 'profile',
      label: 'Thông tin tài khoản',
      icon: <UserOutlined />,
      onClick: handleViewAccountInfo,
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

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
        {/* User Avatar with Dropdown */}
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="bottomLeft"
        >
          <Avatar className="user-avatar" size={40} style={{ cursor: 'pointer' }}>
            {getUserAvatar()}
          </Avatar>
        </Dropdown>

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
