"use client";

import React, { useState } from "react";
import { Input, Button, List, Avatar, Spin, Empty } from "antd";
import { SearchOutlined, UserAddOutlined } from "@ant-design/icons";
import { useFriendSearch, useFriendRequest } from "../hooks";
import type { User } from "../service";
import styles from "./UserSearch.module.css";

interface UserSearchProps {
  onUserSelect?: (user: User) => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ onUserSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { loading: searchLoading, users, handleSearch, clearResults } = useFriendSearch();
  const { loading: requestLoading, handleSendRequest } = useFriendRequest();

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) {
      clearResults();
      return;
    }

    // Kiểm tra xem là email hay username
    const isEmail = searchQuery.includes("@");
    handleSearch({
      [isEmail ? "email" : "username"]: searchQuery.trim(),
      limit: 10,
    });
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
          <Spin tip="Đang tìm kiếm..." />
        </div>
      ) : users.length > 0 ? (
        <List
          dataSource={users}
          className={styles.userList}
          renderItem={(user) => (
            <List.Item
              actions={[
                <Button
                  key="add"
                  type="primary"
                  icon={<UserAddOutlined />}
                  loading={requestLoading}
                  onClick={() => handleSendRequest(user.id)}
                  size="small"
                  className={`${styles.actionButton} ${styles.primary}`}
                >
                  Kết bạn
                </Button>,
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
                    <div className={styles.email}>
                      {user.email}
                    </div>
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

