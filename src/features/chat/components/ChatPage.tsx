"use client";

import React, { useState, useEffect } from "react";
import { Layout, message } from "antd";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useSocket } from "../hooks/useSocket";
import { ConversationList } from "./ConversationListNew";
import { ChatArea } from "./ChatAreaNew";
import { SocketConversation } from "@/infrastructure/socket/socketService";
import styles from "./ChatPage.module.css";

const { Sider, Content } = Layout;

export const ChatPage: React.FC = () => {
  const { isConnected, error } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.user);
  const [selectedConversation, setSelectedConversation] = useState<SocketConversation | undefined>();
  const [siderCollapsed, setSiderCollapsed] = useState(false);

  // Show error messages
  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  // Auto-hide sider on mobile
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        setSiderCollapsed(true);
      } else {
        setSiderCollapsed(false);
      }
    };

    handleResize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const handleSelectConversation = (conversation: SocketConversation) => {
    setSelectedConversation(conversation);
    
    // On mobile, hide sidebar when conversation is selected
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSiderCollapsed(true);
    }
  };

  const handleBackToConversations = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSiderCollapsed(false);
      setSelectedConversation(undefined);
    }
  };

  if (!user) {
    return (
      <div className={styles.chatPage}>
        <div className={styles.authRequired}>
          <h3>Bạn cần đăng nhập để sử dụng tính năng chat</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatPage}>
      <Layout className={styles.chatLayout}>
        {/* Conversation List Sidebar */}
        <Sider
          className={styles.sider}
          width={360}
          collapsed={siderCollapsed}
          collapsedWidth={0}
          trigger={null}
          collapsible
        >
          <ConversationList onSelectConversation={handleSelectConversation} />
        </Sider>

        {/* Chat Content */}
        <Layout className={styles.contentLayout}>
          <Content className={styles.content}>
            <ChatArea 
              conversation={selectedConversation}
            />
          </Content>
        </Layout>

        {/* Mobile Back Button */}
        {selectedConversation && typeof window !== 'undefined' && window.innerWidth <= 768 && (
          <button 
            className={styles.backButton}
            onClick={handleBackToConversations}
          >
            ← Quay lại
          </button>
        )}
      </Layout>

      {/* Connection Status */}
      {!isConnected && (
        <div className={styles.connectionStatus}>
          <span>Đang kết nối lại...</span>
        </div>
      )}
    </div>
  );
};
