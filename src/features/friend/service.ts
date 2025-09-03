import axiosClient from "@/infrastructure/http/axiosClient";

export interface User {
  id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  phone?: string;
  avatarUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  friendsSince?: string; // For friends list
  isFriend?: boolean; // For search results
  friendshipStatus?: "pending" | "accepted" | "rejected" | null; // For search results
}

// Friend request interfaces based on new API
export interface FriendRequest {
  friendshipId: string;
  requester: User;
  createdAt: string;
  status: "pending" | "accepted" | "rejected";
}

export interface SearchUsersRequest {
  email?: string;
  username?: string;
  limit?: number;
  offset?: number;
}

export interface SearchUsersResponse {
  statusCode: number;
  message: string;
  data: User[];
}

// Type cho response thực tế từ API (trả về trực tiếp array)
export type SearchUsersApiResponse = User[];

export interface SendFriendRequestRequest {
  receiverId: string;
}

export interface RespondToFriendRequestRequest {
  friendshipId: string;
  action: "accept" | "reject";
}

// Tìm kiếm người dùng
export const searchUsers = async (
  params: SearchUsersRequest
): Promise<SearchUsersApiResponse> => {
  try {
    const response: SearchUsersApiResponse = await axiosClient.get(
      "/user/search",
      { params }
    );
    return response;
  } catch (error) {
    console.error("Search users failed:", error);
    throw error;
  }
};

// Gửi lời mời kết bạn
export const sendFriendRequest = async (
  payload: SendFriendRequestRequest
): Promise<{ message: string }> => {
  try {
    const response: { message: string } = await axiosClient.post(
      "/user/friends/request",
      payload
    );
    return response;
  } catch (error) {
    console.error("Send friend request failed:", error);
    throw error;
  }
};

// Lấy danh sách lời mời kết bạn đang pending
export const getPendingFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    const response: FriendRequest[] = await axiosClient.get(
      "/user/friends/requests"
    );
    return response;
  } catch (error) {
    console.error("Get pending friend requests failed:", error);
    throw error;
  }
};

// Phản hồi lời mời kết bạn (accept/reject)
export const respondToFriendRequest = async (
  payload: RespondToFriendRequestRequest
): Promise<{ message: string }> => {
  try {
    const response: { message: string } = await axiosClient.post(
      "/user/friends/respond",
      payload
    );
    return response;
  } catch (error) {
    console.error("Respond to friend request failed:", error);
    throw error;
  }
};

// Chấp nhận lời mời kết bạn
export const acceptFriendRequest = async (
  friendshipId: string
): Promise<{ message: string }> => {
  try {
    return await respondToFriendRequest({ friendshipId, action: "accept" });
  } catch (error) {
    console.error("Accept friend request failed:", error);
    throw error;
  }
};

// Từ chối lời mời kết bạn
export const rejectFriendRequest = async (
  friendshipId: string
): Promise<{ message: string }> => {
  try {
    return await respondToFriendRequest({ friendshipId, action: "reject" });
  } catch (error) {
    console.error("Reject friend request failed:", error);
    throw error;
  }
};

// Lấy danh sách bạn bè
export const getFriends = async (): Promise<User[]> => {
  try {
    const response: User[] = await axiosClient.get("/user/friends");
    return response;
  } catch (error) {
    console.error("Get friends failed:", error);
    throw error;
  }
};

// Hủy kết bạn
export const removeFriend = async (friendId: string): Promise<void> => {
  try {
    await axiosClient.delete(`/user/friends/${friendId}`);
  } catch (error) {
    console.error("Remove friend failed:", error);
    throw error;
  }
};

// Lấy hồ sơ người dùng
export const getUserProfile = async (userId: string): Promise<User> => {
  try {
    const response: User = await axiosClient.get(`/user/profile/${userId}`);
    return response;
  } catch (error) {
    console.error("Get user profile failed:", error);
    throw error;
  }
};
