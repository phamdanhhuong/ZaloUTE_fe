import { useState, useEffect, useCallback } from "react";
import { message as antdMessage } from "antd";
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markAsRead,
  addReaction,
  removeReaction,
  searchMessages,
  type Conversation,
  type Message,
  type SendMessageRequest,
  type CreateConversationRequest,
  type MessageReaction,
} from "../service";

export const useConversations = () => {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await getConversations();
      setConversations(data);
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Tải cuộc trò chuyện thất bại";
      antdMessage.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversation = async (payload: CreateConversationRequest) => {
    setLoading(true);
    try {
      const data = await createConversation(payload);
      setConversations(prev => [data, ...prev]);
      antdMessage.success("Tạo cuộc trò chuyện thành công!");
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Tạo cuộc trò chuyện thất bại";
      antdMessage.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
      return data;
    } catch (err: any) {
      console.error("Refresh conversations failed:", err);
      // Don't show error message for refresh, just log it
    }
  }, []);

  // Cập nhật cục bộ khi có socket event, không cần reload
  const applyConversationUpdate = useCallback((updated: Conversation) => {
    setConversations(prev => {
      if (!updated) return prev;
      const getId = (obj: any) => {
        const raw = obj?._id ?? obj?.id;
        try {
          return typeof raw === 'string' ? raw : raw?.toString?.() ?? String(raw);
        } catch {
          return String(raw);
        }
      };
      const updatedId = getId(updated);
      const idx = prev.findIndex(c => getId(c) === updatedId);
      let next: Conversation[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = updated;
      } else {
        next = [updated, ...prev];
      }
      // Sắp xếp theo thời gian cập nhật mới nhất
      return next.sort((a, b) => {
        const getTime = (conv: Conversation) => {
          const t = (conv.lastMessage as any)?.createdAt || (conv as any)?.updatedAt;
          try { return new Date(t as any).getTime(); } catch { return 0; }
        };
        return getTime(b) - getTime(a);
      });
    });
  }, []);

  return {
    loading,
    conversations,
    loadConversations,
    refreshConversations,
    handleCreateConversation,
    applyConversationUpdate,
  };
};

export const useMessages = (conversationId?: string) => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadMessages = useCallback(async (reset = false) => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const offset = reset ? 0 : messages.length;
      const data = await getMessages({
        conversationId,
        limit: 20,
        offset,
      });
      
      if (reset) {
        setMessages(data.messages);
      } else {
        setMessages(prev => [...data.messages, ...prev]);
      }
      
      setTotal(data.total);
      setHasMore(data.messages.length === 20);
      return data;
      } catch (err: any) {
      console.error('Load messages error:', err);
      const msg = err?.response?.data?.message || "Tải tin nhắn thất bại";
      antdMessage.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conversationId, messages.length]);

  const handleSendMessage = async (content: string, messageType: 'text' | 'image' | 'file' | 'sticker' = 'text') => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const payload: SendMessageRequest = {
        conversationId,
        content,
        messageType,
      };
      
      const data = await sendMessage(payload);
      setMessages(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Gửi tin nhắn thất bại";
      antdMessage.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!conversationId) return;
    
    try {
      await markAsRead(conversationId);
    } catch (err: any) {
      console.error("Mark as read failed:", err);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setTotal(0);
    setHasMore(true);
  };

  useEffect(() => {
    if (conversationId) {
      clearMessages();
      loadMessages(true);
      handleMarkAsRead();
    }
  }, [conversationId]);

  return {
    loading,
    messages,
    total,
    hasMore,
    loadMessages,
    handleSendMessage,
    handleMarkAsRead,
    clearMessages,
  };
};

export const useMessageReactions = () => {
  const [loading, setLoading] = useState(false);

  const handleAddReaction = async (messageId: string, emoji: string) => {
    setLoading(true);
    try {
      const data = await addReaction(messageId, emoji);
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Thêm reaction thất bại";
      antdMessage.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveReaction = async (reactionId: string) => {
    setLoading(true);
    try {
      await removeReaction(reactionId);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Xóa reaction thất bại";
      antdMessage.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleAddReaction,
    handleRemoveReaction,
  };
};

export const useMessageSearch = () => {
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);

  const handleSearch = async (conversationId: string, query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await searchMessages(conversationId, query);
      setSearchResults(data);
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Tìm kiếm tin nhắn thất bại";
      antdMessage.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchResults([]);
  };

  return {
    loading,
    searchResults,
    handleSearch,
    clearSearch,
  };
};

