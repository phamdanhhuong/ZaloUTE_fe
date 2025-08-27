import { useState, useEffect } from "react";
import { message } from "antd";
import {
  searchUsers,
  sendFriendRequest,
  getPendingFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  removeFriend,
  getUserProfile,
  type SearchUsersRequest,
  type User,
  type FriendRequest,
} from "../service";

export const useFriendSearch = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);

  const handleSearch = async (params: SearchUsersRequest) => {
    setLoading(true);
    try {
      const response = await searchUsers(params);
      // API trả về trực tiếp array của users
      if (response && Array.isArray(response)) {
        setUsers(response);
        setTotal(response.length);
      } else {
        // Nếu response không đúng format, set empty array
        setUsers([]);
        setTotal(0);
        console.warn("Search response format is invalid:", response);
      }
      return response;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Tìm kiếm thất bại";
      message.error(msg);
      // Reset state khi có lỗi
      setUsers([]);
      setTotal(0);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setUsers([]);
    setTotal(0);
  };

  return {
    loading,
    users,
    total,
    handleSearch,
    clearResults,
  };
};

export const useFriends = () => {
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const data = await getFriends();
      // Đảm bảo data là array trước khi set state
      if (Array.isArray(data)) {
        setFriends(data);
      } else {
        setFriends([]);
        console.warn("Friends response is not an array:", data);
      }
      return data;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Tải danh sách bạn bè thất bại";
      message.error(msg);
      // Reset state khi có lỗi
      setFriends([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    setLoading(true);
    try {
      await removeFriend(friendId);
      setFriends((prev) => prev.filter((friend) => friend.id !== friendId));
      message.success("Đã hủy kết bạn!");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Hủy kết bạn thất bại";
      message.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  return {
    loading,
    friends,
    loadFriends,
    handleRemoveFriend,
  };
};

export const useFriendRequests = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  const loadPendingRequests = async () => {
    setLoading(true);
    try {
      const data = await getPendingFriendRequests();
      // Đảm bảo data là array trước khi set state
      if (Array.isArray(data)) {
        setRequests(data);
      } else {
        setRequests([]);
        console.warn("Friend requests response is not an array:", data);
      }
      return data;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Tải danh sách lời mời thất bại";
      message.error(msg);
      // Reset state khi có lỗi
      setRequests([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    setLoading(true);
    try {
      await acceptFriendRequest(friendshipId);
      setRequests((prev) =>
        prev.filter((req) => req.friendshipId !== friendshipId)
      );
      message.success("Đã chấp nhận lời mời kết bạn!");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Chấp nhận lời mời thất bại";
      message.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    setLoading(true);
    try {
      await rejectFriendRequest(friendshipId);
      setRequests((prev) =>
        prev.filter((req) => req.friendshipId !== friendshipId)
      );
      message.success("Đã từ chối lời mời kết bạn!");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Từ chối lời mời thất bại";
      message.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingRequests();
  }, []);

  return {
    loading,
    requests,
    loadPendingRequests,
    handleAcceptRequest,
    handleRejectRequest,
  };
};

export const useSendFriendRequest = () => {
  const [loading, setLoading] = useState(false);

  const handleSendRequest = async (receiverId: string) => {
    setLoading(true);
    try {
      const result = await sendFriendRequest({ receiverId });
      message.success("Đã gửi lời mời kết bạn!");
      return result;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Gửi lời mời thất bại";
      message.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleSendRequest,
  };
};

export const useUserProfile = () => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);

  const loadProfile = async (userId: string) => {
    setLoading(true);
    try {
      const data = await getUserProfile(userId);
      setProfile(data);
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Tải hồ sơ thất bại";
      message.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearProfile = () => {
    setProfile(null);
  };

  return {
    loading,
    profile,
    loadProfile,
    clearProfile,
  };
};
