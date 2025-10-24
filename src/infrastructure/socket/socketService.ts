import io, { Socket } from "socket.io-client";
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
  type: "text" | "image" | "video" | "file" | "emoji" | "sticker";
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  reactions?: {
    [type: string]: { count: number; userIds: string[] };
  };
}

export interface SocketConversation {
  _id: string;
  participants: string[];
  type: "private" | "group";
  name?: string;
  avatar?: string;
  groupAdmin?: string; // Group admin ID
  lastMessage?: {
    _id: string;
    content: string;
    type: "text" | "image" | "video" | "file" | "emoji" | "sticker";
    sender: {
      _id: string;
      username: string;
      email: string;
      firstname: string;
      lastname: string;
      avatarUrl: string;
    };
    isRead: boolean;
    createdAt: string;
    updatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageData {
  conversationId?: string;
  receiverId?: string;
  content: string;
  type?: "text" | "image" | "video" | "file" | "emoji" | "sticker";
}

export interface GetMessagesData {
  conversationId: string;
  limit?: number;
  skip?: number;
}

export interface TypingData {
  conversationId: string;
}

export interface SendReactionData {
  messageId: string;
  userId: string;
  type: string;
  conversationId: string;
  value: string;
}

export interface EditMessageData {
  messageId: string;
  content: string;
}

export interface DeleteMessageData {
  messageId: string;
}

// Group management socket data interfaces
export interface CreateGroupData {
  name: string;
  participantIds: string[];
  avatar?: string;
}

export interface UpdateGroupNameData {
  conversationId: string;
  name: string;
}

export interface AddGroupMemberData {
  conversationId: string;
  userIds: string[];
}

export interface RemoveGroupMemberData {
  conversationId: string;
  userId: string;
}

export interface LeaveGroupData {
  conversationId: string;
}

export interface TransferGroupAdminData {
  conversationId: string;
  newAdminId: string;
}

export interface DissolveGroupData {
  conversationId: string;
}

export const SOCKET_EVENTS = {
  // Message events
  SEND_MESSAGE: "send_message",
  RECEIVE_MESSAGE: "receive_message",
  GET_MESSAGES: "get_messages",
  GET_MESSAGES_RESULT: "get_messages_result",
  MARK_AS_READ: "mark_as_read",
  MESSAGES_READ: "messages_read",
  EDIT_MESSAGE: "edit_message",
  MESSAGE_EDITED: "message_edited",
  DELETE_MESSAGE: "delete_message",
  MESSAGE_DELETED: "message_deleted",

  // Conversation events
  GET_CONVERSATIONS: "get_conversations",
  GET_CONVERSATIONS_RESULT: "get_conversations_result",
  CONVERSATION_UPDATED: "conversation_updated",
  JOIN_CONVERSATION: "join_conversation",
  LEAVE_CONVERSATION: "leave_conversation",

  // Group management events
  CREATE_GROUP: "create_group",
  GROUP_CREATED: "group_created",
  UPDATE_GROUP_NAME: "update_group_name",
  GROUP_NAME_UPDATED: "group_name_updated",
  ADD_GROUP_MEMBERS: "add_group_members",
  GROUP_MEMBER_ADDED: "group_member_added",
  REMOVE_GROUP_MEMBER: "remove_group_member",
  GROUP_MEMBER_REMOVED: "group_member_removed",
  LEAVE_GROUP: "leave_group",
  GROUP_MEMBER_LEFT: "group_member_left",
  TRANSFER_GROUP_ADMIN: "transfer_group_admin",
  GROUP_ADMIN_TRANSFERRED: "group_admin_transferred",
  GROUP_AVATAR_UPDATED: "group_avatar_updated",
  DISSOLVE_GROUP: "dissolve_group",
  GROUP_DISSOLVED: "group_dissolved",

  // User status events
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",

  // Reaction events
  ADD_REACTION: "add_reaction",
  MESSAGE_REACTION_UPDATED: "message_reaction_updated",

  // Error events
  ERROR: "socket_error",
  CONNECTION_SUCCESS: "connection_success",
} as const;

class SocketService {
  private socket: ReturnType<typeof io> | null = null;
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

      this.socket.on("connect_error", (error: any) => {
        console.error("Socket connection error:", error);
        reject(error);
      });

      this.socket.on(SOCKET_EVENTS.CONNECTION_SUCCESS, (data: any) => {
        console.log("Connection successful:", data);
      });

      this.socket.on(SOCKET_EVENTS.ERROR, (error: any) => {
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

  // Mark messages as read
  async markAsRead(conversationId: string): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.MARK_AS_READ, { conversationId });
    } catch (error) {
      console.error("Failed to mark as read:", error);
      throw error;
    }
  }

  // Edit message
  async editMessage(data: EditMessageData): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.EDIT_MESSAGE, data);
    } catch (error) {
      console.error("Failed to edit message:", error);
      throw error;
    }
  }

  // Delete message
  async deleteMessage(data: DeleteMessageData): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.DELETE_MESSAGE, data);
    } catch (error) {
      console.error("Failed to delete message:", error);
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

  // Send reaction (emoji/sticker)
  async sendReaction(data: SendReactionData): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.ADD_REACTION, data);
      console.log("[DEBUG] Sent ADD_REACTION:", data);
    } catch (error) {
      console.error("Failed to send reaction:", error);
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
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onReceiveMessage listener"
      );
      return () => {}; // Return empty cleanup function
    }
    const wrapped = (msg: SocketMessage) => {
      try {
        // Debug: hỗ trợ fallback nếu cần
        // console.debug('[onReceiveMessage] message:', msg);
      } catch {}
      callback(msg);
    };
    this.socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, wrapped);
    return () => this.socket?.off(SOCKET_EVENTS.RECEIVE_MESSAGE, wrapped);
  }

  onMessagesResult(callback: (messages: SocketMessage[]) => void): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onMessagesResult listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.GET_MESSAGES_RESULT, callback);
    return () => this.socket?.off(SOCKET_EVENTS.GET_MESSAGES_RESULT, callback);
  }

  onConversationsResult(
    callback: (conversations: SocketConversation[]) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onConversationsResult listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.GET_CONVERSATIONS_RESULT, callback);
    return () =>
      this.socket?.off(SOCKET_EVENTS.GET_CONVERSATIONS_RESULT, callback);
  }

  onConversationUpdated(
    callback: (data: { conversation: any; message?: any }) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onConversationUpdated listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, callback);
    return () =>
      this.socket?.off(SOCKET_EVENTS.CONVERSATION_UPDATED, callback);
  }

  onUserOnline(callback: (data: { userId: string }) => void): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onUserOnline listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.USER_ONLINE, callback);
    return () => this.socket?.off(SOCKET_EVENTS.USER_ONLINE, callback);
  }

  onUserOffline(callback: (data: { userId: string }) => void): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onUserOffline listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.USER_OFFLINE, callback);
    return () => this.socket?.off(SOCKET_EVENTS.USER_OFFLINE, callback);
  }

  onTypingStart(
    callback: (data: { userId: string; conversationId: string }) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onTypingStart listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.TYPING_START, callback);
    return () => this.socket?.off(SOCKET_EVENTS.TYPING_START, callback);
  }

  onTypingStop(
    callback: (data: { userId: string; conversationId: string }) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onTypingStop listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.TYPING_STOP, callback);
    return () => this.socket?.off(SOCKET_EVENTS.TYPING_STOP, callback);
  }

  onMessageReactionUpdated(
    callback: (data: {
      messageId: string;
      conversationId: string;
      reactions: any;
    }) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onMessageReactionUpdated listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.MESSAGE_REACTION_UPDATED, callback);
    return () =>
      this.socket?.off(SOCKET_EVENTS.MESSAGE_REACTION_UPDATED, callback);
  }

  // Group management socket methods
  async createGroup(data: CreateGroupData): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.CREATE_GROUP, data);
    } catch (error) {
      console.error("Failed to create group:", error);
      throw error;
    }
  }

  async updateGroupName(data: UpdateGroupNameData): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.UPDATE_GROUP_NAME, data);
    } catch (error) {
      console.error("Failed to update group name:", error);
      throw error;
    }
  }

  async addGroupMembers(data: AddGroupMemberData): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.ADD_GROUP_MEMBERS, data);
    } catch (error) {
      console.error("Failed to add group members:", error);
      throw error;
    }
  }

  async removeGroupMember(data: RemoveGroupMemberData): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.REMOVE_GROUP_MEMBER, data);
    } catch (error) {
      console.error("Failed to remove group member:", error);
      throw error;
    }
  }

  async leaveGroup(data: LeaveGroupData): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.LEAVE_GROUP, data);
    } catch (error) {
      console.error("Failed to leave group:", error);
      throw error;
    }
  }

  async transferGroupAdmin(data: TransferGroupAdminData): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.TRANSFER_GROUP_ADMIN, data);
    } catch (error) {
      console.error("Failed to transfer group admin:", error);
      throw error;
    }
  }

  // Group event listeners
  onGroupCreated(
    callback: (data: {
      conversation: SocketConversation;
      createdBy: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onGroupCreated listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.GROUP_CREATED, callback);
    return () => this.socket?.off(SOCKET_EVENTS.GROUP_CREATED, callback);
  }

  onGroupNameUpdated(
    callback: (data: {
      conversationId: string;
      newName: string;
      updatedBy: string;
      conversation: SocketConversation;
    }) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onGroupNameUpdated listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.GROUP_NAME_UPDATED, callback);
    return () => this.socket?.off(SOCKET_EVENTS.GROUP_NAME_UPDATED, callback);
  }

  onGroupMemberAdded(
    callback: (data: {
      conversationId: string;
      newMemberIds: string[];
      addedBy: string;
      conversation: SocketConversation;
    }) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onGroupMemberAdded listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.GROUP_MEMBER_ADDED, callback);
    return () => this.socket?.off(SOCKET_EVENTS.GROUP_MEMBER_ADDED, callback);
  }

  onGroupMemberRemoved(
    callback: (data: {
      conversationId: string;
      removedUserId: string;
      removedBy: string;
      conversation: SocketConversation;
    }) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onGroupMemberRemoved listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.GROUP_MEMBER_REMOVED, callback);
    return () => this.socket?.off(SOCKET_EVENTS.GROUP_MEMBER_REMOVED, callback);
  }

  onGroupMemberLeft(
    callback: (data: {
      conversationId: string;
      leftUserId: string;
      conversation?: SocketConversation;
    }) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onGroupMemberLeft listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.GROUP_MEMBER_LEFT, callback);
    return () => this.socket?.off(SOCKET_EVENTS.GROUP_MEMBER_LEFT, callback);
  }

  onGroupAdminTransferred(
    callback: (data: {
      conversationId: string;
      oldAdminId: string;
      newAdminId: string;
      conversation: SocketConversation;
    }) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onGroupAdminTransferred listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.GROUP_ADMIN_TRANSFERRED, callback);
    return () =>
      this.socket?.off(SOCKET_EVENTS.GROUP_ADMIN_TRANSFERRED, callback);
  }

  onGroupAvatarUpdated(
    callback: (data: {
      conversationId: string;
      avatar: string;
      updatedBy: string;
      conversation: SocketConversation;
    }) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onGroupAvatarUpdated listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.GROUP_AVATAR_UPDATED, callback);
    return () => this.socket?.off(SOCKET_EVENTS.GROUP_AVATAR_UPDATED, callback);
  }

  onError(callback: (error: any) => void): () => void {
    if (!this.socket) {
      console.warn("Socket not connected, cannot register onError listener");
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.ERROR, callback);
    return () => this.socket?.off(SOCKET_EVENTS.ERROR, callback);
  }

  onMessagesRead(
    callback: (data: {
      conversationId: string;
      userId: string;
      readAt: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      console.warn("Socket not connected, cannot register onMessagesRead listener");
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.MESSAGES_READ, callback);
    return () => this.socket?.off(SOCKET_EVENTS.MESSAGES_READ, callback);
  }

  onMessageEdited(
    callback: (data: {
      messageId: string;
      conversationId: string;
      updatedMessage: SocketMessage;
      editedBy: string;
      editedAt: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      console.warn("Socket not connected, cannot register onMessageEdited listener");
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.MESSAGE_EDITED, callback);
    return () => this.socket?.off(SOCKET_EVENTS.MESSAGE_EDITED, callback);
  }

  onMessageDeleted(
    callback: (data: {
      messageId: string;
      conversationId: string;
      deletedMessage: SocketMessage;
      deletedBy: string;
      deletedAt: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      console.warn("Socket not connected, cannot register onMessageDeleted listener");
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.MESSAGE_DELETED, callback);
    return () => this.socket?.off(SOCKET_EVENTS.MESSAGE_DELETED, callback);
  }

  // Dissolve group
  async dissolveGroup(data: DissolveGroupData): Promise<void> {
    try {
      if (!this.socket) {
        console.warn("Socket not connected, cannot dissolve group");
        return;
      }
      this.socket.emit(SOCKET_EVENTS.DISSOLVE_GROUP, data);
    } catch (error) {
      console.error("Failed to dissolve group:", error);
      throw error;
    }
  }

  onGroupDissolved(
    callback: (data: {
      conversationId: string;
      adminId: string;
      message: string;
    }) => void
  ): () => void {
    if (!this.socket) {
      console.warn(
        "Socket not connected, cannot register onGroupDissolved listener"
      );
      return () => {};
    }
    this.socket.on(SOCKET_EVENTS.GROUP_DISSOLVED, callback);
    return () => this.socket?.off(SOCKET_EVENTS.GROUP_DISSOLVED, callback);
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
