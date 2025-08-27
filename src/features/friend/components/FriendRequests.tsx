"use client";

import React, { useState } from "react";
import { Avatar, Button, Empty, Spin } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import type { User } from "../service";
import { useFriendRequests } from "../hooks";
import styles from "./FriendRequests.module.css";

interface FriendRequestsProps {
  onAcceptRequest?: (friendshipId: string) => void;
  onRejectRequest?: (friendshipId: string) => void;
}

export const FriendRequests: React.FC<FriendRequestsProps> = ({
  onAcceptRequest: onAcceptCallback,
  onRejectRequest: onRejectCallback,
}) => {
  const { loading, requests, handleAcceptRequest, handleRejectRequest } =
    useFriendRequests();

  const [processingRequests, setProcessingRequests] = useState<Set<string>>(
    new Set()
  );

  const getDisplayName = (user: User) => {
    return `${user.firstname} ${user.lastname}`.trim() || user.username;
  };

  const getAvatarText = (user: User) => {
    const name = getDisplayName(user);
    return name.charAt(0).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  const handleAccept = async (friendshipId: string) => {
    setProcessingRequests((prev) => new Set(prev).add(friendshipId));
    try {
      await handleAcceptRequest(friendshipId);
      onAcceptCallback?.(friendshipId);
    } catch (error) {
      // Error handled in hook
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(friendshipId);
        return newSet;
      });
    }
  };

  const handleReject = async (friendshipId: string) => {
    setProcessingRequests((prev) => new Set(prev).add(friendshipId));
    try {
      await handleRejectRequest(friendshipId);
      onRejectCallback?.(friendshipId);
    } catch (error) {
      // Error handled in hook
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(friendshipId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className={styles.friendRequestsContainer}>
        <Empty
          description="Không có lời mời kết bạn nào"
          className={styles.emptyContainer}
        />
      </div>
    );
  }

  return (
    <div className={styles.friendRequestsContainer}>
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>
          Lời mời kết bạn ({requests.length})
        </h3>
      </div>

      <div>
        {requests.map((request) => (
          <div key={request.friendshipId} className={styles.requestItem}>
            <div className={styles.userInfo}>
              <Avatar
                size={48}
                className={styles.avatar}
                style={{ backgroundColor: "#1890ff" }}
              >
                {getAvatarText(request.requester)}
              </Avatar>

              <div className={styles.userDetails}>
                <div className={styles.userName}>
                  {getDisplayName(request.requester)}
                </div>
                <div className={styles.username}>
                  @{request.requester.username}
                </div>
                <div className={styles.requestDate}>
                  Gửi lời mời {formatDate(request.createdAt)}
                </div>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="small"
                loading={processingRequests.has(request.friendshipId)}
                disabled={processingRequests.has(request.friendshipId)}
                onClick={() => handleAccept(request.friendshipId)}
                className={styles.acceptButton}
              >
                Chấp nhận
              </Button>

              <Button
                danger
                icon={<CloseOutlined />}
                size="small"
                loading={processingRequests.has(request.friendshipId)}
                disabled={processingRequests.has(request.friendshipId)}
                onClick={() => handleReject(request.friendshipId)}
                className={styles.rejectButton}
              >
                Từ chối
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendRequests;
