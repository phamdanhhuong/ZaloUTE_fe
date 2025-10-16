"use client";

import React, { useState, useEffect } from "react";
import { List, Button, Input, Empty, Spin, Badge, Avatar } from "antd";
import { SearchOutlined, EllipsisOutlined, TeamOutlined, CrownOutlined } from "@ant-design/icons";
// Define GroupItem interface locally
interface GroupItem {
  id: string;
  name: string;
  avatar?: string;
  memberCount: number;
  isAdmin?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
}
import styles from "./ListGroup.module.css";

interface ListGroupProps {
  groups: GroupItem[];
  loading?: boolean;
  onOpenGroup: (group: GroupItem) => void;
  onGroupSettings?: (group: GroupItem) => void;
}

interface GroupedGroups {
  [key: string]: GroupItem[];
}

export const ListGroup: React.FC<ListGroupProps> = ({
  groups = [],
  loading = false,
  onOpenGroup,
  onGroupSettings,
}) => {
  // ListGroup initialized
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredGroups, setFilteredGroups] = useState<GroupItem[]>(groups);
  const [groupedGroups, setGroupedGroups] = useState<GroupedGroups>({});

  // Lọc và nhóm nhóm theo chữ cái đầu
  useEffect(() => {
    if (!Array.isArray(groups)) {
      setFilteredGroups([]);
      setGroupedGroups({});
      return;
    }

    let filtered = groups;

    if (searchTerm) {
      filtered = groups.filter((group) => {
        const name = group.name.toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search);
      });
    }

    // Nhóm theo chữ cái đầu
    const grouped: GroupedGroups = {};
    filtered.forEach((group) => {
      const firstLetter = group.name.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(group);
    });

    // Sắp xếp nhóm trong mỗi nhóm theo tên
    Object.keys(grouped).forEach((letter) => {
      grouped[letter].sort((a, b) => a.name.localeCompare(b.name));
    });

    setFilteredGroups(filtered);
    setGroupedGroups(grouped);
  }, [groups, searchTerm]);

  const handleGroupClick = (group: GroupItem) => {
    if (onOpenGroup) {
      onOpenGroup(group);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large">
          <div style={{ padding: "20px", textAlign: "center" }}>
            Đang tải danh sách nhóm...
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
          placeholder="Tìm nhóm..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Group Count */}
      <div className={styles.groupCount}>
        Nhóm ({filteredGroups.length})
      </div>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <Empty
          description={searchTerm ? "Không tìm thấy nhóm" : "Chưa có nhóm chat nào"}
          className={styles.emptyState}
        />
      ) : (
        <div className={styles.groupsList}>
          {Object.keys(groupedGroups)
            .sort()
            .map((letter) => (
              <div key={letter} className={styles.letterGroup}>
                {/* Letter Header */}
                <div className={styles.letterHeader}>{letter}</div>

                {/* Groups in this letter group */}
                <List
                  dataSource={groupedGroups[letter]}
                  renderItem={(group) => (
                    <List.Item
                      className={styles.groupItem}
                      onClick={() => handleGroupClick(group)}
                      actions={[
                        <Button
                          key="more"
                          type="text"
                          icon={<EllipsisOutlined />}
                          className={styles.moreButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onGroupSettings) {
                              onGroupSettings(group);
                            }
                          }}
                        />,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge
                            count={group.memberCount}
                            size="small"
                            style={{ backgroundColor: "#52c41a" }}
                          >
                            <Avatar
                              size={44}
                              icon={!group.avatar ? <TeamOutlined /> : undefined}
                              src={group.avatar}
                              style={{ 
                                backgroundColor: "#1890ff",
                                border: group.avatar ? '2px solid #e6f7ff' : 'none'
                              }}
                              className={styles.groupAvatar}
                            >
                              {!group.avatar && group.name.charAt(0).toUpperCase()}
                            </Avatar>
                          </Badge>
                        }
                        title={
                          <div className={styles.groupName}>
                            {group.name}
                            {group.isAdmin && (
                              <CrownOutlined style={{ color: "#faad14", fontSize: 12, marginLeft: 4 }} />
                            )}
                          </div>
                        }
                        description={
                          <div className={styles.groupStatus}>
                            {group.memberCount} thành viên
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

export default ListGroup;
