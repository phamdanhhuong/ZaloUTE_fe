import React, { useState } from "react";
import { Avatar, Card, Button, Space, Typography, Upload, message } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  ReloadOutlined,
  EditOutlined,
  CameraOutlined,
} from "@ant-design/icons";
import { UploadProps } from "antd";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/store/hooks";
import { useProfile } from "../hooks";
import { EditProfileForm } from "./EditProfileForm";
import { UpdateProfileRequest } from "../service";

const { Text, Title } = Typography;

export const UserProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { user, userFullName, isAuthenticated, logout } = useAuth();
  const { refreshing, refreshProfile, updating, updateProfile, uploading, uploadProfileAvatar } = useProfile();

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveProfile = async (data: UpdateProfileRequest) => {
    await updateProfile(data);
    setIsEditing(false); 
  };

  const handleAvatarUpload: UploadProps['customRequest'] = async (options) => {
    const { file } = options;
    try {
      await uploadProfileAvatar(file as File);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const beforeUpload = (file: File) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg';
    if (!isJpgOrPng) {
      message.error('Chỉ có thể upload file JPG/PNG!');
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Kích thước file phải nhỏ hơn 5MB!');
      return false;
    }
    return true;
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
          <div style={{ textAlign: "center", position: "relative" }}>
            <UserAvatar 
              user={user}
              size={64}
            />
            <Upload
              name="avatar"
              showUploadList={false}
              beforeUpload={beforeUpload}
              customRequest={handleAvatarUpload}
              disabled={uploading || isEditing || updating}
            >
              <Button
                type="text"
                icon={<CameraOutlined />}
                loading={uploading}
                disabled={isEditing || updating}
                style={{
                  position: "absolute",
                  bottom: -5,
                  right: "50%",
                  transform: "translateX(50%)",
                  minWidth: "auto",
                  padding: "4px 8px",
                  fontSize: "12px",
                  height: "auto",
                  border: "1px solid #d9d9d9",
                  borderRadius: "4px",
                  backgroundColor: "white"
                }}
              >
                {uploading ? "" : "Đổi"}
              </Button>
            </Upload>
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
