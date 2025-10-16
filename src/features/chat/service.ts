import axiosClient from "@/infrastructure/http/axiosClient";

export interface Message {
  id: string;
  _id?: string; // For MongoDB compatibility
  content: string;
  senderId: string;
  conversationId: string;
  messageType: "text" | "image" | "file" | "sticker";
  type?: "text" | "image" | "video" | "file" | "emoji" | "sticker"; // Backend field
  isRead?: boolean;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    _id?: string; // For MongoDB compatibility
    username: string;
    email: string;
    firstname: string;
    lastname: string;
    avatarUrl?: string;
  };
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    firstname: string;
    lastname: string;
  };
}

// Interface matching actual backend response
interface BackendUser {
  _id: string;
  email: string;
  firstname: string;
  lastname: string;
  username?: string;
  avatarUrl?: string;
}

interface BackendConversation {
  _id: string;
  participants: BackendUser[]; // Direct array of populated User documents
  type: "private" | "group";
  name?: string;
  avatar?: string;
  groupAdmin?: BackendUser; // Group admin (only for group type)
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string; // MongoDB ObjectId
  id?: string; // For compatibility
  name?: string;
  avatar?: string; // Group avatar
  isGroup?: boolean;
  type?: "private" | "group"; // MongoDB field
  groupName?: string; // MongoDB field for group conversations
  groupAdmin?: BackendUser; // Group admin (only for group type)
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message;
  participants: BackendUser[]; // Simplified to match backend
  unreadCount?: number;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: "admin" | "member";
  joinedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    firstname: string;
    lastname: string;
  };
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  messageType?: "text" | "image" | "file" | "sticker";
}

export interface CreateConversationRequest {
  participantIds: string[];
  name?: string;
  isGroup?: boolean;
}

// Group management interfaces
export interface CreateGroupRequest {
  name: string;
  participantIds: string[];
  avatar?: string;
}

export interface UpdateGroupNameRequest {
  name: string;
}

export interface AddGroupMemberRequest {
  userIds: string[];
}

export interface UpdateGroupAvatarRequest {
  avatar: string;
}

export interface TransferGroupAdminRequest {
  newAdminId: string;
}

export interface GetMessagesRequest {
  conversationId: string;
  limit?: number;
  offset?: number;
}

export interface GetMessagesResponse {
  messages: Message[];
  total: number;
}

// Lấy danh sách cuộc trò chuyện
export const getConversations = async (): Promise<Conversation[]> => {
  try {
  const response = await axiosClient.get("/conversation/list");
  // getConversations response (logs removed)

    // The axios interceptor extracts data from wrapped responses,
    // so response is the data directly (not response.data)
    if (Array.isArray(response)) {
      // parsed conversations data
      return response as Conversation[];
    } else {
      console.error(
        "Unexpected response format - expected array, got:",
        typeof response,
        response
      );
      return [];
    }
  } catch (error) {
    console.error("Get conversations failed:", error);
    throw error;
  }
};

// Tạo cuộc trò chuyện mới
export const createConversation = async (
  payload: CreateConversationRequest
): Promise<Conversation> => {
  try {
  const response = await axiosClient.post("/conversation", payload);
  // create conversation response (logs removed)

    let data;
    if (response && typeof response === "object") {
      if ("data" in response && response.data) {
  // response data available
        data = response.data.data || response.data;
      } else {
        data = response;
      }
    } else {
      throw new Error("Invalid response format");
    }

  // parsed conversation data

    if (!data) {
      throw new Error("No data received from server");
    }

    return data as Conversation;
  } catch (error) {
    console.error("Create conversation failed:", error);
    throw error;
  }
};

// Lấy tin nhắn trong cuộc trò chuyện
export const getMessages = async (
  params: GetMessagesRequest
): Promise<GetMessagesResponse> => {
  try {
  // calling getMessages API
    const response = await axiosClient.get(
      `/conversation/${params.conversationId}/messages`,
      {
        params: { limit: params.limit, offset: params.offset },
      }
    );
    // getMessages API response
    return response as unknown as GetMessagesResponse;
  } catch (error) {
    console.error("Get messages failed:", error);
    throw error;
  }
};

// Gửi tin nhắn
export const sendMessage = async (
  payload: SendMessageRequest
): Promise<Message> => {
  try {
    const response = await axiosClient.post("/message", payload);
    let data;
    if (response && typeof response === "object") {
      data = "data" in response && response.data ? response.data : response;
    } else {
      throw new Error("Invalid response format");
    }

    return data as Message;
  } catch (error) {
    console.error("Send message failed:", error);
    throw error;
  }
};

// Đánh dấu tin nhắn đã đọc
export const markAsRead = async (conversationId: string): Promise<void> => {
  try {
    await axiosClient.put(`/conversation/${conversationId}/read`);
  } catch (error) {
    console.error("Mark as read failed:", error);
    throw error;
  }
};

