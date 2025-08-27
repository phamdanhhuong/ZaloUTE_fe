"use client";

import React, { useState } from "react";
import { List, Avatar, Button, Input, Select, Popconfirm, Empty, Spin } from "antd";
import { 
  SearchOutlined, 
  UserOutlined, 
  DeleteOutlined, 
  MessageOutlined,
  SortAscendingOutlined 
} from "@ant-design/icons";
import { useFriends } from "../hooks";
import type { Friend, User } from "../service";
import styles from "./FriendsList.module.css";

interface FriendsListProps {
  onChatWithFriend?: (friend: User) => void;
  onViewProfile?: (friend: User) => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({
  onChatWithFriend,
  onViewProfile,
}) => {
  const { loading, friends, handleRemoveFriend } = useFriends();
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date">("name");

  const getDisplayName = (user: User) => {
    return `${user.firstname} ${user.lastname}`.trim() || user.username;
  };

  const getAvatarText = (user: User) => {
    const name = getDisplayName(user);
    return name.charAt(0).toUpperCase();
  };

  // Lọc và sắp xếp danh sách bạn bè
  const filteredAndSortedFriends = React.useMemo(() => {
    let filtered = friends.filter((friend) => {
      const name = getDisplayName(friend.friend).toLowerCase();
      const username = friend.friend.username.toLowerCase();
      const email = friend.friend.email.toLowerCase();
      const search = searchText.toLowerCase();
      
      return name.includes(search) || username.includes(search) || email.includes(search);
    });

    // Sắp xếp
    if (sortBy === "name") {
      filtered.sort((a, b) => {
        const nameA = getDisplayName(a.friend).toLowerCase();
        const nameB = getDisplayName(b.friend).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      filtered.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return filtered;
  }, [friends, searchText, sortBy]);

  // Nhóm bạn bè theo chữ cái đầu
  const groupedFriends = React.useMemo(() => {
    const groups: { [key: string]: Friend[] } = {};
    
    filteredAndSortedFriends.forEach((friend) => {
      const firstLetter = getDisplayName(friend.friend).charAt(0).toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(friend);
    });

    return Object.keys(groups)
      .sort()
      .map((letter) => ({
        letter,
        friends: groups[letter],
      }));
  }, [filteredAndSortedFriends]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          Bạn bè ({friends.length})
        </h2>

        {/* Search and Filter */}
        <div className={styles.searchContainer}>
          <Input
            placeholder="Tìm bạn..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterControls}>
          <Select
            value={sortBy}
            onChange={setSortBy}
            className={styles.filterSelect}
            size="small"
          >
            <Select.Option value="name">
              <SortAscendingOutlined /> Tên (A-Z)
            </Select.Option>
            <Select.Option value="date">Mới kết bạn</Select.Option>
          </Select>

          <span className={styles.resultCount}>
            {filteredAndSortedFriends.length} kết quả
          </span>
        </div>
      </div>

      {/* Friends List */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <Spin tip="Đang tải danh sách bạn bè..." />
        </div>
      ) : groupedFriends.length > 0 ? (
        <div className={styles.scrollContainer}>
          {groupedFriends.map(({ letter, friends: groupFriends }) => (
            <div key={letter} className={styles.groupSection}>
              {/* Section Header */}
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  {letter}
                </h3>
              </div>

              {/* Friends in Section */}
              <List
                dataSource={groupFriends}
                renderItem={(friend) => (
                  <List.Item
                    actions={[
                      onChatWithFriend && (
                        <Button
                          key="chat"
                          type="text"
                          icon={<MessageOutlined />}
                          onClick={() => onChatWithFriend(friend.friend)}
                          size="small"
                          className={`${styles.actionButton} ${styles.chat}`}
                        >
                          Nhắn tin
                        </Button>
                      ),
                      onViewProfile && (
                        <Button
                          key="profile"
                          type="text"
                          icon={<UserOutlined />}
                          onClick={() => onViewProfile(friend.friend)}
                          size="small"
                          className={`${styles.actionButton} ${styles.profile}`}
                        >
                          Hồ sơ
                        </Button>
                      ),
                      <Popconfirm
                        key="remove"
                        title="Hủy kết bạn"
                        description="Bạn có chắc chắn muốn hủy kết bạn?"
                        onConfirm={() => handleRemoveFriend(friend.id)}
                        okText="Xác nhận"
                        cancelText="Hủy"
                      >
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                          className={`${styles.actionButton} ${styles.remove}`}
                        >
                          Hủy kết bạn
                        </Button>
                      </Popconfirm>,
                    ].filter(Boolean)}
                    className={styles.friendItem}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar size={40} className={styles.friendAvatar}>
                          {getAvatarText(friend.friend)}
                        </Avatar>
                      }
                      title={getDisplayName(friend.friend)}
                      description={`@${friend.friend.username}`}
                    />
                  </List.Item>
                )}
              />
            </div>
          ))}
        </div>
      ) : (
        <Empty 
          description={searchText ? "Không tìm thấy bạn bè nào" : "Chưa có bạn bè"} 
        />
      )}
    </div>
  );
};

export default FriendsList;

