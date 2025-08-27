"use client";

import React, { useState, useEffect } from "react";
import { Avatar, List, Button, Input, Empty, Spin } from "antd";
import { SearchOutlined, EllipsisOutlined } from "@ant-design/icons";
import type { User } from "../service";
import styles from "./ListFriend.module.css";

interface ListFriendProps {
  friends: User[];
  loading?: boolean;
  onChatWithFriend?: (friend: User) => void;
  onViewProfile?: (friend: User) => void;
}

interface GroupedFriends {
  [key: string]: User[];
}

export const ListFriend: React.FC<ListFriendProps> = ({
  friends = [], // Default empty array
  loading = false,
  onChatWithFriend,
  onViewProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFriends, setFilteredFriends] = useState<User[]>(friends);
  const [groupedFriends, setGroupedFriends] = useState<GroupedFriends>({});

  const getDisplayName = (user: User) => {
    return `${user.firstname} ${user.lastname}`.trim() || user.username;
  };

  const getAvatarText = (user: User) => {
    const name = getDisplayName(user);
    return name.charAt(0).toUpperCase();
  };

  // Lọc và nhóm bạn bè theo chữ cái đầu
  useEffect(() => {
    // Đảm bảo friends là array trước khi xử lý
    if (!Array.isArray(friends)) {
      setFilteredFriends([]);
      setGroupedFriends({});
      return;
    }

    let filtered = friends;

    if (searchTerm) {
      filtered = friends.filter((friend) => {
        const name = getDisplayName(friend).toLowerCase();
        const username = friend.username.toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search) || username.includes(search);
      });
    }

    // Nhóm theo chữ cái đầu
    const grouped: GroupedFriends = {};
    filtered.forEach((friend) => {
      const firstLetter = getDisplayName(friend).charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(friend);
    });

    // Sắp xếp bạn bè trong mỗi nhóm theo tên
    Object.keys(grouped).forEach((letter) => {
      grouped[letter].sort((a, b) =>
        getDisplayName(a).localeCompare(getDisplayName(b))
      );
    });

    setFilteredFriends(filtered);
    setGroupedFriends(grouped);
  }, [friends, searchTerm]);

  const handleFriendClick = (friend: User) => {
    if (onChatWithFriend) {
      onChatWithFriend(friend);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large">
          <div style={{ padding: "20px", textAlign: "center" }}>
            Đang tải danh sách bạn bè...
          </div>
        </Spin>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Search Bar */}
      <div className={styles.searchContainer}>
        <Input
          placeholder="Tìm bạn..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Friend Count */}
      <div className={styles.friendCount}>
        Bạn bè ({filteredFriends.length})
      </div>

      {/* Friends List */}
      {filteredFriends.length === 0 ? (
        <Empty
          description={searchTerm ? "Không tìm thấy bạn bè" : "Chưa có bạn bè"}
          className={styles.emptyState}
        />
      ) : (
        <div className={styles.friendsList}>
          {Object.keys(groupedFriends)
            .sort()
            .map((letter) => (
              <div key={letter} className={styles.letterGroup}>
                {/* Letter Header */}
                <div className={styles.letterHeader}>{letter}</div>

                {/* Friends in this letter group */}
                <List
                  dataSource={groupedFriends[letter]}
                  renderItem={(friend) => (
                    <List.Item
                      className={styles.friendItem}
                      onClick={() => handleFriendClick(friend)}
                      actions={[
                        <Button
                          key="more"
                          type="text"
                          icon={<EllipsisOutlined />}
                          className={styles.moreButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onViewProfile) {
                              onViewProfile(friend);
                            }
                          }}
                        />,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            size={44}
                            className={styles.friendAvatar}
                            style={{
                              backgroundColor: `hsl(${
                                (Number(friend.id) * 137.5) % 360
                              }, 70%, 50%)`,
                            }}
                          >
                            {getAvatarText(friend)}
                          </Avatar>
                        }
                        title={
                          <div className={styles.friendName}>
                            {getDisplayName(friend)}
                          </div>
                        }
                        description={
                          <div className={styles.friendStatus}>
                            @{friend.username}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ListFriend;
