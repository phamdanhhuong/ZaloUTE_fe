"use client";

import React from "react";
import { List, Avatar, Button, Card, Empty, Spin, Badge } from "antd";
import { 
  UserOutlined, 
  UserAddOutlined, 
  TeamOutlined, 
  CloseOutlined,
  CheckOutlined,
  UserDeleteOutlined
} from "@ant-design/icons";
import { useFriendRequest } from "../hooks";
import type { FriendRequest, User } from "../service";

interface FriendRequestsProps {
  onViewProfile?: (user: User) => void;
}

export const FriendRequests: React.FC<FriendRequestsProps> = ({ onViewProfile }) => {
  const {
    loading,
    sentRequests,
    receivedRequests,
    handleAcceptRequest,
    handleRejectRequest,
  } = useFriendRequest();

  const getDisplayName = (user: User) => {
    return `${user.firstname} ${user.lastname}`.trim() || user.username;
  };

  const getAvatarText = (user: User) => {
    const name = getDisplayName(user);
    return name.charAt(0).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Navigation Menu
  const NavMenu = () => (
    <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 8,
            borderRadius: 8,
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <TeamOutlined style={{ width: 20, height: 20, color: "#6b7280" }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
            Danh sách bạn bè
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 8,
            borderRadius: 8,
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <TeamOutlined style={{ width: 20, height: 20, color: "#6b7280" }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
            Danh sách nhóm và cộng đồng
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 8,
            backgroundColor: "#dbeafe",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          <UserAddOutlined style={{ width: 20, height: 20, color: "#0084ff" }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#0084ff" }}>
            Lời mời kết bạn
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 8,
            borderRadius: 8,
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <TeamOutlined style={{ width: 20, height: 20, color: "#6b7280" }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
            Lời mời vào nhóm và cộng đồng
          </span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div>
        <NavMenu />
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin tip="Đang tải..." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavMenu />
      
      <div style={{ padding: 16 }}>
        {/* Received Friend Requests */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", marginBottom: 12 }}>
            Lời mời đã nhận ({receivedRequests.length})
          </h3>

          {receivedRequests.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {receivedRequests.map((request) => (
                <Card
                  key={request.id}
                  size="small"
                  style={{ backgroundColor: "#f9fafb" }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <Avatar 
                      size={48} 
                      style={{ backgroundColor: "#0084ff" }}
                    >
                      {getAvatarText(request.sender)}
                    </Avatar>

                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between",
                        marginBottom: 4 
                      }}>
                        <h4 style={{ margin: 0, fontWeight: 500, color: "#111827" }}>
                          {getDisplayName(request.sender)}
                        </h4>
                        <Button
                          type="text"
                          size="small"
                          icon={<CloseOutlined />}
                          onClick={() => handleRejectRequest(request.id)}
                          style={{ width: 24, height: 24 }}
                        />
                      </div>

                      <p style={{ 
                        fontSize: 12, 
                        color: "#6b7280", 
                        marginBottom: 8 
                      }}>
                        {formatDate(request.createdAt)} - Từ tìm kiếm
                      </p>

                      <p style={{ 
                        fontSize: 14, 
                        color: "#374151", 
                        marginBottom: 12 
                      }}>
                        Muốn kết bạn với bạn
                      </p>

                      <div style={{ display: "flex", gap: 8 }}>
                        <Button
                          style={{ 
                            flex: 1, 
                            backgroundColor: "transparent",
                            color: "#6b7280",
                            borderColor: "#d1d5db" 
                          }}
                          onClick={() => handleRejectRequest(request.id)}
                          icon={<UserDeleteOutlined />}
                        >
                          Từ chối
                        </Button>
                        <Button
                          type="primary"
                          style={{ flex: 1 }}
                          onClick={() => handleAcceptRequest(request.id)}
                          icon={<CheckOutlined />}
                        >
                          Đồng ý
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty 
              description="Không có lời mời kết bạn nào"
              style={{ padding: "20px 0" }}
            />
          )}
        </div>

        {/* Sent Friend Requests */}
        {sentRequests.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", marginBottom: 12 }}>
              Lời mời đã gửi ({sentRequests.length})
            </h3>

            <List
              dataSource={sentRequests}
              renderItem={(request) => (
                <List.Item
                  actions={[
                    onViewProfile && (
                      <Button
                        key="profile"
                        type="text"
                        icon={<UserOutlined />}
                        onClick={() => onViewProfile(request.receiver)}
                        size="small"
                      >
                        Xem hồ sơ
                      </Button>
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge 
                        count="Đã gửi" 
                        style={{ backgroundColor: "#faad14" }}
                        offset={[-5, 5]}
                      >
                        <Avatar size={40} style={{ backgroundColor: "#0084ff" }}>
                          {getAvatarText(request.receiver)}
                        </Avatar>
                      </Badge>
                    }
                    title={getDisplayName(request.receiver)}
                    description={
                      <div>
                        <div>@{request.receiver.username}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          Gửi lúc: {formatDate(request.createdAt)}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}

        {/* Suggested Friends - Mock data for demo */}
        <div>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            marginBottom: 12 
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", margin: 0 }}>
              Gợi ý kết bạn (2)
            </h3>
            <Button 
              type="text" 
              style={{ color: "#0084ff" }}
              size="small"
            >
              Xem tất cả →
            </Button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { id: "1", name: "Nguyễn Văn A", username: "nguyenvana", mutualFriends: 5 },
              { id: "2", name: "Trần Thị B", username: "tranthib", mutualFriends: 3 },
            ].map((suggestion) => (
              <div
                key={suggestion.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: 8,
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Avatar size={40} style={{ backgroundColor: "#d1d5db", color: "#6b7280" }}>
                  {suggestion.name.charAt(0)}
                </Avatar>

                <div style={{ flex: 1 }}>
                  <h4 style={{ 
                    margin: "0 0 4px 0", 
                    fontSize: 14, 
                    fontWeight: 500, 
                    color: "#111827" 
                  }}>
                    {suggestion.name}
                  </h4>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                    {suggestion.mutualFriends} bạn chung
                  </p>
                </div>

                <Button
                  size="small"
                  style={{
                    color: "#0084ff",
                    borderColor: "#0084ff",
                    backgroundColor: "transparent",
                  }}
                >
                  Kết bạn
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendRequests;

