"use client";

import React, { useState } from "react";
import { Input, Button, List, Avatar, Spin, Empty } from "antd";
import { SearchOutlined, UserAddOutlined } from "@ant-design/icons";
import { useFriendSearch, useSendFriendRequest } from "../hooks";
import type { User } from "../service";
import styles from "./UserSearch.module.css";

interface UserSearchProps {
  onUserSelect?: (user: User) => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ onUserSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSearchParams, setLastSearchParams] = useState<any>(null);
  const {
    loading: searchLoading,
    users,
    handleSearch,
    clearResults,
  } = useFriendSearch();
  const { loading: sendingRequest, handleSendRequest } = useSendFriendRequest();

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) {
      clearResults();
      setLastSearchParams(null);
      return;
    }

    // Kiểm tra xem là email hay username
    const isEmail = searchQuery.includes("@");
    const params = {
      [isEmail ? "email" : "username"]: searchQuery.trim(),
      limit: 10,
    };

    setLastSearchParams(params);
    handleSearch(params);
  };

  const handleSendFriendRequest = async (receiverId: string) => {
    try {
      await handleSendRequest(receiverId);
      // Refresh search results sau khi gửi friend request thành công
      if (lastSearchParams) {
        handleSearch(lastSearchParams);
      }
    } catch (error) {
      // Error đã được handle trong hook
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  const getDisplayName = (user: User) => {
    return `${user.firstname} ${user.lastname}`.trim() || user.username;
  };

  const getAvatarText = (user: User) => {
    const name = getDisplayName(user);
    return name.charAt(0).toUpperCase();
  };

  const getFriendshipStatusText = (user: User) => {
    if (user.isFriend && user.friendshipStatus === "accepted") {
      return "Đã là bạn bè";
    }
    if (user.friendshipStatus === "pending") {
      return "Đang chờ phản hồi";
    }
    return null;
  };

  const canSendFriendRequest = (user: User) => {
    return !user.isFriend && user.friendshipStatus !== "pending";
  };

  return (
    <div className={styles.container}>
      {/* Search Input */}
      <div className={styles.searchContainer}>
        <Input.Search
          placeholder="Tìm kiếm bằng email hoặc username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onSearch={handleSearchSubmit}
          onKeyPress={handleKeyPress}
          enterButton={<SearchOutlined />}
          loading={searchLoading}
          size="large"
          className={styles.searchInput}
        />
      </div>

      {/* Search Results */}
      {searchLoading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large">
            <div style={{ padding: "20px", textAlign: "center" }}>
              Đang tìm kiếm...
            </div>
          </Spin>
        </div>
      ) : users.length > 0 ? (
        <List
          dataSource={users}
          className={styles.userList}
          renderItem={(user) => (
            <List.Item
              actions={[
                // Chỉ hiển thị nút kết bạn nếu chưa là bạn bè và chưa gửi lời mời
                canSendFriendRequest(user) ? (
                  <Button
                    key="add"
                    type="primary"
                    icon={<UserAddOutlined />}
                    size="small"
                    loading={sendingRequest}
                    onClick={() => handleSendFriendRequest(user.id)}
                    className={`${styles.actionButton} ${styles.primary}`}
                  >
                    Kết bạn
                  </Button>
                ) : getFriendshipStatusText(user) ? (
                  <span key="status" className={styles.statusText}>
                    {getFriendshipStatusText(user)}
                  </span>
                ) : null,
                onUserSelect && (
                  <Button
                    key="view"
                    type="text"
                    onClick={() => onUserSelect(user)}
                    size="small"
                    className={`${styles.actionButton} ${styles.secondary}`}
                  >
                    Xem hồ sơ
                  </Button>
                ),
              ].filter(Boolean)}
              className={styles.userItem}
            >
              <List.Item.Meta
                avatar={
                  <Avatar size={48} className={styles.userAvatar}>
                    {getAvatarText(user)}
                  </Avatar>
                }
                title={getDisplayName(user)}
                description={
                  <div className={styles.userDescription}>
                    <div className={styles.username}>@{user.username}</div>
                    <div className={styles.email}>{user.email}</div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      ) : searchQuery ? (
        <Empty
          description="Không tìm thấy người dùng nào"
          className={styles.emptyState}
        />
      ) : null}
    </div>
  );
};

export default UserSearch;
