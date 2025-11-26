"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ActivityMetadata } from "../../lib/types";

interface ActivityDashboardProps {
  // 这些数据应该从ActivityRegistry获取
  activities: ActivityMetadata[];
  onRefresh: () => Promise<void>;
}

export function ActivityDashboard({ activities, onRefresh }: ActivityDashboardProps) {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);

  // 所有活动都显示在公开档案中
  const publicActivities = activities;

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
      {/* 活动列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {publicActivities.map((activity, index) => (
          <ActivityCard key={index} activity={activity} />
        ))}

        {publicActivities.length === 0 && (
          <div style={{
            padding: 48,
            textAlign: "center",
            borderRadius: 16,
            border: "1px dashed rgba(148,163,184,0.35)",
            color: "rgba(226,232,240,0.8)"
          }}>
            暂无活动，快去创建第一个活动吧！
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

