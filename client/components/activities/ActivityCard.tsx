"use client";

import { ActivityMetadata, IncentiveType } from "../../lib/types";
import { useRouter, usePathname } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { CHALLENGE_ABI } from "../../lib/activityRegistry";
import { formatEther } from "viem";

interface ActivityCardProps {
  activity: ActivityMetadata & { activityId?: number };
  hideIfSettled?: boolean; // 如果为 true，当活动已结束时返回 null
}

export function ActivityCard({ activity, hideIfSettled = false }: ActivityCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const isProfilePage = pathname === "/profile"; // 判断是否在 My Journey 页面
  
  // 所有活动都是押金模式
  const activityABI = CHALLENGE_ABI;
  
  // 读取链上状态
  const { data: participantInfo } = useReadContract({
    address: activity.activityContract as `0x${string}` | undefined,
    abi: activityABI,
    functionName: "getParticipantInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: !!activity.activityContract && !!address && isConnected
    }
  });

  const { data: challengeStatus } = useReadContract({
    address: activity.activityContract as `0x${string}` | undefined,
    abi: activityABI,
    functionName: "viewStatus",
    query: {
      enabled: !!activity.activityContract
    }
  });

  // 奖励金额
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

  // 生成钱包头像（基于地址）
  const getWalletAvatar = (addr: string) => {
    if (!addr) return "";
    return `https://effigy.im/a/${addr}.svg`;
  };

  // 获取创建者地址（优先使用 creator，如果没有则使用 creatorName）
  const creatorAddress = activity.creator || "";

  // 点击跳转到活动详情页
  const handleClick = () => {
    if (activity.activityId !== undefined) {
      // 如果在 My Journey 页面，添加 from=profile 参数
      const url = isProfilePage 
        ? `/activities/${activity.activityId}?from=profile`
        : `/activities/${activity.activityId}`;
      router.push(url);
    } else {
      console.warn("Activity ID not available, cannot navigate to detail page");
    }
  };

  // 判断状态
  const isEliminated = participantInfo?.[1] || false;
  const isCompleted = participantInfo?.[6] || false;
  const isSettled = challengeStatus === 2; // Status.Settled = 2
  const isScheduled = challengeStatus === 0; // Status.Scheduled = 0
  const isActive = challengeStatus === 1; // Status.Active = 1
  const hasReward = isSettled && isCompleted && rewardPerWinner !== undefined;

  // 如果 hideIfSettled 为 true 且活动已结束，返回 null
  if (hideIfSettled && isSettled) {
    return null;
  }

  // fix: 移除在 My Journey 页面自动隐藏被淘汰活动的逻辑，让筛选功能控制显示

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
        // 完成状态：高亮边框（My Journey 页面成功坚持的活动边框为金黄色）
        borderColor: isProfilePage 
          ? (isCompleted && !isEliminated 
              ? "rgba(251, 191, 36, 0.8)" // fix: My Journey 页面成功坚持的活动边框为金黄色
              : isEliminated
              ? "rgba(239, 68, 68, 0.3)" // 被淘汰的活动为红色边框
              : "rgba(255, 255, 255, 0.1)") // 其他活动为默认边框
          : isCompleted && !isEliminated 
          ? "rgba(251, 191, 36, 0.5)"
          : isEliminated 
          ? "rgba(239, 68, 68, 0.3)" 
          : "rgba(255, 255, 255, 0.1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.3)";
        // fix: My Journey 页面成功坚持的活动悬停时保持金黄色边框
        if (isProfilePage && isCompleted && !isEliminated) {
          e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.9)"; // 悬停时稍微加深金黄色
        } else if (isProfilePage && isEliminated) {
          e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)"; // 被淘汰的活动悬停时加深红色
        } else if (!isProfilePage) {
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)"; // 其他页面保持原有逻辑
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        // fix: My Journey 页面成功坚持的活动离开时恢复金黄色边框
        if (isProfilePage && isCompleted && !isEliminated) {
          e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.8)"; // 恢复金黄色
        } else if (isProfilePage && isEliminated) {
          e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)"; // 恢复红色
        } else if (!isProfilePage) {
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; // 其他页面保持原有逻辑
        } else {
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; // 默认边框
        }
      }}
    >
      {/* 状态标识区域 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {/* 未开始状态 - 灰色 */}
        {isScheduled && (
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              background: "rgba(156, 163, 175, 0.2)",
              color: "#9ca3af",
              border: "1px solid rgba(156, 163, 175, 0.3)"
            }}
          >
            未开始
          </div>
        )}

        {/* 进行中状态 - 绿色 */}
        {isActive && (
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
            进行中
          </div>
        )}
        
        {/* 活动模式标识 - 仅在非 My Journey 页面显示 */}
        {!isProfilePage && (
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              background: "rgba(34, 211, 238, 0.2)",
              color: "#22d3ee",
              border: "1px solid rgba(34, 211, 238, 0.3)"
            }}
          >
            💰 押金奖池
          </div>
        )}

        {/* 已结算 - 显示奖励（仅在非 My Journey 页面显示在状态区域） */}
        {!isProfilePage && hasReward && rewardPerWinner !== undefined && (
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

      {/* 描述 - 仅在 Activity Hub 页面显示 */}
      {!isProfilePage && activity.description && (
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
            color: "#ffffff",
          }}
        >
          {activity.description}
        </p>
      )}

      {/* 押金奖池和奖金 - 描述下方并排显示（仅 My Journey 页面） */}
      {isProfilePage && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {/* 押金奖池 */}
          <div
            style={{
              display: "inline-block",
              padding: "6px 14px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              background: "rgba(34, 211, 238, 0.2)",
              color: "#22d3ee",
              border: "1px solid rgba(34, 211, 238, 0.3)"
            }}
          >
            💰 押金奖池
          </div>

          {/* 已结算 - 显示奖励（保留4位小数） */}
          {hasReward && rewardPerWinner !== undefined && (
            <div
              style={{
                display: "inline-block",
                padding: "6px 14px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                background: "rgba(34, 197, 94, 0.2)",
                color: "#86efac",
                border: "1px solid rgba(34, 197, 94, 0.3)"
              }}
            >
              💰 {parseFloat(formatEther(rewardPerWinner)).toFixed(4)} ETH
            </div>
          )}
        </div>
      )}

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
        {creatorAddress && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src={getWalletAvatar(creatorAddress)}
              alt="creator avatar"
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
              onError={(e) => {
                // 如果头像加载失败，使用默认头像
                (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="10" fill="%23${creatorAddress.slice(2, 8)}"/></svg>`;
              }}
            />
            <span>{creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}</span>
          </div>
        )}
        <span>{formatDate(activity.createdAt)}</span>
      </div>
    </div>
  );
}

