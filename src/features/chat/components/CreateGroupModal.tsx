"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Avatar,
  List,
  Upload,
  message,
  Spin,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { UserAvatar } from "@/components/UserAvatar";
import { getFriends } from "@/features/friend/service";
import { createGroup } from "../service";
import type { CreateGroupRequest } from "../service";
import type { User } from "@/features/friend/service";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface CreateGroupModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (groupId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { user: currentUser } = useSelector((state: RootState) => state.user);
  const [loading, setLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load friends when modal opens and reset form when modal closes
  useEffect(() => {
    if (visible) {
      loadFriends();
    } else {
      // Avoid calling form.resetFields() here to prevent "useForm instance is not connected" warning
      setSelectedMembers([]);
      setFilteredFriends([]);
      setSearchQuery("");
      setFriends([]);
    }
  }, [visible]);

  // Load friends function
  const loadFriends = async () => {
    try {
      setFriendsLoading(true);
      const friendsList = await getFriends();
      setFriends(friendsList);
      setFilteredFriends(friendsList);
    } catch (error) {
      console.error("Load friends failed:", error);
      message.error("Không thể tải danh sách bạn bè");
    } finally {
      setFriendsLoading(false);
    }
  };

  // Filter friends locally with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        const filtered = friends.filter(friend => {
          const fullName = `${friend.firstname} ${friend.lastname}`.toLowerCase();
          const username = friend.username.toLowerCase();
          const email = friend.email.toLowerCase();
          const query = searchQuery.toLowerCase();
          
          return (
            fullName.includes(query) || 
            username.includes(query) || 
            email.includes(query)
          ) && !selectedMembers.some(member => member.id === friend.id);
        });
        setFilteredFriends(filtered);
      } else {
        // Show all friends except selected ones
        const filtered = friends.filter(
          friend => !selectedMembers.some(member => member.id === friend.id)
        );
        setFilteredFriends(filtered);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, friends, selectedMembers]);

  const handleAddMember = (user: User) => {
    if (!selectedMembers.some(member => member.id === user.id)) {
      setSelectedMembers([...selectedMembers, user]);
      // The filtering will be handled by the useEffect above
    }
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(member => member.id !== userId));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (selectedMembers.length < 2) {
        message.error("Nhóm phải có ít nhất 3 thành viên (bao gồm bạn)");
        return;
      }

      setLoading(true);

      const payload: CreateGroupRequest = {
        name: values.groupName,
        participantIds: selectedMembers.map(member => member.id),
        avatar: values.avatar?.file?.response?.url, // If avatar upload is implemented
      };

      const result = await createGroup(payload);
      message.success("Tạo nhóm thành công!");
      onSuccess(result._id);
    } catch (error: any) {
      console.error("Create group failed:", error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("Tạo nhóm thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TeamOutlined />
          Tạo nhóm chat mới
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button
          key="create"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          disabled={selectedMembers.length < 2}
        >
          Tạo nhóm
        </Button>,
      ]}
      width={600}
      maskClosable={false}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="groupName"
          label="Tên nhóm"
          rules={[
            { required: true, message: "Vui lòng nhập tên nhóm" },
            { min: 2, message: "Tên nhóm phải có ít nhất 2 ký tự" },
            { max: 50, message: "Tên nhóm không được quá 50 ký tự" },
          ]}
        >
          <Input
            placeholder="Nhập tên nhóm..."
            prefix={<TeamOutlined />}
            maxLength={50}
          />
        </Form.Item>

        <Form.Item label="Thêm thành viên từ danh sách bạn bè">
          <Input
            placeholder="Tìm kiếm trong danh sách bạn bè..."
            prefix={<UserOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            suffix={friendsLoading && <Spin size="small" />}
          />
          
          {friendsLoading ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <Spin size="large" />
              <div style={{ marginTop: 8, color: "#666" }}>Đang tải danh sách bạn bè...</div>
            </div>
          ) : friends.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "#666" }}>
              Bạn chưa có bạn bè nào. Hãy kết bạn trước khi tạo nhóm!
            </div>
          ) : filteredFriends.length > 0 ? (
            <div
              style={{
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                marginTop: 8,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              <List
                size="small"
                dataSource={filteredFriends}
                renderItem={(user) => (
                    <List.Item
                      style={{ 
                        padding: "12px 16px", 
                        cursor: "pointer",
                        borderRadius: 8,
                        transition: "all 0.2s",
                      }}
                      className="hover:bg-gray-50"
                      onClick={() => handleAddMember(user)}
                      actions={[
                        <Button
                          key="add"
                          type="link"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddMember(user);
                          }}
                          style={{ color: "#1890ff" }}
                        />,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <UserAvatar
                            user={{
                              id: user.id,
                              username: user.username,
                              firstname: user.firstname,
                              lastname: user.lastname,
                              avatarUrl: user.avatarUrl,
                            }}
                            size={40}
                          />
                        }
                        title={
                          <div style={{ fontWeight: 500, fontSize: 14 }}>
                            {`${user.firstname} ${user.lastname}`.trim()}
                          </div>
                        }
                        description={
                          <div style={{ color: "#666", fontSize: 12 }}>
                            @{user.username} • {user.email}
                          </div>
                        }
                      />
                    </List.Item>
                )}
              />
            </div>
          ) : searchQuery.trim() ? (
            <div style={{ textAlign: "center", padding: 20, color: "#666" }}>
              Không tìm thấy bạn bè nào phù hợp với "{searchQuery}"
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 20, color: "#666" }}>
              Tất cả bạn bè đã được thêm vào nhóm
            </div>
          )}
        </Form.Item>

        {(selectedMembers.length > 0 || currentUser) && (
          <Form.Item label={`Thành viên nhóm (${selectedMembers.length + 1} thành viên)`}>
            <div
              style={{
                border: "1px solid #d9d9d9",
                borderRadius: 8,
                padding: 12,
                maxHeight: 250,
                overflowY: "auto",
                backgroundColor: "#fafafa",
              }}
            >
              <List
                size="small"
                dataSource={[
                  // Current user as admin
                  ...(currentUser ? [{
                    id: currentUser.id,
                    username: currentUser.username,
                    firstname: currentUser.firstname,
                    lastname: currentUser.lastname,
                    email: currentUser.email,
                    avatarUrl: currentUser.avatarUrl,
                    isCurrentUser: true,
                  }] : []),
                  // Selected members
                  ...selectedMembers.map(member => ({ ...member, isCurrentUser: false }))
                ]}
                renderItem={(member) => (
                  <List.Item
                    style={{ 
                      padding: "8px 12px",
                      backgroundColor: member.isCurrentUser ? "#e6f7ff" : "transparent",
                      borderRadius: 6,
                      marginBottom: 4,
                    }}
                    actions={[
                      member.isCurrentUser ? (
                        <div key="admin" style={{ color: "#1890ff", fontSize: 12, fontWeight: 500 }}>
                          👑 Nhóm trưởng
                        </div>
                      ) : (
                        <Button
                          key="remove"
                          type="link"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveMember(member.id)}
                        />
                      ),
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <UserAvatar
                          user={{
                            id: member.id,
                            username: member.username,
                            firstname: member.firstname,
                            lastname: member.lastname,
                            avatarUrl: member.avatarUrl,
                          }}
                          size={36}
                        />
                      }
                      title={
                        <div style={{ 
                          fontWeight: member.isCurrentUser ? 600 : 500, 
                          fontSize: 14,
                          color: member.isCurrentUser ? "#1890ff" : "inherit"
                        }}>
                          {`${member.firstname} ${member.lastname}`.trim()}
                          {member.isCurrentUser && " (Bạn)"}
                        </div>
                      }
                      description={
                        <div style={{ color: "#666", fontSize: 12 }}>
                          @{member.username}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
            
            {selectedMembers.length < 2 && (
              <div style={{ 
                color: "#ff4d4f", 
                fontSize: 12, 
                marginTop: 8,
                padding: "8px 12px",
                backgroundColor: "#fff2f0",
                borderRadius: 6,
                border: "1px solid #ffccc7"
              }}>
                ⚠️ Cần ít nhất 2 thành viên nữa để tạo nhóm (hiện tại: {selectedMembers.length + 1}/3)
              </div>
            )}
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
