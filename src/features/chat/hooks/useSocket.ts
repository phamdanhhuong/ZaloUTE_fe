import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { 
  setConnectionStatus, 
  setLoading, 
  setError,
  setConversations,
  removeConversation,
  addMessage,
  setMessages,
  addTypingUser,
  removeTypingUser,
  addOnlineUser,
  removeOnlineUser,
  clearChatData,
  updateMessageReactions,
  markMessagesAsRead,
  updateMessage
} from '@/store/slices/chatSlice';
import socketService, { 
  SendMessageData, 
  GetMessagesData,
  SocketMessage,
  SocketConversation,
  SendReactionData,
  EditMessageData,
  DeleteMessageData
} from '@/infrastructure/socket/socketService';

export const useSocket = () => {
  const dispatch = useDispatch();
  const { isConnected, conversations, activeConversationId } = useSelector((state: RootState) => state.chat);
  const { token, user: currentUser } = useSelector((state: RootState) => state.user);
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
        
        // If we're currently in this conversation and the message is not from us, mark as read
        if (activeConversationId === message.conversation && 
            message.sender._id !== currentUser?.id && 
            !message.isRead) {
          // Auto mark as read since user is currently viewing the conversation
          markAsRead(message.conversation);
        }
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
        dispatch(updateMessageReactions(data));
      }));

      // Messages read events
      unsubscribers.push(socketService.onMessagesRead((data) => {
        dispatch(markMessagesAsRead(data));
      }));

      // Message edited events
      unsubscribers.push(socketService.onMessageEdited((data) => {
        console.log('Received MESSAGE_EDITED:', data);
        // Update the message in the store
        dispatch(updateMessage({ 
          messageId: data.messageId, 
          conversationId: data.conversationId, 
          updatedMessage: data.updatedMessage 
        }));
      }));

      // Message deleted events
      unsubscribers.push(socketService.onMessageDeleted((data) => {
        console.log('Received MESSAGE_DELETED:', data);
        // Update the message in the store
        dispatch(updateMessage({ 
          messageId: data.messageId, 
          conversationId: data.conversationId, 
          updatedMessage: data.deletedMessage 
        }));
      }));

      // Group events
      unsubscribers.push(socketService.onGroupDissolved((data) => {
        // Remove the dissolved group from conversations
        dispatch(removeConversation({ conversationId: data.conversationId }));
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
  }, [token, isConnected, activeConversationId, currentUser, dispatch]);

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
      if (!isConnected) {
      return;
    }

    try {
      socketService.startTyping(conversationId);
    } catch (error) {
      console.error('Failed to start typing:', error);
    }
  }, [isConnected]);

  // Stop typing
  const stopTyping = useCallback((conversationId: string) => {
    if (!isConnected) {
      return;
    }

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

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await socketService.markAsRead(conversationId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
      dispatch(setError('Failed to mark as read'));
    }
  }, [dispatch]);

  // NOTE: connection lifecycle is managed by a top-level SocketProvider.
  // This hook only registers listeners when a socket is available and
  // cleans up event listeners on unmount.
  useEffect(() => {
    // If socket already connected, listeners are attached in connect(); but
    // for safety, attempt to attach by ensuring a connection exists first.
    let mounted = true;

    const attach = async () => {
      try {
        if (!socketService.isConnected()) {
          // wait up to 5s for provider to connect by polling isConnected()
          const start = Date.now();
          while (!socketService.isConnected() && Date.now() - start < 5000) {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 100));
          }
        }

        if (!mounted) return;

        // If connected, attach listeners by re-using connect() logic
        if (socketService.isConnected() && unsubscribeRefs.current.length === 0) {
          // reuse the connect function's listener registration by calling connect()
          // but since connect() previously created socket, here we only execute
          // the listener registration block manually.
          const unsubscribers: (() => void)[] = [];

          unsubscribers.push(socketService.onReceiveMessage((message: SocketMessage) => {
            dispatch(addMessage(message));
            if (activeConversationId === message.conversation && 
                message.sender._id !== currentUser?.id && 
                !message.isRead) {
              markAsRead(message.conversation);
            }
          }));

          unsubscribers.push(socketService.onMessagesResult((messages: SocketMessage[]) => {
            if (activeConversationId) {
              dispatch(setMessages({ conversationId: activeConversationId, messages }));
            }
          }));

          // ... re-attach other listeners same as in connect()
          unsubscribers.push(socketService.onConversationsResult((conversations: SocketConversation[]) => {
            dispatch(setConversations(conversations));
          }));

          unsubscribers.push(socketService.onUserOnline((data) => {
            dispatch(addOnlineUser({ userId: data.userId }));
          }));

          unsubscribers.push(socketService.onUserOffline((data) => {
            dispatch(removeOnlineUser({ userId: data.userId }));
          }));

          unsubscribers.push(socketService.onTypingStart((data) => {
            dispatch(addTypingUser({ userId: data.userId, conversationId: data.conversationId }));
          }));

          unsubscribers.push(socketService.onTypingStop((data) => {
            dispatch(removeTypingUser({ userId: data.userId, conversationId: data.conversationId }));
          }));

          unsubscribers.push(socketService.onError((error) => {
            console.error('Socket error:', error);
            console.error('Socket error details:', JSON.stringify(error, null, 2));
            dispatch(setError(error.message || 'Socket error occurred'));
          }));

          unsubscribers.push(socketService.onMessageReactionUpdated((data) => {
            dispatch(updateMessageReactions(data));
          }));

          unsubscribers.push(socketService.onMessagesRead((data) => {
            dispatch(markMessagesAsRead(data));
          }));

          unsubscribers.push(socketService.onGroupDissolved((data) => {
            dispatch(removeConversation({ conversationId: data.conversationId }));
          }));

          unsubscribeRefs.current = unsubscribers;
        }
      } catch (error) {
        // ignore attach errors
      }
    };

    attach();

    return () => {
      mounted = false;
      // cleanup event listeners
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, [activeConversationId, currentUser, dispatch]);

  const editMessage = useCallback(async (data: EditMessageData) => {
    try {
      await socketService.editMessage(data);
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  }, []);

  const deleteMessage = useCallback(async (data: DeleteMessageData) => {
    try {
      await socketService.deleteMessage(data);
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }, []);

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
    markAsRead,
    editMessage,
    deleteMessage,
  };
};
