import io from "socket.io-client";
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

  // Conversation events
  GET_CONVERSATIONS: "get_conversations",
  GET_CONVERSATIONS_RESULT: "get_conversations_result",
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
  // Call / WebRTC signaling events
  CALL_JOIN: 'call_join',
  CALL_USER_JOINED: 'call_user_joined',
  CALL_OFFER: 'call_offer',
  CALL_ANSWER: 'call_answer',
  CALL_ICE_CANDIDATE: 'call_ice_candidate',
  CALL_USER_LEFT: 'call_user_left',
  CALL_HANGUP: 'call_hangup',
} as const;

class SocketService {
  private socket: ReturnType<typeof io> | null = null;
  private token: string | null = null;
  // pending listeners to attach once socket is created
  private pendingListeners: Map<string, Function[]> = new Map();
  // track whether we've already attempted a polling fallback for this connect call
  private triedPolling = false;
  // remember last computed origin and path so fallback keeps same namespace
  private lastSocketOrigin: string | null = null;
  private lastSocketPath: string | null = null;

  // helper to attach common listeners to a socket instance and wire resolve/reject
  private setupSocketListeners(
    socketInstance: ReturnType<typeof io>,
    resolve: () => void,
    reject: (err: any) => void
  ) {
    socketInstance.on("connect", () => {
      // socket connected
      // flush pending listeners
      this.pendingListeners.forEach((cbs, evt) => {
        cbs.forEach((cb) => socketInstance.on(evt, cb as any));
      });
      this.pendingListeners.clear();
      resolve();
    });

    socketInstance.on("connect_error", (error: any) => {
      try {
        console.error("Socket connection error:", error && (error.message || error));
        if ((error as any).data) console.error("Socket connect_error data:", (error as any).data);
      } catch (e) {
        console.error("Socket connect_error (unable to stringify):", error);
      }

      // extra debug: manager uri/options/engine state to help diagnose handshake
      try {
        const manager = (socketInstance as any).io;
        console.log('connect_error context:', {
          managerUri: manager?.uri,
          opts: manager?.opts,
          // engine might be undefined at this point, but log name if present
          engineTransport: manager?.engine?.transport?.name || manager?.engine?.transport?.name === '' ? manager?.engine?.transport?.name : undefined,
        });
      } catch (e) {
        // ignore debug failures
      }

      // If upgrade to websocket failed, try polling once as a fallback (server may block websockets)
      if (!this.triedPolling) {
        console.warn("Attempting polling fallback for socket (websocket upgrade failed)");
        this.triedPolling = true;
        try {
          socketInstance.disconnect();
        } catch (e) {}

        // create a new socket instance forcing polling transport
        const fallbackOrigin = this.lastSocketOrigin || (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080");
        const fallbackPath = this.lastSocketPath || (process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io");
        this.socket = io(fallbackOrigin, {
          path: fallbackPath,
          auth: { token: this.token },
          query: { token: this.token || "" },
          transports: ["polling"],
          timeout: 20000,
          forceNew: true,
        });

        // attach listeners to the new instance (resolve/reject the original promise accordingly)
        this.setupSocketListeners(this.socket, resolve, reject);
        return;
      }

      reject(error);
    });

    socketInstance.on("disconnect", (reason: any) => {
      console.warn("Socket disconnected:", reason);
    });
  }

  // Initialize socket connection
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.token = token;

      const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080";
      const configuredSocketPath = process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io";

      // If NEXT_PUBLIC_SOCKET_URL includes a pathname (e.g. /chat), parse and combine
      // so we connect to origin with path '/chat/socket.io' instead of to '/socket.io' at root.
      try {
        const parsed = new URL(configuredSocketUrl);
        const origin = parsed.origin; // e.g. http://localhost:8080
        const urlBasePath = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/$/, "") : ""; // '/chat' or ''
        // Use baseUrl including pathname as the socket endpoint (so namespace is part of the URL),
        // and use the engine.io/socket.io path separately (usually '/socket.io').
        const baseUrl = `${origin}${urlBasePath}`; // e.g. http://localhost:8080/chat or http://localhost:8080
        const engineIoPath = configuredSocketPath; // usually '/socket.io'

        this.lastSocketOrigin = baseUrl;
        this.lastSocketPath = engineIoPath;

        console.log("Socket connecting to:", { socketUrl: configuredSocketUrl, baseUrl, engineIoPath, authTokenPresent: !!token });

        this.socket = io(baseUrl, {
          // path should be the engine.io/socket.io path (not include the namespace segment)
          path: engineIoPath,
          // Send token both in auth and query to support various server-side handshake implementations
          auth: { token },
          query: { token },
          transports: ["websocket", "polling"],
          timeout: 20000,
          forceNew: true,
        });
      } catch (e) {
        // on any parse failure fall back to raw values
        const socketUrl = configuredSocketUrl;
        const socketPath = configuredSocketPath;
        // fallback: preserve the raw configured values
        this.lastSocketOrigin = socketUrl;
        this.lastSocketPath = socketPath;
        console.log("Socket connecting to (fallback):", { socketUrl, socketPath, authTokenPresent: !!token });
        this.socket = io(socketUrl, {
          path: socketPath,
          auth: { token },
          query: { token },
          transports: ["websocket", "polling"],
          timeout: 20000,
          forceNew: true,
        });
      }

      // immediate debug: show manager uri/opts so browser console shows exact request target
      try {
        const manager = (this.socket as any).io;
        console.log('Socket created (manager context):', {
          managerUri: manager?.uri,
          opts: manager?.opts,
          socketOrigin: this.lastSocketOrigin,
          socketPath: this.lastSocketPath,
        });
      } catch (e) {
        // ignore
      }

      this.socket.on("connect", () => {
        // socket connected
        // flush pending listeners
        this.pendingListeners.forEach((cbs, evt) => {
          cbs.forEach((cb) => this.socket?.on(evt, cb as any));
        });
        this.pendingListeners.clear();
        resolve();
      });

      this.socket.on("connect_error", (error: any) => {
        // Provide expanded info to help debugging handshake failures (CORS, auth, namespace mismatch)
        try {
          console.error("Socket connection error:", error && (error.message || error));
          if ((error as any).data) {
            console.error("Socket connect_error data:", (error as any).data);
          }
        } catch (e) {
          console.error("Socket connect_error (unable to stringify):", error);
        }
        reject(error);
      });

      this.socket.on("disconnect", (reason: any) => {
        console.warn("Socket disconnected:", reason);
      });

      this.socket.on(SOCKET_EVENTS.CONNECTION_SUCCESS, (_data: any) => {
        // connection successful
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
      // socket disconnected
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
  // debug: sent add reaction
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
    this.socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, callback);
    return () => this.socket?.off(SOCKET_EVENTS.RECEIVE_MESSAGE, callback);
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

  onIncomingCall(callback: (data: { conversationId: string; message: SocketMessage }) => void): () => void {
    if (!this.socket) {
      console.warn("Socket not connected, cannot register onIncomingCall listener");
      return () => {};
    }
    this.socket.on((SOCKET_EVENTS as any).INCOMING_CALL || 'incoming_call', callback);
    return () => this.socket?.off((SOCKET_EVENTS as any).INCOMING_CALL || 'incoming_call', callback);
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

  // --- Call / WebRTC signaling methods ---
  async joinCall(room: string): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.CALL_JOIN, { room });
    } catch (error) {
      console.error('Failed to join call room:', error);
      throw error;
    }
  }

