import { useState, useEffect } from "react";
import { message } from "antd";
import {
  searchUsers,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  removeFriend,
  getUserProfile,
  type SearchUsersRequest,
  type User,
  type FriendRequest,
  type Friend,
} from "../service";

export const useFriendSearch = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);

  const handleSearch = async (params: SearchUsersRequest) => {
    setLoading(true);
    try {
      const data = await searchUsers(params);
      setUsers(data.users);
      setTotal(data.total);
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Tìm kiếm thất bại";
      message.error(msg);
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

export const useFriendRequest = () => {
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);

  const handleSendRequest = async (receiverId: string) => {
    setLoading(true);
    try {
      const data = await sendFriendRequest({ receiverId });
      setSentRequests(prev => [...prev, data]);
      message.success("Đã gửi lời mời kết bạn!");
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Gửi lời mời thất bại";
      message.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const data = await acceptFriendRequest(requestId);
      setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
      message.success("Đã chấp nhận lời mời kết bạn!");
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Chấp nhận lời mời thất bại";
      message.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setLoading(true);
    try {
      await rejectFriendRequest(requestId);
      setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
      message.success("Đã từ chối lời mời kết bạn!");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Từ chối lời mời thất bại";
      message.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    setLoading(true);
    try {
      const data = await getFriendRequests();
      setSentRequests(data.sent);
      setReceivedRequests(data.received);
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Tải lời mời thất bại";
      message.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriendRequests();
  }, []);

  return {
    loading,
    sentRequests,
    receivedRequests,
    handleSendRequest,
    handleAcceptRequest,
    handleRejectRequest,
    loadFriendRequests,
  };
};

export const useFriends = () => {
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const data = await getFriends();
      setFriends(data);
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Tải danh sách bạn bè thất bại";
      message.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    setLoading(true);
    try {
      await removeFriend(friendId);
      setFriends(prev => prev.filter(friend => friend.id !== friendId));
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

