import React, { useState } from "react";
import { Avatar, Card, Button, Space, Typography } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  ReloadOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/store/hooks";
import { useProfile } from "../hooks";
import { EditProfileForm } from "./EditProfileForm";
import { UpdateProfileRequest } from "../service";

const { Text, Title } = Typography;

export const UserProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { user, userFullName, isAuthenticated, logout } = useAuth();
  const { refreshing, refreshProfile, updating, updateProfile } = useProfile();

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveProfile = async (data: UpdateProfileRequest) => {
    await updateProfile(data);
    setIsEditing(false); // Tự động thoát edit mode sau khi save thành công
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Card
      title="Thông tin người dùng"
      style={{ maxWidth: 400, margin: "20px auto" }}
      actions={[
        <Button
          key="edit"
          type="default"
          icon={<EditOutlined />}
          onClick={handleEditClick}
          disabled={isEditing || updating}
        >
          Chỉnh sửa
        </Button>,
        <Button
          key="refresh"
          type="default"
          icon={<ReloadOutlined />}
          onClick={refreshProfile}
          loading={refreshing}
          disabled={isEditing}
        >
          Làm mới
        </Button>,
        <Button
          key="logout"
          type="primary"
          danger
          icon={<LogoutOutlined />}
          onClick={logout}
          disabled={isEditing || updating}
        >
          Đăng xuất
        </Button>,
      ]}
    >
      {isEditing ? (
        <EditProfileForm
          user={user}
          onSave={handleSaveProfile}
          onCancel={handleCancelEdit}
          loading={updating}
        />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Avatar size={64} icon={<UserOutlined />} />
          </div>

          <div>
            <Title level={4} style={{ margin: 0 }}>
              {userFullName}
            </Title>
            <Text type="secondary">@{user.username}</Text>
          </div>

          <div>
            <Text strong>Email: </Text>
            <Text>{user.email}</Text>
          </div>

          <div>
            <Text strong>Điện thoại: </Text>
            <Text>{user.phone}</Text>
          </div>

          <div>
            <Text strong>Trạng thái: </Text>
            <Text type={user.isActive ? "success" : "danger"}>
              {user.isActive
                ? "Đã kích hoạt tài khoản"
                : "Tài khoản chưa được kích hoạt"}
            </Text>
          </div>

          <div>
            <Text strong>Ngày tham gia: </Text>
            <Text>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</Text>
          </div>
        </Space>
      )}
    </Card>
  );
};
