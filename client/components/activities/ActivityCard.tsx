"use client";

import { ActivityMetadata } from "../../lib/types";
import { useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { CHALLENGE_ABI } from "../../lib/activityRegistry";
import { formatEther } from "viem";

interface ActivityCardProps {
  activity: ActivityMetadata & { activityId?: number };
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  // 读取链上状态
  const { data: participantInfo } = useReadContract({
    address: activity.activityContract as `0x${string}` | undefined,
    abi: CHALLENGE_ABI,
    functionName: "getParticipantInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: !!activity.activityContract && !!address && isConnected
    }
  });

  const { data: challengeStatus } = useReadContract({
    address: activity.activityContract as `0x${string}` | undefined,
    abi: CHALLENGE_ABI,
    functionName: "viewStatus",
    query: {
      enabled: !!activity.activityContract
    }
  });

  const { data: rewardPerWinner } = useReadContract({
    address: activity.activityContract as `0x${string}` | undefined,
    abi: CHALLENGE_ABI,
    functionName: "rewardPerWinner",
    query: {
      enabled: !!activity.activityContract
    }
  });

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  // 点击跳转到活动详情页
  const handleClick = () => {
    if (activity.activityId !== undefined) {
      router.push(`/activities/${activity.activityId}`);
    } else {
      console.warn("Activity ID not available, cannot navigate to detail page");
    }
  };

  // 判断状态
  const isEliminated = participantInfo?.[1] || false;
  const isCompleted = participantInfo?.[6] || false;
  const isSettled = challengeStatus === 2; // Status.Settled = 2
  const hasReward = isSettled && isCompleted && rewardPerWinner !== undefined;

  return (
    <div
      onClick={handleClick}
      style={{
        padding: 24,
        borderRadius: 20,
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        transition: "all 0.3s",
        cursor: "pointer",
        // 淘汰状态：灰度化
        opacity: isEliminated ? 0.5 : 1,
        filter: isEliminated ? "grayscale(80%)" : "none",
        // 完成状态：高亮边框
        borderColor: isCompleted && !isEliminated 
          ? "rgba(251, 191, 36, 0.5)" 
          : isEliminated 
          ? "rgba(239, 68, 68, 0.3)" 
          : "rgba(255, 255, 255, 0.1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.3)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
      }}
    >
      {/* 状态标识区域 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {/* isPublic 状态标识 */}
        <div
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            background: activity.isPublic 
              ? "rgba(34, 211, 238, 0.2)" 
              : "rgba(251, 191, 36, 0.2)",
            color: activity.isPublic 
              ? "#22d3ee" 
              : "#fbbf24",
            border: `1px solid ${activity.isPublic ? "rgba(34, 211, 238, 0.3)" : "rgba(251, 191, 36, 0.3)"}`
          }}
        >
          {activity.isPublic ? "公开活动" : "私有活动（仅调试可见）"}
        </div>

        {/* 淘汰状态 */}
        {isEliminated && (
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              background: "rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
              border: "1px solid rgba(239, 68, 68, 0.3)"
            }}
          >
            ❌ 已淘汰
          </div>
        )}

        {/* 已完成待结算 */}
        {isCompleted && !isEliminated && !isSettled && (
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              background: "rgba(251, 191, 36, 0.2)",
              color: "#fbbf24",
              border: "1px solid rgba(251, 191, 36, 0.3)"
            }}
          >
            🎯 已完成待结算
          </div>
        )}

        {/* 已结算 - 显示奖励 */}
        {hasReward && (
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              background: "rgba(34, 197, 94, 0.2)",
              color: "#86efac",
              border: "1px solid rgba(34, 197, 94, 0.3)"
            }}
          >
            💰 {formatEther(rewardPerWinner)} ETH
          </div>
        )}
      </div>

      {/* 标题 */}
      <h3
        style={{
          fontSize: 20,
          fontWeight: 600,
          margin: "0 0 12px 0",
          color: "#ffffff",
        }}
      >
        {activity.title}
      </h3>

      {/* 描述 */}
      <p
        style={{
          fontSize: 14,
          opacity: 0.8,
          lineHeight: 1.6,
          margin: "0 0 16px 0",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {activity.description}
      </p>

      {/* 底部信息 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          opacity: 0.6,
          paddingTop: 16,
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <span>创建者: {activity.creator.slice(0, 6)}...{activity.creator.slice(-4)}</span>
        <span>{formatDate(activity.createdAt)}</span>
      </div>
    </div>
  );
}

