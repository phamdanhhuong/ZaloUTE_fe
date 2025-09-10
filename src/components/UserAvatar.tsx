import React from "react";
import { Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";

interface UserAvatarProps {
  user: {
    avatarUrl?: string;
    firstname?: string;
    lastname?: string;
    username: string;
    id?: string;
  };
  size?: number | "small" | "default" | "large";
  className?: string;
  style?: React.CSSProperties;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = "default",
  className,
  style,
}) => {
  const getDisplayName = () => {
    return `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.username;
  };

  const getAvatarText = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  const getColorFromId = () => {
    if (!user.id) return "#1890ff";
    return `hsl(${(Number(user.id) * 137.5) % 360}, 70%, 50%)`;
  };

  if (user.avatarUrl) {
    return (
      <Avatar
        src={user.avatarUrl}
        size={size}
        className={className}
        style={style}
      />
    );
  }

  return (
    <Avatar
      size={size}
      className={className}
      style={{
        backgroundColor: getColorFromId(),
        ...style,
      }}
      icon={!getDisplayName() ? <UserOutlined /> : undefined}
    >
      {getDisplayName() ? getAvatarText() : undefined}
    </Avatar>
  );
};

export default UserAvatar;




