"use client";

import React from "react";
import { Modal, Descriptions, Avatar, Tag, Button, Spin } from "antd";
import { UserOutlined, MailOutlined, PhoneOutlined, CalendarOutlined } from "@ant-design/icons";
import { UserAvatar } from "@/components/UserAvatar";
import type { User } from "../service";
import styles from "./UserProfileModal.module.css";


interface UserProfileModalProps {
  visible: boolean;
  user: User | null;
  loading?: boolean;
  onClose: () => void;
  onSendFriendRequest?: (userId: string) => void;
  onUnfriend?: (userId: string) => void;
  currentUserId?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  visible,
  user,
  loading = false,
  onClose,
  onSendFriendRequest,
  onUnfriend,
  currentUserId,
}) => {
  if (!user) return null;

  const getDisplayName = (user: User) => {
    return `${user.firstname} ${user.lastname}`.trim() || user.username;
  };

  const getFriendshipStatus = () => {
    if (user.isFriend && user.friendshipStatus === "accepted") {
      return { status: "success", text: "Đã là bạn bè" };
    }
    if (user.friendshipStatus === "pending") {
      return { status: "warning", text: "Đang chờ phản hồi" };
    }
    return null;
  };

  const canSendFriendRequest = () => {
    return !user.isFriend && user.friendshipStatus !== "pending";
  };

  const canUnfriend = () => {
    return user.isFriend && user.friendshipStatus === "accepted";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Không có thông tin";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const friendshipStatus = getFriendshipStatus();

  return (
    <Modal
      title={
        <div className={styles.modalTitle}>
          <UserAvatar user={user} size={40} className={styles.titleAvatar} />
          <span className={styles.titleText}>Hồ sơ người dùng</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        canSendFriendRequest() && onSendFriendRequest && (
          <Button
            key="add-friend"
            type="primary"
            onClick={() => onSendFriendRequest(user.id)}
          >
            Kết bạn
          </Button>
        ),
        canUnfriend() && onUnfriend && (
          <Button
            key="unfriend"
            danger
            onClick={() => onUnfriend(user.id)}
          >
            Hủy kết bạn
          </Button>
        ),
      ].filter(Boolean)}
      width={600}
      className={styles.modal}
    >
      <Spin spinning={loading}>
        <div className={styles.modalContent}>
          {/* Avatar và thông tin cơ bản */}
          <div className={styles.userHeader}>
            <UserAvatar user={user} size={80} className={styles.userAvatar} />
            <div className={styles.userInfo}>
              <h3 className={styles.userName}>{getDisplayName(user)}</h3>
              <p className={styles.username}>@{user.username}</p>
              {friendshipStatus && (
                <Tag color={friendshipStatus.status} className={styles.statusTag}>
                  {friendshipStatus.text}
                </Tag>
              )}
            </div>
          </div>

          {/* Chi tiết thông tin */}
          <Descriptions
            title="Thông tin chi tiết"
            bordered
            column={1}
            className={styles.descriptions}
          >
            <Descriptions.Item
              label={
                <span className={styles.label}>
                  <MailOutlined className={styles.labelIcon} />
                  Email
                </span>
              }
            >
              {user.email}
            </Descriptions.Item>

            {user.phone && (
              <Descriptions.Item
                label={
                  <span className={styles.label}>
                    <PhoneOutlined className={styles.labelIcon} />
                    Số điện thoại
                  </span>
                }
              >
                {user.phone}
              </Descriptions.Item>
            )}

            <Descriptions.Item
              label={
                <span className={styles.label}>
                  <UserOutlined className={styles.labelIcon} />
                  Tên đầy đủ
                </span>
              }
            >
              {user.firstname} {user.lastname}
            </Descriptions.Item>

            <Descriptions.Item
              label={
                <span className={styles.label}>
                  <CalendarOutlined className={styles.labelIcon} />
                  Ngày tạo tài khoản
                </span>
              }
            >
              {formatDate(user.createdAt)}
            </Descriptions.Item>

            {user.friendsSince && (
              <Descriptions.Item
                label={
                  <span className={styles.label}>
                    <CalendarOutlined className={styles.labelIcon} />
                    Kết bạn từ
                  </span>
                }
              >
                {formatDate(user.friendsSince)}
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>
      </Spin>
    </Modal>
  );
};

export default UserProfileModal;
