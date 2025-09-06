import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SocketMessage, SocketConversation } from '@/infrastructure/socket/socketService';

export interface TypingUser {
  userId: string;
  conversationId: string;
}

export interface OnlineUser {
  userId: string;
}

export interface ChatState {
  conversations: SocketConversation[];
  messages: { [conversationId: string]: SocketMessage[] };
  activeConversationId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  typingUsers: TypingUser[];
  onlineUsers: OnlineUser[];
  error: string | null;
}

const initialState: ChatState = {
  conversations: [],
  messages: {},
  activeConversationId: null,
  isConnected: false,
  isLoading: false,
  typingUsers: [],
  onlineUsers: [],
  error: null,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Connection management
    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
      if (!action.payload) {
        state.typingUsers = [];
        state.onlineUsers = [];
      }
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Conversations
    setConversations: (state, action: PayloadAction<SocketConversation[]>) => {
      state.conversations = action.payload;
    },

    addConversation: (state, action: PayloadAction<SocketConversation>) => {
      const existingIndex = state.conversations.findIndex(c => c._id === action.payload._id);
      if (existingIndex >= 0) {
        state.conversations[existingIndex] = action.payload;
      } else {
        state.conversations.unshift(action.payload);
      }
    },

    setActiveConversationId: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },


    // Messages
    setMessages: (state, action: PayloadAction<{ conversationId: string; messages: SocketMessage[] }>) => {
      const { conversationId, messages } = action.payload;
      state.messages[conversationId] = messages;
    },

    addMessage: (state, action: PayloadAction<SocketMessage>) => {
      const message = action.payload;
      const conversationId = message.conversation;
      
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      
      // Check if message already exists (prevent duplicates)
      const existingIndex = state.messages[conversationId].findIndex(m => m._id === message._id);
      if (existingIndex === -1) {
        state.messages[conversationId].push(message);
        // Sort by createdAt to maintain order
        state.messages[conversationId].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
    },

    prependMessages: (state, action: PayloadAction<{ conversationId: string; messages: SocketMessage[] }>) => {
      const { conversationId, messages } = action.payload;
      
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      
      // Add messages to the beginning (for pagination)
      const existingMessages = state.messages[conversationId];
      const newMessages = messages.filter(newMsg => 
        !existingMessages.some(existing => existing._id === newMsg._id)
      );
      
      state.messages[conversationId] = [...newMessages, ...existingMessages];
    },

    // Real-time reaction update
    updateMessageReactions: (state, action: PayloadAction<{ messageId: string; conversationId: string; reactions: any }>) => {
      const { messageId, conversationId, reactions } = action.payload;
      const msgs = state.messages[conversationId];
      if (msgs) {
        const msg = msgs.find(m => m._id === messageId);
        if (msg) {
          msg.reactions = reactions;
        }
      }
    },

    // Typing indicators
    addTypingUser: (state, action: PayloadAction<TypingUser>) => {
      const typingUser = action.payload;
      const existingIndex = state.typingUsers.findIndex(
        u => u.userId === typingUser.userId && u.conversationId === typingUser.conversationId
      );
      
      if (existingIndex === -1) {
        state.typingUsers.push(typingUser);
      }
    },

    removeTypingUser: (state, action: PayloadAction<TypingUser>) => {
      const typingUser = action.payload;
      state.typingUsers = state.typingUsers.filter(
        u => !(u.userId === typingUser.userId && u.conversationId === typingUser.conversationId)
      );
    },

    // Online users
    addOnlineUser: (state, action: PayloadAction<OnlineUser>) => {
      const onlineUser = action.payload;
      const existingIndex = state.onlineUsers.findIndex(u => u.userId === onlineUser.userId);
      
      if (existingIndex === -1) {
        state.onlineUsers.push(onlineUser);
      }
    },

    removeOnlineUser: (state, action: PayloadAction<OnlineUser>) => {
      const onlineUser = action.payload;
      state.onlineUsers = state.onlineUsers.filter(u => u.userId !== onlineUser.userId);
    },

    // Clear all data (on logout)
    clearChatData: (state) => {
      return { ...initialState };
    },
  },
});

export const {
  setConnectionStatus,
  setLoading,
  setError,
  setConversations,
  addConversation,
  setActiveConversationId,
  setMessages,
  addMessage,
  prependMessages,
  addTypingUser,
  removeTypingUser,
  addOnlineUser,
  removeOnlineUser,
  clearChatData,
  updateMessageReactions,
} = chatSlice.actions;

export default chatSlice.reducer;
