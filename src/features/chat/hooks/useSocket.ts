import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { 
  setConnectionStatus, 
  setLoading, 
  setError,
  setConversations,
  addMessage,
  setMessages,
  addTypingUser,
  removeTypingUser,
  addOnlineUser,
  removeOnlineUser,
  clearChatData,
  updateMessageReactions
} from '@/store/slices/chatSlice';
import socketService, { 
  SendMessageData, 
  GetMessagesData,
  SocketMessage,
  SocketConversation,
  SendReactionData
} from '@/infrastructure/socket/socketService';

export const useSocket = () => {
  const dispatch = useDispatch();
  const { isConnected, conversations, activeConversationId } = useSelector((state: RootState) => state.chat);
  const { token } = useSelector((state: RootState) => state.user);
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  // Connect to socket
  const connect = useCallback(async () => {
    if (!token || isConnected) return;

    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      await socketService.connect(token);
      dispatch(setConnectionStatus(true));

      // Set up event listeners
      const unsubscribers: (() => void)[] = [];

      // Message events
      unsubscribers.push(socketService.onReceiveMessage((message: SocketMessage) => {
        dispatch(addMessage(message));
      }));

      unsubscribers.push(socketService.onMessagesResult((messages: SocketMessage[]) => {
        if (activeConversationId) {
          dispatch(setMessages({ conversationId: activeConversationId, messages }));
        }
      }));

      // Conversation events
      unsubscribers.push(socketService.onConversationsResult((conversations: SocketConversation[]) => {
        dispatch(setConversations(conversations));
      }));

      // User status events
      unsubscribers.push(socketService.onUserOnline((data) => {
        dispatch(addOnlineUser({ userId: data.userId }));
      }));

      unsubscribers.push(socketService.onUserOffline((data) => {
        dispatch(removeOnlineUser({ userId: data.userId }));
      }));

      // Typing events
      unsubscribers.push(socketService.onTypingStart((data) => {
        dispatch(addTypingUser({ userId: data.userId, conversationId: data.conversationId }));
      }));

      unsubscribers.push(socketService.onTypingStop((data) => {
        dispatch(removeTypingUser({ userId: data.userId, conversationId: data.conversationId }));
      }));

      // Error events
      unsubscribers.push(socketService.onError((error) => {
        console.error('Socket error:', error);
        console.error('Socket error details:', JSON.stringify(error, null, 2));
        dispatch(setError(error.message || 'Socket error occurred'));
      }));

      // Reaction events
      unsubscribers.push(socketService.onMessageReactionUpdated((data) => {
        console.log('Received MESSAGE_REACTION_UPDATED:', data);
        dispatch(updateMessageReactions(data));
      }));

      unsubscribeRefs.current = unsubscribers;

      // Load initial data - temporarily commented out for debugging
      // socketService.getConversations();

    } catch (error) {
      console.error('Failed to connect to socket:', error);
      dispatch(setError('Failed to connect to chat server'));
      dispatch(setConnectionStatus(false));
    } finally {
      dispatch(setLoading(false));
    }
  }, [token, isConnected, activeConversationId, dispatch]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    // Clean up event listeners
    unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
    unsubscribeRefs.current = [];

    socketService.disconnect();
    dispatch(setConnectionStatus(false));
    dispatch(clearChatData());
  }, [dispatch]);

  // Send message
  const sendMessage = useCallback(async (data: SendMessageData) => {
    try {
      await socketService.sendMessage(data);
    } catch (error) {
      console.error('Failed to send message:', error);
      dispatch(setError('Failed to send message'));
    }
  }, [dispatch]);

  // Get messages for a conversation
  const getMessages = useCallback(async (data: GetMessagesData) => {
    try {
      await socketService.getMessages(data);
    } catch (error) {
      console.error('Failed to get messages:', error);
      dispatch(setError('Failed to load messages'));
    }
  }, [dispatch]);

  // Join conversation
  const joinConversation = useCallback(async (conversationId: string) => {
    try {
      console.log('Joining socket room:', conversationId);
      await socketService.joinConversation(conversationId);
    } catch (error) {
      console.error('Failed to join conversation:', error);
    }
  }, []);

  // Leave conversation
  const leaveConversation = useCallback((conversationId: string) => {
    if (!isConnected) return;

    try {
      socketService.leaveConversation(conversationId);
    } catch (error) {
      console.error('Failed to leave conversation:', error);
    }
  }, [isConnected]);

  // Start typing
  const startTyping = useCallback((conversationId: string) => {
    if (!isConnected) return;

    try {
      socketService.startTyping(conversationId);
    } catch (error) {
      console.error('Failed to start typing:', error);
    }
  }, [isConnected]);

  // Stop typing
  const stopTyping = useCallback((conversationId: string) => {
    if (!isConnected) return;

    try {
      socketService.stopTyping(conversationId);
    } catch (error) {
      console.error('Failed to stop typing:', error);
    }
  }, [isConnected]);

  // Send reaction
  const sendReaction = useCallback(async (data: SendReactionData) => {
    try {
      await socketService.sendReaction(data);
    } catch (error) {
      console.error('Failed to send reaction:', error);
      dispatch(setError('Failed to send reaction'));
    }
  }, [dispatch]);

  // Auto connect when token is available
  useEffect(() => {
    if (token && !isConnected) {
      connect();
    }
  }, [token, isConnected, connect]);

  // Auto disconnect when token is removed
  useEffect(() => {
    if (!token && isConnected) {
      disconnect();
    }
  }, [token, isConnected, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    sendMessage,
    getMessages,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    sendReaction,
  };
};
