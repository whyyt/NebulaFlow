"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ActivityMetadata, ActivityCategory, IncentiveType } from "../../lib/types";

interface ActivityDashboardProps {
  // 这些数据应该从ActivityRegistry获取
  activities: ActivityMetadata[];
  onRefresh: () => Promise<void>;
}

export function ActivityDashboard({ activities, onRefresh }: ActivityDashboardProps) {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<"public" | "private">("public");
  const [loading, setLoading] = useState(false);

  // 分离公开和私密活动
  const publicActivities = activities.filter(a => a.isPublic);
  const privateActivities = activities.filter(a => !a.isPublic);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 标签页 */}
      <div style={{
        display: "flex",
        gap: 12,
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        paddingBottom: 8,
      }}>
        <button
          onClick={() => setActiveTab("public")}
          style={{
            padding: "12px 24px",
            border: "none",
            borderBottom: activeTab === "public" ? "2px solid #a78bfa" : "2px solid transparent",
            background: "transparent",
            color: activeTab === "public" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 600,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (activeTab !== "public") {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "public") {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
            }
          }}
        >
          公开档案 ({publicActivities.length})
        </button>
        <button
          onClick={() => setActiveTab("private")}
          style={{
            padding: "12px 24px",
            border: "none",
            borderBottom: activeTab === "private" ? "2px solid #a78bfa" : "2px solid transparent",
            background: "transparent",
            color: activeTab === "private" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 600,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (activeTab !== "private") {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "private") {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
            }
          }}
        >
          私密档案 ({privateActivities.length})
        </button>
      </div>

      {/* 活动列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(activeTab === "public" ? publicActivities : privateActivities).map((activity, index) => (
          <ActivityCard key={index} activity={activity} />
        ))}

        {(activeTab === "public" ? publicActivities : privateActivities).length === 0 && (
          <div style={{
            padding: 48,
            textAlign: "center",
            borderRadius: 16,
            border: "1px dashed rgba(148,163,184,0.35)",
            color: "rgba(226,232,240,0.8)"
          }}>
            {activeTab === "public" 
              ? "暂无公开活动，参与Professional Web3或Social Web3活动后显示" 
              : "暂无私密活动，参与Lifestyle活动后显示"}
          </div>
        )}
      </div>

      {/* 刷新按钮 */}
      <button
        onClick={handleRefresh}
        disabled={loading}
        style={{
          padding: "12px 24px",
          borderRadius: 12,
          border: "1px solid rgba(255, 255, 255, 0.2)",
          background: "rgba(255, 255, 255, 0.05)",
          color: "#ffffff",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 14,
          fontWeight: 500,
          alignSelf: "flex-start",
          transition: "all 0.2s",
          opacity: loading ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
          }
        }}
      >
        {loading ? "刷新中..." : "刷新活动列表"}
      </button>
    </div>
  );
}

function ActivityCard({ activity }: { activity: ActivityMetadata }) {
  const categoryLabels = {
    [ActivityCategory.ProfessionalWeb3]: "Professional Web3",
    [ActivityCategory.SocialWeb3]: "Social Web3",
    [ActivityCategory.Lifestyle]: "Lifestyle"
  };

  const incentiveLabels = {
    [IncentiveType.DepositPool]: "押金奖池",
    [IncentiveType.NFTReward]: "NFT奖励"
  };

  return (
    <div style={{
      padding: 24,
      borderRadius: 20,
      border: "1px solid rgba(255, 255, 255, 0.1)",
      background: "rgba(255, 255, 255, 0.05)",
      backdropFilter: "blur(10px)",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      transition: "all 0.2s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
    }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#ffffff" }}>{activity.title}</h3>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <span style={{
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12,
            background: "rgba(167, 139, 250, 0.2)",
            color: "#a78bfa",
            border: "1px solid rgba(167, 139, 250, 0.3)",
          }}>
            {categoryLabels[activity.category]}
          </span>
          <span style={{
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12,
            background: "rgba(236, 72, 153, 0.2)",
            color: "#ec4899",
            border: "1px solid rgba(236, 72, 153, 0.3)",
          }}>
            {incentiveLabels[activity.incentiveType]}
          </span>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 14, opacity: 0.8, lineHeight: 1.6, color: "#ffffff" }}>
        {activity.description}
      </p>

      <div style={{ display: "flex", gap: 16, fontSize: 12, opacity: 0.6, color: "#ffffff", flexWrap: "wrap" }}>
        <span>创建者: {activity.creator.slice(0, 6)}...{activity.creator.slice(-4)}</span>
        <span>合约: {activity.activityContract.slice(0, 6)}...{activity.activityContract.slice(-4)}</span>
      </div>
    </div>
  );
}

