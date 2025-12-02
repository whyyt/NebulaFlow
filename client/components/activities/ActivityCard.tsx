"use client";

import { ActivityMetadata, IncentiveType } from "../../lib/types";
import { useRouter, usePathname } from "next/navigation";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { CHALLENGE_ABI, ACTIVITY_REGISTRY_ABI } from "../../lib/activityRegistry";
import { formatEther } from "viem";

interface ActivityCardProps {
  activity: ActivityMetadata & { activityId?: number };
  hideIfSettled?: boolean; // 如果为 true，当活动已结束时返回 null
  hideIfActive?: boolean; // 如果为 true，当活动进行中时返回 null
}

export function ActivityCard({ activity, hideIfSettled = false, hideIfActive = false }: ActivityCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const isProfilePage = pathname === "/profile"; // 判断是否在 My Journey 页面
  
  // 所有活动都是押金模式
  const activityABI = CHALLENGE_ABI;
  
  // ActivityRegistry 地址（需要从环境或配置中获取，这里使用硬编码）
  const ACTIVITY_REGISTRY_ADDRESS = "0x9E545E3C0baAB3E08CdfD552C960A1050f373042";
  
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
  const handleClick = async () => {
    let targetActivityId = activity.activityId;
    
    // 如果 activityId 不存在，尝试通过 activityContract 从 ActivityRegistry 查询
    if (targetActivityId === undefined && activity.activityContract && publicClient) {
      try {
        const activityId = await publicClient.readContract({
          address: ACTIVITY_REGISTRY_ADDRESS as `0x${string}`,
          abi: ACTIVITY_REGISTRY_ABI,
          functionName: "contractToActivity",
          args: [activity.activityContract as `0x${string}`]
        }) as bigint;
        
        if (activityId && activityId !== BigInt(0)) {
          targetActivityId = Number(activityId);
        }
      } catch (err) {
        console.error("Failed to query activityId from ActivityRegistry:", err);
      }
    }
    
    if (targetActivityId !== undefined) {
      // 如果在 My Journey 页面，添加 from=profile 参数
      const url = isProfilePage 
        ? `/activities/${targetActivityId}?from=profile`
        : `/activities/${targetActivityId}`;
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

  // 如果 hideIfActive 为 true 且活动进行中，返回 null
  if (hideIfActive && isActive) {
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
        // Activity Hub 页面：不显示用户个人状态，只显示活动的全局状态
        // My Journey 页面：显示用户个人状态（淘汰、完成等）
        opacity: isProfilePage && isEliminated ? 0.5 : 1,
        filter: isProfilePage && isEliminated ? "grayscale(80%)" : "none",
        // My Journey 页面边框颜色：
        // - 成功坚持（isSettled && isCompleted && !isEliminated）：金黄色边框
        // - 进行中状态（isActive）：灰色边框（无论是否已完成）
        // - 被淘汰（isEliminated）：红色边框
        // - 其他：默认边框
        borderColor: isProfilePage 
          ? (isSettled && isCompleted && !isEliminated 
              ? "rgba(251, 191, 36, 0.8)" // 成功坚持的活动边框为金黄色（只有活动已结束且已完成才是成功坚持）
              : isEliminated
              ? "rgba(239, 68, 68, 0.3)" // 被淘汰的活动为红色边框
              : isActive
              ? "rgba(156, 163, 175, 0.5)" // 进行中状态为灰色边框（无论是否已完成）
              : "rgba(255, 255, 255, 0.1)") // 其他活动为默认边框
          : "rgba(255, 255, 255, 0.1)", // Activity Hub 页面：统一使用默认边框，不随用户操作变化
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.3)";
        // My Journey 页面悬停时边框变亮
        if (isProfilePage && isSettled && isCompleted && !isEliminated) {
          e.currentTarget.style.borderColor = "rgba(251, 191, 36, 1)"; // 成功坚持的活动悬停时边框变亮（金黄色）
        } else if (isProfilePage && isEliminated) {
          e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)"; // 被淘汰的活动悬停时边框变亮（红色）
        } else if (isProfilePage && isActive) {
          e.currentTarget.style.borderColor = "rgba(156, 163, 175, 0.8)"; // 进行中状态悬停时边框变亮（灰色，无论是否已完成）
        } else {
          // Activity Hub 页面：统一使用默认边框
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        // My Journey 页面离开时恢复边框颜色
        if (isProfilePage && isSettled && isCompleted && !isEliminated) {
          e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.8)"; // 恢复金黄色
        } else if (isProfilePage && isEliminated) {
          e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)"; // 恢复红色
        } else if (isProfilePage && isActive) {
          e.currentTarget.style.borderColor = "rgba(156, 163, 175, 0.5)"; // 恢复灰色（无论是否已完成）
        } else {
          // Activity Hub 页面：统一使用默认边框
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
        }
      }}
    >
      {/* 成功坚持：获得奖励和押金奖池标识 - 仅在 My Journey 页面且已结算时显示在最上方 */}
      {isProfilePage && hasReward && rewardPerWinner !== undefined && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          {/* 押金奖池标识 - 在左侧 */}
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
          
          {/* 获得奖励 - 在右侧 */}
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
            💰 获得 {parseFloat(formatEther(rewardPerWinner)).toFixed(4)} ETH
          </div>
        </div>
      )}

      {/* 状态标识区域 - 左侧对齐 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", justifyContent: "flex-start", alignItems: "center" }}>
        {/* 已完成待结算 - 仅在 My Journey 页面显示，放在最左侧 */}
        {isProfilePage && isCompleted && !isEliminated && !isSettled && (
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

        {/* 未开始状态 - 灰色 - 放在已完成待结算之后 */}
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
        
        {/* 押金奖池 - 仅在 My Journey 页面且非成功坚持状态时显示，放在进行中标识右侧 */}
        {isProfilePage && !(hasReward && rewardPerWinner !== undefined) && (
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
        
        {/* 淘汰状态 - 仅在 My Journey 页面显示 */}
        {isProfilePage && isEliminated && (
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

