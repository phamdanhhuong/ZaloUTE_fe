import { io, Socket } from "socket.io-client";

export interface SocketMessage {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
  };
  content: string;
  type: "text" | "image" | "file";
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocketConversation {
  _id: string;
  participants: string[];
  type: "private" | "group";
  name?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageData {
  conversationId?: string;
  receiverId?: string;
  content: string;
  type?: "text" | "image" | "file";
}

export interface GetMessagesData {
  conversationId: string;
  limit?: number;
  skip?: number;
}

export interface TypingData {
  conversationId: string;
}

export const SOCKET_EVENTS = {
  // Message events
  SEND_MESSAGE: "send_message",
  RECEIVE_MESSAGE: "receive_message",
  GET_MESSAGES: "get_messages",
  GET_MESSAGES_RESULT: "get_messages_result",

  // Conversation events
  GET_CONVERSATIONS: "get_conversations",
  GET_CONVERSATIONS_RESULT: "get_conversations_result",
  JOIN_CONVERSATION: "join_conversation",
  LEAVE_CONVERSATION: "leave_conversation",

  // User status events
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",

  // Error events
  ERROR: "socket_error",
  CONNECTION_SUCCESS: "connection_success",
} as const;

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  // Initialize socket connection
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.token = token;

      this.socket = io(
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080/chat",
        {
          query: { token },
          transports: ["websocket", "polling"],
          timeout: 20000,
          forceNew: true,
        }
      );

      this.socket.on("connect", () => {
        console.log("Socket connected:", this.socket?.id);
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        reject(error);
      });

      this.socket.on(SOCKET_EVENTS.CONNECTION_SUCCESS, (data) => {
        console.log("Connection successful:", data);
      });

      this.socket.on(SOCKET_EVENTS.ERROR, (error) => {
        console.error("Socket error:", error);
      });
    });
  }

  // Disconnect socket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
      console.log("Socket disconnected");
    }
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Wait for socket connection with timeout
  private async waitForConnection(timeoutMs: number = 5000): Promise<void> {
    if (this.isConnected()) return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Socket connection timeout"));
      }, timeoutMs);

      const checkConnection = () => {
        if (this.isConnected()) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  // Send message
  async sendMessage(data: SendMessageData): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.SEND_MESSAGE, data);
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }

  // Get messages
  async getMessages(data: GetMessagesData): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.GET_MESSAGES, data);
    } catch (error) {
      console.error("Failed to get messages:", error);
      throw error;
    }
  }

  // Get conversations
  async getConversations(): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.GET_CONVERSATIONS, {});
    } catch (error) {
      console.error("Failed to get conversations:", error);
      throw error;
    }
  }

  // Join conversation room
  async joinConversation(conversationId: string): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId });
    } catch (error) {
      console.error("Failed to join conversation:", error);
      throw error;
    }
  }

  // Leave conversation room
  async leaveConversation(conversationId: string): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, { conversationId });
    } catch (error) {
      console.error("Failed to leave conversation:", error);
      throw error;
    }
  }

  // Start typing
  startTyping(conversationId: string): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
  }

  // Stop typing
  stopTyping(conversationId: string): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
  }

  // Event listeners
  onReceiveMessage(callback: (message: SocketMessage) => void): () => void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, callback);
    return () => this.socket?.off(SOCKET_EVENTS.RECEIVE_MESSAGE, callback);
  }

  onMessagesResult(callback: (messages: SocketMessage[]) => void): () => void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on(SOCKET_EVENTS.GET_MESSAGES_RESULT, callback);
    return () => this.socket?.off(SOCKET_EVENTS.GET_MESSAGES_RESULT, callback);
  }

  onConversationsResult(
    callback: (conversations: SocketConversation[]) => void
  ): () => void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on(SOCKET_EVENTS.GET_CONVERSATIONS_RESULT, callback);
    return () =>
      this.socket?.off(SOCKET_EVENTS.GET_CONVERSATIONS_RESULT, callback);
  }

  onUserOnline(callback: (data: { userId: string }) => void): () => void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on(SOCKET_EVENTS.USER_ONLINE, callback);
    return () => this.socket?.off(SOCKET_EVENTS.USER_ONLINE, callback);
  }

  onUserOffline(callback: (data: { userId: string }) => void): () => void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on(SOCKET_EVENTS.USER_OFFLINE, callback);
    return () => this.socket?.off(SOCKET_EVENTS.USER_OFFLINE, callback);
  }

  onTypingStart(
    callback: (data: { userId: string; conversationId: string }) => void
  ): () => void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on(SOCKET_EVENTS.TYPING_START, callback);
    return () => this.socket?.off(SOCKET_EVENTS.TYPING_START, callback);
  }

  onTypingStop(
    callback: (data: { userId: string; conversationId: string }) => void
  ): () => void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on(SOCKET_EVENTS.TYPING_STOP, callback);
    return () => this.socket?.off(SOCKET_EVENTS.TYPING_STOP, callback);
  }

  onError(callback: (error: any) => void): () => void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on(SOCKET_EVENTS.ERROR, callback);
    return () => this.socket?.off(SOCKET_EVENTS.ERROR, callback);
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
