import axiosClient from "@/infrastructure/http/axiosClient";

export interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  messageType: 'text' | 'image' | 'file' | 'sticker';
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    username: string;
    email: string;
    firstname: string;
    lastname: string;
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
}

interface BackendConversation {
  _id: string;
  participants: BackendUser[]; // Direct array of populated User documents
  type: 'private' | 'group';
  name?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string; // MongoDB ObjectId
  id?: string; // For compatibility
  name?: string;
  isGroup?: boolean;
  type?: 'private' | 'group'; // MongoDB field
  groupName?: string; // MongoDB field for group conversations
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
  role: 'admin' | 'member';
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
  messageType?: 'text' | 'image' | 'file' | 'sticker';
}

export interface CreateConversationRequest {
  participantIds: string[];
  name?: string;
  isGroup?: boolean;
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
    console.log("Get conversations response:", response);
    
    // The axios interceptor extracts data from wrapped responses,
    // so response is the data directly (not response.data)
    if (Array.isArray(response)) {
      console.log("Parsed conversations data:", response);
      return response as Conversation[];
    } else {
      console.error("Unexpected response format - expected array, got:", typeof response, response);
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
    console.log("Create conversation response:", response);
    console.log("Response data:", response.data);
    // Check if response has wrapper or direct data
    const data = response.data.data || response.data;
    console.log("Parsed conversation data:", data);
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
    console.log('Calling getMessages API with params:', params);
    const response = await axiosClient.get(`/conversation/${params.conversationId}/messages`, {
      params: { limit: params.limit, offset: params.offset }
    });
    console.log('getMessages API response:', response);
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
    return response as Message;
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
    const response = await axiosClient.post(`/message/${messageId}/reaction`, { emoji });
    return response.data as MessageReaction;
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
    const response = await axiosClient.get(`/conversation/${conversationId}/search`, {
      params: { q: query }
    });
    return response.data as Message[];
  } catch (error) {
    console.error("Search messages failed:", error);
    throw error;
  }
};

