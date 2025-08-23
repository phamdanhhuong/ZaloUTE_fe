import React from "react";
import { Avatar, Card, Button, Space, Typography } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuth } from "@/store/hooks";

const { Text, Title } = Typography;

export const UserProfile: React.FC = () => {
  const { user, userFullName, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Card
      title="Thông tin người dùng"
      style={{ maxWidth: 400, margin: "20px auto" }}
      actions={[
        <Button
          key="logout"
          type="primary"
          danger
          icon={<LogoutOutlined />}
          onClick={logout}
        >
          Đăng xuất
        </Button>,
      ]}
    >
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
    </Card>
  );
};