// Thêm reaction vào tin nhắn
export const addReaction = async (
  messageId: string,
  emoji: string
): Promise<MessageReaction> => {
  try {
    const response = await axiosClient.post(`/message/${messageId}/reaction`, {
      emoji,
    });

    let data;
    if (response && typeof response === "object") {
      data = "data" in response && response.data ? response.data : response;
    } else {
      throw new Error("Invalid response format");
    }

    return data as MessageReaction;
  } catch (error) {
    console.error("Add reaction failed:", error);
    throw error;
  }
};

// Xóa reaction khỏi tin nhắn
export const removeReaction = async (reactionId: string): Promise<void> => {
  try {
    await axiosClient.delete(`/message/reaction/${reactionId}`);
  } catch (error) {
    console.error("Remove reaction failed:", error);
    throw error;
  }
};

// Tìm kiếm tin nhắn
export const searchMessages = async (
  conversationId: string,
  query: string
): Promise<Message[]> => {
  try {
    const response = await axiosClient.get(
      `/conversation/${conversationId}/search`,
      {
        params: { q: query },
      }
    );
    let data;
    if (response && typeof response === "object") {
      data = "data" in response && response.data ? response.data : response;
    } else {
      throw new Error("Invalid response format");
    }

    return data as Message[];
  } catch (error) {
    console.error("Search messages failed:", error);
    throw error;
  }
};

// Group Management APIs

// Tạo group chat
export const createGroup = async (
  payload: CreateGroupRequest
): Promise<Conversation> => {
  try {
    const response = await axiosClient.post("/conversation/group", payload);

    let data;
    if (response && typeof response === "object") {
      if ("data" in response && response.data) {
        data = response.data.data || response.data;
      } else {
        data = response;
      }
    } else {
      throw new Error("Invalid response format");
    }

    return data as Conversation;
  } catch (error) {
    console.error("Create group failed:", error);
    throw error;
  }
};

// Đổi tên nhóm
export const updateGroupName = async (
  conversationId: string,
  payload: UpdateGroupNameRequest
): Promise<Conversation> => {
  try {
    const response = await axiosClient.put(
      `/conversation/${conversationId}/group/name`,
      payload
    );

    let data;
    if (response && typeof response === "object") {
      data = "data" in response && response.data ? response.data : response;
    } else {
      throw new Error("Invalid response format");
    }

    return data as Conversation;
  } catch (error) {
    console.error("Update group name failed:", error);
    throw error;
  }
};

// Thêm thành viên vào nhóm
export const addGroupMembers = async (
  conversationId: string,
  payload: AddGroupMemberRequest
): Promise<Conversation> => {
  try {
    const response = await axiosClient.put(
      `/conversation/${conversationId}/group/members/add`,
      payload
    );

    let data;
    if (response && typeof response === "object") {
      data = "data" in response && response.data ? response.data : response;
    } else {
      throw new Error("Invalid response format");
    }

    return data as Conversation;
  } catch (error) {
    console.error("Add group members failed:", error);
    throw error;
  }
};

// Xóa thành viên khỏi nhóm
export const removeGroupMember = async (
  conversationId: string,
  userId: string
): Promise<Conversation> => {
  try {
    const response = await axiosClient.delete(
      `/conversation/${conversationId}/group/members/${userId}`
    );

    let data;
    if (response && typeof response === "object") {
      data = "data" in response && response.data ? response.data : response;
    } else {
      throw new Error("Invalid response format");
    }

    return data as Conversation;
  } catch (error) {
    console.error("Remove group member failed:", error);
    throw error;
  }
};

// Cập nhật avatar nhóm
export const updateGroupAvatar = async (
  conversationId: string,
  payload: UpdateGroupAvatarRequest
): Promise<Conversation> => {
  try {
    const response = await axiosClient.put(
      `/conversation/${conversationId}/group/avatar`,
      payload
    );

    let data;
    if (response && typeof response === "object") {
      data = "data" in response && response.data ? response.data : response;
    } else {
      throw new Error("Invalid response format");
    }

    return data as Conversation;
  } catch (error) {
    console.error("Update group avatar failed:", error);
    throw error;
  }
};

// Rời khỏi nhóm
export const leaveGroup = async (conversationId: string): Promise<void> => {
  try {
    await axiosClient.post(`/conversation/${conversationId}/group/leave`);
  } catch (error) {
    console.error("Leave group failed:", error);
    throw error;
  }
};

// Chuyển quyền nhóm trưởng
export const transferGroupAdmin = async (
  conversationId: string,
  payload: TransferGroupAdminRequest
): Promise<Conversation> => {
  try {
    const response = await axiosClient.put(
      `/conversation/${conversationId}/group/admin/transfer`,
      payload
    );

    let data;
    if (response && typeof response === "object") {
      data = "data" in response && response.data ? response.data : response;
    } else {
      throw new Error("Invalid response format");
    }

    return data as Conversation;
  } catch (error) {
    console.error("Transfer group admin failed:", error);
    throw error;
  }
};

// Giải tán nhóm (chỉ admin)
export const dissolveGroup = async (conversationId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axiosClient.delete(`/conversation/group/${conversationId}/dissolve`);
    return response.data;
  } catch (error) {
    console.error("Dissolve group error:", error);
    throw error;
  }
};
