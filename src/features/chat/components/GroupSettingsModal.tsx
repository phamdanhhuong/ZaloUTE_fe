"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Avatar,
  List,
  Tabs,
  Popconfirm,
  message,
  Select,
  Typography,
  Space,
  Divider,
  Spin,
  Upload,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  EditOutlined,
  DeleteOutlined,
  CrownOutlined,
  LogoutOutlined,
  PlusOutlined,
  SettingOutlined,
  CameraOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { UserAvatar } from "@/components/UserAvatar";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { getFriends } from "@/features/friend/service";
import {
  updateGroupName,
  addGroupMembers,
  removeGroupMember,
  transferGroupAdmin,
  leaveGroup,
  updateGroupAvatar,
  dissolveGroup,
} from "../service";
import type { Conversation } from "../service";
import type { User } from "@/features/friend/service";

const { Text, Title } = Typography;

interface GroupSettingsModalProps {
  visible: boolean;
  onCancel: () => void;
  conversation: Conversation | null;
  onConversationUpdate: (conversation: Conversation) => void;
  onLeaveGroup: () => void;
  onGroupDissolved?: () => void;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  visible,
  onCancel,
  conversation,
  onConversationUpdate,
  onLeaveGroup,
  onGroupDissolved,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { user: currentUser } = useSelector((state: RootState) => state.user);

  const isGroupAdmin = conversation?.groupAdmin?._id === currentUser?.id;
  const isGroupMember = conversation?.participants.some(p => p._id === currentUser?.id);

  // Reset form when modal opens
  useEffect(() => {
    if (visible && conversation) {
      form.setFieldsValue({
        groupName: conversation.name,
      });
    }
  }, [visible, conversation, form]);

  // Load friends when modal opens and conversation changes
  useEffect(() => {
    if (visible && conversation) {
      loadFriends();
    } else {
      setFriends([]);
      setFilteredFriends([]);
      setSearchQuery("");
    }
  }, [visible, conversation]);