  async leaveCall(room: string): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.CALL_HANGUP, { room });
    } catch (error) {
      console.error('Failed to leave call room:', error);
      throw error;
    }
  }

  async sendCallOffer(target: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.CALL_OFFER, { target, offer });
    } catch (error) {
      console.error('Failed to send call offer:', error);
      throw error;
    }
  }

  async sendCallAnswer(target: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.CALL_ANSWER, { target, answer });
    } catch (error) {
      console.error('Failed to send call answer:', error);
      throw error;
    }
  }

  async sendCallIceCandidate(target: string, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.CALL_ICE_CANDIDATE, { target, candidate });
    } catch (error) {
      console.error('Failed to send ICE candidate:', error);
      throw error;
    }
  }

  async sendCallHangup(target?: string, room?: string): Promise<void> {
    try {
      await this.waitForConnection();
      this.socket!.emit(SOCKET_EVENTS.CALL_HANGUP, { target, room });
    } catch (error) {
      console.error('Failed to send call hangup:', error);
      throw error;
    }
  }

  onCallOffer(callback: (data: { from: string; offer: RTCSessionDescriptionInit }) => void): () => void {
    const evt = SOCKET_EVENTS.CALL_OFFER;
    if (!this.socket) {
      const arr = this.pendingListeners.get(evt) ?? [];
      arr.push(callback);
      this.pendingListeners.set(evt, arr);
      return () => {
        // remove from pending if still there
        const cur = this.pendingListeners.get(evt) ?? [];
        this.pendingListeners.set(evt, cur.filter((c) => c !== callback));
      };
    }
    this.socket.on(evt, callback);
    return () => this.socket?.off(evt, callback);
  }

  onCallAnswer(callback: (data: { from: string; answer: RTCSessionDescriptionInit }) => void): () => void {
    const evt = SOCKET_EVENTS.CALL_ANSWER;
    if (!this.socket) {
      const arr = this.pendingListeners.get(evt) ?? [];
      arr.push(callback);
      this.pendingListeners.set(evt, arr);
      return () => {
        const cur = this.pendingListeners.get(evt) ?? [];
        this.pendingListeners.set(evt, cur.filter((c) => c !== callback));
      };
    }
    this.socket.on(evt, callback);
    return () => this.socket?.off(evt, callback);
  }

  onCallIceCandidate(callback: (data: { from: string; candidate: RTCIceCandidateInit }) => void): () => void {
    const evt = SOCKET_EVENTS.CALL_ICE_CANDIDATE;
    if (!this.socket) {
      const arr = this.pendingListeners.get(evt) ?? [];
      arr.push(callback);
      this.pendingListeners.set(evt, arr);
      return () => {
        const cur = this.pendingListeners.get(evt) ?? [];
        this.pendingListeners.set(evt, cur.filter((c) => c !== callback));
      };
    }
    this.socket.on(evt, callback);
    return () => this.socket?.off(evt, callback);
  }

  onCallUserJoined(callback: (data: { socketId: string }) => void): () => void {
    const evt = SOCKET_EVENTS.CALL_USER_JOINED;
    if (!this.socket) {
      const arr = this.pendingListeners.get(evt) ?? [];
      arr.push(callback);
      this.pendingListeners.set(evt, arr);
      return () => {
        const cur = this.pendingListeners.get(evt) ?? [];
        this.pendingListeners.set(evt, cur.filter((c) => c !== callback));
      };
    }
    this.socket.on(evt, callback);
    return () => this.socket?.off(evt, callback);
  }

  onCallUserLeft(callback: (data: { socketId: string }) => void): () => void {
    const evt = SOCKET_EVENTS.CALL_USER_LEFT;
    if (!this.socket) {
      const arr = this.pendingListeners.get(evt) ?? [];
      arr.push(callback);
      this.pendingListeners.set(evt, arr);
      return () => {
        const cur = this.pendingListeners.get(evt) ?? [];
        this.pendingListeners.set(evt, cur.filter((c) => c !== callback));
      };
    }
    this.socket.on(evt, callback);
    return () => this.socket?.off(evt, callback);
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;

// Dev helper: expose socketService on window for quick inspection in browser devtools
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  try {
    (window as any).__socketService = socketService;
    console.log("Dev: socketService attached to window.__socketService");
  } catch (e) {
    // ignore in case strict CSP or other issues
  }
}
