import axiosClient from "@/infrastructure/http/axiosClient";

export interface User {
  id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  sender: User;
  receiver: User;
}

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  createdAt: string;
  user: User;
  friend: User;
}

export interface SearchUsersRequest {
  email?: string;
  username?: string;
  limit?: number;
  offset?: number;
}

export interface SearchUsersResponse {
  users: User[];
  total: number;
}

export interface SendFriendRequestRequest {
  receiverId: string;
}

export interface GetFriendRequestsResponse {
  sent: FriendRequest[];
  received: FriendRequest[];
}

// Tìm kiếm người dùng
export const searchUsers = async (
  params: SearchUsersRequest
): Promise<SearchUsersResponse> => {
  try {
    const response = await axiosClient.get("/user/search", { params });
    return response as SearchUsersResponse;
  } catch (error) {
    console.error("Search users failed:", error);
    throw error;
  }
};

// Gửi lời mời kết bạn
export const sendFriendRequest = async (
  payload: SendFriendRequestRequest
): Promise<FriendRequest> => {
  try {
    const response = await axiosClient.post("/friend/request", payload);
    return response as FriendRequest;
  } catch (error) {
    console.error("Send friend request failed:", error);
    throw error;
  }
};

// Lấy danh sách lời mời kết bạn
export const getFriendRequests = async (): Promise<GetFriendRequestsResponse> => {
  try {
    const response = await axiosClient.get("/friend/requests");
    return response as GetFriendRequestsResponse;
  } catch (error) {
    console.error("Get friend requests failed:", error);
    throw error;
  }
};

// Chấp nhận lời mời kết bạn
export const acceptFriendRequest = async (requestId: string): Promise<Friend> => {
  try {
    const response = await axiosClient.put(`/friend/request/${requestId}/accept`);
    return response as Friend;
  } catch (error) {
    console.error("Accept friend request failed:", error);
    throw error;
  }
};

// Từ chối lời mời kết bạn
export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  try {
    await axiosClient.put(`/friend/request/${requestId}/reject`);
  } catch (error) {
    console.error("Reject friend request failed:", error);
    throw error;
  }
};

// Lấy danh sách bạn bè
export const getFriends = async (): Promise<Friend[]> => {
  try {
    const response = await axiosClient.get("/friend/list");
    return response as Friend[];
  } catch (error) {
    console.error("Get friends failed:", error);
    throw error;
  }
};

// Hủy kết bạn
export const removeFriend = async (friendId: string): Promise<void> => {
  try {
    await axiosClient.delete(`/friend/${friendId}`);
  } catch (error) {
    console.error("Remove friend failed:", error);
    throw error;
  }
};

// Lấy hồ sơ người dùng
export const getUserProfile = async (userId: string): Promise<User> => {
  try {
    const response = await axiosClient.get(`/user/profile/${userId}`);
    return response as User;
  } catch (error) {
    console.error("Get user profile failed:", error);
    throw error;
  }
};

