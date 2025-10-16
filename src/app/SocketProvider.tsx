"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import socketService, { SOCKET_EVENTS } from "@/infrastructure/socket/socketService";
import { Modal } from "antd";
import { notification } from "antd";

// Prefix constants used by call control messages
const CALL_INVITE_PREFIX = "[CALL_INVITE]";
const CALL_ACCEPT_PREFIX = "[CALL_ACCEPT]";
const CALL_REJECT_PREFIX = "[CALL_REJECT]";

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const tokenFromStore = useSelector((s: RootState) => s.user.token);
  const currentUser = useSelector((s: RootState) => s.user.user);
  const activeConversationId = useSelector((s: RootState) => s.chat.activeConversationId);
  const dispatch = useDispatch();
  // also fallback to localStorage for cases when provider mounts before store init
  const getToken = () => typeof window !== "undefined" ? (tokenFromStore || localStorage.getItem("token")) : tokenFromStore;
  const token = getToken();
  const connectingRef = useRef(false);
  const [connected, setConnected] = useState<boolean>(socketService.isConnected());
  const receiveUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;

    const doConnect = async () => {
      const t = getToken();
      if (!t) return;
      if (socketService.isConnected() || connectingRef.current) return;
      connectingRef.current = true;
      try {
        await socketService.connect(t);
        if (!mounted) return;
        setConnected(true);
        // Attach a global listener for incoming messages so we can notify about call invites
        try {
          // remove previous listener if any
          if (receiveUnsubRef.current) {
            receiveUnsubRef.current();
            receiveUnsubRef.current = null;
          }

          // unified handler for both event shapes
          const handleIncoming = async (payloadOrMessage: any, isIncomingEvent = false) => {
            const message = isIncomingEvent ? payloadOrMessage?.message : payloadOrMessage;
            if (!message) return;
            try {
              const content = message?.content || "";
              const senderId = message?.sender?._id;
              if (typeof content === 'string' && content.startsWith(CALL_INVITE_PREFIX) && senderId !== currentUser?.id && activeConversationId !== message.conversation) {
                let payload = null;
                try { payload = JSON.parse(content.substring(CALL_INVITE_PREFIX.length)); } catch (e) { /* ignore */ }
                const room = payload?.room;

                Modal.confirm({
                  title: 'Cuộc gọi đến',
                  content: `${message.sender?.firstName || message.sender?.username || 'Người lạ'} đang gọi`,
                  okText: 'Chấp nhận',
                  cancelText: 'Từ chối',
                  onOk: async () => {
                    try {
                      await socketService.sendMessage({ conversationId: message.conversation, content: CALL_ACCEPT_PREFIX + JSON.stringify({ room }) });
                      window.open(`/call?room=${encodeURIComponent(room)}`, '_blank');
                    } catch (err) {
                      notification.error({ message: 'Không thể chấp nhận cuộc gọi', description: String(err) });
                    }
                  },
                  onCancel: async () => {
                    try {
                      await socketService.sendMessage({ conversationId: message.conversation, content: CALL_REJECT_PREFIX + JSON.stringify({ room }) });
                      notification.info({ message: 'Cuộc gọi đã bị từ chối' });
                    } catch (err) {
                      notification.error({ message: 'Không thể gửi phản hồi từ chối', description: String(err) });
                    }
                  }
                });
              }
            } catch (e) {
              // ignore handler errors
            }
          };

          if (typeof socketService.onIncomingCall === 'function') {
            receiveUnsubRef.current = socketService.onIncomingCall((d: any) => void handleIncoming(d, true));
          } else {
            receiveUnsubRef.current = socketService.onReceiveMessage((m: any) => void handleIncoming(m, false));
          }
        } catch (e) {
          // ignore attaching errors
        }
      } catch (e) {
        console.error("SocketProvider: connect failed", e);
        if (!mounted) return;
        setConnected(false);
      } finally {
        connectingRef.current = false;
      }
    };

    doConnect();

    return () => {
      mounted = false;
    };
  }, [tokenFromStore]);

  // disconnect when token removed
  useEffect(() => {
    const t = getToken();
    if (!t && socketService.isConnected()) {
      try {
        socketService.disconnect();
      } catch (e) {
        // ignore
      }
      setConnected(false);
    }
  }, [tokenFromStore]);

  // expose connection state via a global for quick debugging in dev
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__socketConnected = connected;
    }
    return () => {
      if (typeof window !== "undefined") (window as any).__socketConnected = false;
      // cleanup global receive listener
      try {
        if (receiveUnsubRef.current) {
          receiveUnsubRef.current();
          receiveUnsubRef.current = null;
        }
      } catch (e) {
        // ignore
      }
    };
  }, [connected]);

  return <>{children}</>;
}
