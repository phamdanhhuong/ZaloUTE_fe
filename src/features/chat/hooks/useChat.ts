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

  return {
    loading,
    conversations,
    loadConversations,
    handleCreateConversation,
  };
};

export const useMessages = (conversationId?: string) => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadMessages = useCallback(async (reset = false) => {
    if (!conversationId) return;
    
    console.log(`Loading messages for conversation ${conversationId}, reset: ${reset}`);
    setLoading(true);
    try {
      const offset = reset ? 0 : messages.length;
      const data = await getMessages({
        conversationId,
        limit: 20,
        offset,
      });
      
      console.log('Messages loaded:', data);
      
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
      console.log('Loading messages for conversation:', conversationId);
      clearMessages();
      loadMessages(true);
      handleMarkAsRead();
    } else {
      console.log('No conversation ID provided to useMessages');
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

