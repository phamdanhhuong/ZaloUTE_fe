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
import { createConversation } from "@/features/chat/service";
import { ChatArea as ChatAreaNew } from "@/features/chat/components/ChatAreaNew";
import { useSocket } from "@/features/chat/hooks/useSocket";
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
import type { SocketConversation } from "@/infrastructure/socket/socketService";

type ActiveView = "chat" | "friends" | "friend-list" | "groups";
type FriendTab = "friends" | "groups" | "friend-requests" | "group-invites";

export const ZaloLayout: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>("chat");
  const [selectedConversation, setSelectedConversation] = useState<
    SocketConversation | undefined
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
  const token = useAppSelector((state) => state.user.token);
  const { loading, friends } = useFriends();
  const { requests: friendRequests, loadPendingRequests } = useFriendRequests();
  
  // Socket integration
  const { isConnected, connect, disconnect, joinConversation } = useSocket();
  
  // Connect to socket when component mounts
  useEffect(() => {
    if (currentUser && !isConnected) {
      console.log("Initializing socket connection for user:", currentUser.id);
      console.log("Token available:", !!token);
      if (token) {
        connect();
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [currentUser, isConnected, token, connect, disconnect]);

  // Auto-join conversation when socket connects
  useEffect(() => {
    if (isConnected && selectedConversation?._id) {
      console.log("Socket connected, joining conversation:", selectedConversation._id);
      joinConversation(selectedConversation._id);
    }
  }, [isConnected, selectedConversation?._id, joinConversation]);

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

  const handleChatWithFriend = async (friend: User) => {
    if (!currentUser) {
      console.error("Current user not available");
      return;
    }

    try {
      console.log("Creating conversation with friend:", friend);
      // Create or get existing conversation with this friend
      const conversation = await createConversation({
        participantIds: [friend.id], // Only send friend ID, current user will be added automatically
        isGroup: false
      });
      
      console.log("Received conversation:", conversation);
      
      // Convert to SocketConversation format
      const socketConversation: SocketConversation = {
        _id: conversation._id || '', // Use _id from MongoDB response
        participants: [currentUser.id, friend.id],
        type: 'private',
        name: `${friend.firstname} ${friend.lastname}`,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };
      
      console.log("Created socketConversation with ID:", socketConversation._id);
      setSelectedConversation(socketConversation);
      setActiveView("chat");
      
      // Join conversation room only if socket is connected
      if (socketConversation._id && isConnected) {
        joinConversation(socketConversation._id);
      } else if (!isConnected) {
        console.warn("Socket not connected, conversation will be joined when connected");
      }
    } catch (error) {
      console.error("Failed to create/get conversation:", error);
      // Show user-friendly error message
    }
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
        console.log('Rendering ChatAreaNew with selectedConversation:', selectedConversation);
        return <ChatAreaNew conversation={selectedConversation} />;
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

  // Helper function to calculate conversation name
  const getConversationName = (conversation: Conversation) => {
    if (conversation.name) {
      return conversation.name;
    }

    // Check for group conversation
    if (conversation.type === 'group' || conversation.isGroup) {
      return conversation.groupName || conversation.name || `Nhóm ${conversation.participants?.length || 0} thành viên`;
    }

    // For 1-on-1 conversation, get the other participant's name
    if (!conversation.participants || conversation.participants.length === 0) {
      return "Cuộc trò chuyện";
    }
    
    // Find the other participant (not current user)
    const otherParticipant = conversation.participants.find(user => {
      const userId = user._id;
      return userId && userId !== currentUser?.id;
    });

    if (otherParticipant) {
      const firstName = otherParticipant.firstname || '';
      const lastName = otherParticipant.lastname || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || otherParticipant.username || otherParticipant.email || 'Unknown User';
    }

    return "Cuộc trò chuyện";
  };

  // Convert regular conversation to socket conversation format
  const handleConversationSelect = (conversation: Conversation) => {
    console.log('Conversation selected:', conversation);
    console.log('Conversation._id:', conversation._id);
    console.log('Conversation.id:', conversation.id);
    console.log('Conversation participants:', conversation.participants);
    
    const socketConversation: SocketConversation = {
      _id: conversation._id || conversation.id || '', // Handle both _id and id with fallback
      participants: conversation.participants.map(p => p._id), // Use _id for participants too
      type: conversation.type || (conversation.isGroup ? 'group' : 'private'),
      name: getConversationName(conversation), // Use calculated name
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
    
    console.log('Created socketConversation:', socketConversation);
    console.log('socketConversation._id:', socketConversation._id);
    setSelectedConversation(socketConversation);
    
    // Join conversation room only if socket is connected
    console.log('Socket connection state - isConnected:', isConnected);
    console.log('Socket conversation ID exists:', !!socketConversation._id);
    if (socketConversation._id && isConnected) {
      console.log('Attempting to join conversation:', socketConversation._id);
      joinConversation(socketConversation._id);
    } else if (!isConnected) {
      console.warn("Socket not connected, conversation will be joined when connected");
    } else if (!socketConversation._id) {
      console.error("No conversation ID available for joining");
    }
  };

  const renderSidebarContent = () => {
    switch (activeView) {
      case "chat":
        return (
          <ConversationList
            activeConversationId={selectedConversation?._id}
            onConversationSelect={handleConversationSelect}
            currentUser={currentUser}
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
                {/* Socket connection status */}
                {activeView === "chat" && (
                  <span 
                    style={{ 
                      marginLeft: 8, 
                      fontSize: 12,
                      color: isConnected ? '#52c41a' : '#ff4d4f',
                      fontWeight: 'normal' 
                    }}
                  >
                    {isConnected ? '• Online' : '• Offline'}
                  </span>
                )}
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
