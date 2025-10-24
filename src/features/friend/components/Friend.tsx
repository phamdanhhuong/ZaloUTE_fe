"use client";
import React, { useState } from "react";
import { UserAddOutlined, TeamOutlined } from "@ant-design/icons";
import { ListFriend } from "./ListFriend";
import { FriendRequests } from "./FriendRequests";
import { useFriends, useFriendRequests } from "../hooks";
import type { User } from "../service";

interface FriendProps {
  onChatWithFriend?: (friend: User) => void;
  onViewProfile?: (friend: User) => void;
  onTabChange?: (tab: TabType) => void;
  activeTab?: TabType;
}

type TabType = "friends" | "groups" | "friend-requests" | "group-invites";

export const Friend: React.FC<FriendProps> = ({
  onChatWithFriend,
  onViewProfile,
  onTabChange,
  activeTab: externalActiveTab,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(
    externalActiveTab || "friends"
  );
  const { loading, friends } = useFriends();
  const { requests: friendRequests } = useFriendRequests();

  // Sync với external activeTab khi có thay đổi
  React.useEffect(() => {
    if (externalActiveTab && externalActiveTab !== activeTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Navigation Menu
  const NavMenu = () => (
    <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 8,
            borderRadius: 8,
            cursor: "pointer",
            transition: "background-color 0.2s",
            backgroundColor:
              activeTab === "friends" ? "#dbeafe" : "transparent",
          }}
          onClick={() => handleTabClick("friends")}
          onMouseEnter={(e) => {
            if (activeTab !== "friends") {
              e.currentTarget.style.backgroundColor = "#f9fafb";
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "friends") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <TeamOutlined
            style={{
              width: 20,
              height: 20,
              color: activeTab === "friends" ? "#0084ff" : "#6b7280",
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === "friends" ? "#0084ff" : "#111827",
            }}
          >
            Danh sách bạn bè
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 8,
            borderRadius: 8,
            cursor: "pointer",
            transition: "background-color 0.2s",
            backgroundColor: activeTab === "groups" ? "#dbeafe" : "transparent",
          }}
          onClick={() => handleTabClick("groups")}
          onMouseEnter={(e) => {
            if (activeTab !== "groups") {
              e.currentTarget.style.backgroundColor = "#f9fafb";
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "groups") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <TeamOutlined
            style={{
              width: 20,
              height: 20,
              color: activeTab === "groups" ? "#0084ff" : "#6b7280",
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === "groups" ? "#0084ff" : "#111827",
            }}
          >
            Danh sách nhóm và cộng đồng
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 8,
            backgroundColor:
              activeTab === "friend-requests" ? "#dbeafe" : "transparent",
            borderRadius: 8,
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onClick={() => handleTabClick("friend-requests")}
          onMouseEnter={(e) => {
            if (activeTab !== "friend-requests") {
              e.currentTarget.style.backgroundColor = "#f9fafb";
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "friend-requests") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <UserAddOutlined
            style={{
              width: 20,
              height: 20,
              color: activeTab === "friend-requests" ? "#0084ff" : "#6b7280",
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === "friend-requests" ? "#0084ff" : "#111827",
            }}
          >
            Lời mời kết bạn
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 8,
            borderRadius: 8,
            cursor: "pointer",
            transition: "background-color 0.2s",
            backgroundColor:
              activeTab === "group-invites" ? "#dbeafe" : "transparent",
          }}
          onClick={() => handleTabClick("group-invites")}
          onMouseEnter={(e) => {
            if (activeTab !== "group-invites") {
              e.currentTarget.style.backgroundColor = "#f9fafb";
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "group-invites") {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <TeamOutlined
            style={{
              width: 20,
              height: 20,
              color: activeTab === "group-invites" ? "#0084ff" : "#6b7280",
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === "group-invites" ? "#0084ff" : "#111827",
            }}
          >
            Lời mời vào nhóm và cộng đồng
          </span>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "friends":
        return (
          <ListFriend
            friends={friends}
            loading={loading}
            onChatWithFriend={onChatWithFriend}
            onViewProfile={onViewProfile}
          />
        );
      case "groups":
        return (
          <div style={{ padding: 20 }}>Danh sách nhóm (Chưa phát triển)</div>
        );
      case "friend-requests":
        return (
            <FriendRequests
            onAcceptRequest={(requestId) => {
              // Friend request accepted
            }}
            onRejectRequest={(requestId) => {
              // Friend request rejected
            }}
          />
        );
      case "group-invites":
        return (
          <div style={{ padding: 20 }}>Lời mời vào nhóm (Chưa phát triển)</div>
        );
      default:
        return <div style={{ padding: 20 }}>Chọn một mục từ menu</div>;
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <NavMenu />
      <div style={{ flex: 1, overflow: "hidden" }}>
        {/* Show summary in sidebar when used in ZaloLayout */}
        {onTabChange && (
          <div style={{ padding: 16, textAlign: "center", color: "#6b7280" }}>
            {activeTab === "friends" && `${friends.length} bạn bè`}
            {activeTab === "groups" && "Nhóm và cộng đồng"}
            {activeTab === "friend-requests" &&
              `${friendRequests.length} lời mời kết bạn`}
            {activeTab === "group-invites" && "Lời mời vào nhóm"}
          </div>
        )}
        {/* Show full content when used standalone */}
        {!onTabChange && <div>{renderTabContent()}</div>}
      </div>
    </div>
  );
};

export default Friend;