  // Load friends function
  const loadFriends = async () => {
    try {
      setFriendsLoading(true);
      const friendsList = await getFriends();
      setFriends(friendsList);
      // Filter out current participants
      const availableFriends = friendsList.filter(
        friend => !conversation?.participants.some(p => p._id === friend.id)
      );
      setFilteredFriends(availableFriends);
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
          ) && !conversation?.participants.some(p => p._id === friend.id);
        });
        setFilteredFriends(filtered);
      } else {
        // Show all friends except current participants
        const filtered = friends.filter(
          friend => !conversation?.participants.some(p => p._id === friend.id)
        );
        setFilteredFriends(filtered);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, friends, conversation?.participants]);

  const handleUpdateGroupName = async () => {
    if (!conversation || !isGroupAdmin) return;

    try {
      const values = await form.validateFields(["groupName"]);
      setLoading(true);

      const updatedConversation = await updateGroupName(conversation._id, {
        name: values.groupName,
      });

      message.success("Đã cập nhật tên nhóm");
      onConversationUpdate(updatedConversation);
    } catch (error: any) {
      console.error("Update group name failed:", error);
      message.error("Không thể cập nhật tên nhóm");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (user: User) => {
    if (!conversation || !isGroupAdmin) return;

    try {
      setLoading(true);
      const updatedConversation = await addGroupMembers(conversation._id, {
        userIds: [user.id],
      });

      message.success(`Đã thêm ${user.firstname} ${user.lastname} vào nhóm`);
      onConversationUpdate(updatedConversation);
      // The filtering will be handled by useEffect
    } catch (error: any) {
      console.error("Add member failed:", error);
      message.error("Không thể thêm thành viên");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!conversation || !isGroupAdmin) return;

    try {
      setLoading(true);
      const updatedConversation = await removeGroupMember(conversation._id, userId);

      const removedUser = conversation.participants.find(p => p._id === userId);
      message.success(`Đã xóa ${removedUser?.firstname} ${removedUser?.lastname} khỏi nhóm`);
      onConversationUpdate(updatedConversation);
    } catch (error: any) {
      console.error("Remove member failed:", error);
      message.error("Không thể xóa thành viên");
    } finally {
      setLoading(false);
    }
  };

  const handleTransferAdmin = async (newAdminId: string) => {
    if (!conversation || !isGroupAdmin) return;

    try {
      setLoading(true);
      const updatedConversation = await transferGroupAdmin(conversation._id, {
        newAdminId,
      });

      const newAdmin = conversation.participants.find(p => p._id === newAdminId);
      message.success(`Đã chuyển quyền nhóm trưởng cho ${newAdmin?.firstname} ${newAdmin?.lastname}`);
      onConversationUpdate(updatedConversation);
    } catch (error: any) {
      console.error("Transfer admin failed:", error);
      message.error("Không thể chuyển quyền nhóm trưởng");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!conversation || !isGroupMember) return;

    if (isGroupAdmin) {
      message.warning("Bạn cần chuyển quyền nhóm trưởng trước khi rời nhóm");
      return;
    }

    try {
      setLoading(true);
      await leaveGroup(conversation._id);
      message.success("Đã rời khỏi nhóm");
      onLeaveGroup();
      onCancel();
    } catch (error: any) {
      console.error("Leave group failed:", error);
      message.error("Không thể rời khỏi nhóm");
    } finally {
      setLoading(false);
    }
  };

  const handleDissolveGroup = async () => {
    if (!conversation || !isGroupAdmin) return;

    try {
      setLoading(true);
      await dissolveGroup(conversation._id);
      message.success("Đã giải tán nhóm");
      onGroupDissolved?.();
      onCancel();
    } catch (error: any) {
      console.error("Dissolve group failed:", error);
      message.error("Không thể giải tán nhóm");
    } finally {
      setLoading(false);
    }
  };

  const compressImage = (file: File, maxWidth: number = 300, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarUpload = async (file: File) => {
    if (!conversation || !isGroupAdmin) return false;

    try {
      setAvatarUploading(true);
      
      // Compress image before upload
      const compressedBase64 = await compressImage(file, 300, 0.7);
      
      const updatedConversation = await updateGroupAvatar(conversation._id, {
        avatar: compressedBase64
      });
      
      message.success("Đã cập nhật avatar nhóm");
      onConversationUpdate(updatedConversation);
      return true;
    } catch (error: any) {
      console.error("Update group avatar failed:", error);
      if (error.response?.status === 413) {
        message.error("Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn");
      } else {
        message.error("Không thể cập nhật avatar nhóm");
      }
      return false;
    } finally {
      setAvatarUploading(false);
    }
  };

  const uploadProps = {
    name: 'avatar',
    showUploadList: false,
    beforeUpload: (file: File) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('Chỉ được upload file ảnh!');
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Ảnh phải nhỏ hơn 5MB!');
        return false;
      }
      handleAvatarUpload(file);
      return false; // Prevent default upload
    },
  };

  if (!conversation || conversation.type !== "group") {
    return null;
  }

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SettingOutlined />
          Cài đặt nhóm
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
      maskClosable={false}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: "info",
            label: "Thông tin nhóm",
            children: (
              <Form form={form} layout="vertical">
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
                    disabled={!isGroupAdmin}
                    suffix={
                      isGroupAdmin && (
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={handleUpdateGroupName}
                          loading={loading}
                        />
                      )
                    }
                  />
                </Form.Item>

                <Form.Item label="Avatar nhóm">
                  <Space direction="vertical" align="center" style={{ width: "100%" }}>
                    <Avatar
                      size={80}
                      icon={<TeamOutlined />}
                      src={conversation.avatar}
                      style={{ backgroundColor: "#1890ff" }}
                    />
                    {isGroupAdmin && (
                      <Upload {...uploadProps}>
                        <Button 
                          icon={<CameraOutlined />} 
                          loading={avatarUploading}
                          disabled={avatarUploading}
                        >
                          {avatarUploading ? "Đang tải lên..." : "Đổi avatar"}
                        </Button>
                      </Upload>
                    )}
                    {!isGroupAdmin && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Chỉ nhóm trưởng mới có thể đổi avatar
                      </Text>
                    )}
                  </Space>
                </Form.Item>

                <Form.Item label="Thông tin nhóm">
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text>
                      <TeamOutlined /> Số thành viên: {conversation.participants.length}
                    </Text>
                    <Text>
                      <CrownOutlined /> Nhóm trưởng: {conversation.groupAdmin?.firstname} {conversation.groupAdmin?.lastname}
                    </Text>
                    <Text type="secondary">
                      Tạo lúc: {new Date(conversation.createdAt).toLocaleString()}
                    </Text>
                  </Space>
                </Form.Item>

                {isGroupMember && (
                  <Form.Item>
                    <Space>
                      <Popconfirm
                        title={isGroupAdmin ? "Bạn cần chuyển quyền nhóm trưởng trước khi rời nhóm" : "Bạn có chắc muốn rời khỏi nhóm?"}
                        onConfirm={handleLeaveGroup}
                        disabled={isGroupAdmin}
                      >
                        <Button 
                          danger 
                          icon={<LogoutOutlined />}
                          disabled={isGroupAdmin}
                          loading={loading}
                        >
                          Rời khỏi nhóm
                        </Button>
                      </Popconfirm>
                      
                      {isGroupAdmin && (
                        <Popconfirm
                          title="Bạn có chắc muốn giải tán nhóm? Hành động này không thể hoàn tác!"
                          onConfirm={handleDissolveGroup}
                          okText="Giải tán"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button 
                            danger 
                            type="primary"
                            icon={<DeleteOutlined />}
                            loading={loading}
                          >
                            Giải tán nhóm
                          </Button>
                        </Popconfirm>
                      )}
                    </Space>
                  </Form.Item>
                )}
              </Form>
            ),
          },
          {
            key: "members",
            label: `Thành viên (${conversation.participants.length})`,
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <List
                    dataSource={conversation.participants}
                    renderItem={(participant) => (
                      <List.Item
                        actions={
                          isGroupAdmin && participant._id !== currentUser?.id
                            ? [
                              <Popconfirm
                                  key="transfer"
                                  title="Chuyển quyền nhóm trưởng cho thành viên này?"
                                  onConfirm={() => handleTransferAdmin(participant._id)}
                                >
                                  <Button
                                    size="small"
                                    icon={<CrownOutlined />}
                                  >
                                    Chuyển quyền
                                  </Button>
                                </Popconfirm>,
                                <Popconfirm
                                  key="remove-confirm"
                                  title="Xóa thành viên khỏi nhóm?"
                                  onConfirm={() => handleRemoveMember(participant._id)}
                                >
                                  <Button
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                  >
                                    Xóa
                                  </Button>
                                </Popconfirm>,
                              ]
                            : []
                        }
                      >
                        <List.Item.Meta
                          avatar={
                            <UserAvatar
                              user={{
                                id: participant._id,
                                username: participant.username || "",
                                firstname: participant.firstname,
                                lastname: participant.lastname,
                                avatarUrl: participant.avatarUrl,
                              }}
                              size={48}
                            />
                          }
                          title={
                            <Space>
                              {participant.firstname} {participant.lastname}
                              {participant._id === conversation.groupAdmin?._id && (
                                <CrownOutlined style={{ color: "#faad14" }} />
                              )}
                              {participant._id === currentUser?.id && (
                                <Text type="secondary">(Bạn)</Text>
                              )}
                            </Space>
                          }
                          description={participant.email}
                        />
                      </List.Item>
                    )}
                  />
                </div>

                {isGroupAdmin && (
                  <>
                    <Divider orientation="left">Thêm thành viên</Divider>
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
                        Bạn chưa có bạn bè nào để thêm vào nhóm!
                      </div>
                    ) : filteredFriends.length > 0 ? (
                      <List
                        style={{ marginTop: 8, maxHeight: 200, overflowY: "auto" }}
                        size="small"
                        dataSource={filteredFriends}
                        renderItem={(user) => (
                          <List.Item
                            actions={[
                              <Button
                                key="add"
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => handleAddMember(user)}
                                loading={loading}
                              >
                                Thêm
                              </Button>,
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
                    ) : searchQuery.trim() ? (
                      <div style={{ textAlign: "center", padding: 20, color: "#666" }}>
                        Không tìm thấy bạn bè nào phù hợp với "{searchQuery}"
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: 20, color: "#666" }}>
                        Tất cả bạn bè đã có trong nhóm hoặc không có bạn bè nào để thêm
                      </div>
                    )}
                  </>
                )}
              </>
            ),
          },
        ]}
      />
    </Modal>
  );
};
