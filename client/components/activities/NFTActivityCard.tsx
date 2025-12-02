"use client";

import { ActivityMetadata } from "../../lib/types";
import { useRouter, usePathname } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { NFT_ACTIVITY_ABI } from "../../lib/nftActivityRegistry";

interface NFTActivityCardProps {
  activity: ActivityMetadata & { activityId?: number };
  hideIfSettled?: boolean;
  hideIfActive?: boolean; // 如果为 true，当活动进行中时返回 null
}

export function NFTActivityCard({ activity, hideIfSettled = false, hideIfActive = false }: NFTActivityCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const isProfilePage = pathname === "/profile";
  
  // NFT 活动使用独立的 ABI
  const activityABI = NFT_ACTIVITY_ABI;
  
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

  const { data: activityStatus } = useReadContract({
    address: activity.activityContract as `0x${string}` | undefined,
    abi: activityABI,
    functionName: "viewStatus",
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

  const getWalletAvatar = (addr: string) => {
    if (!addr) return "";
    return `https://effigy.im/a/${addr}.svg`;
  };

  const creatorAddress = activity.creator || "";

  const handleClick = () => {
    if (activity.activityId !== undefined) {
      const url = isProfilePage 
        ? `/nft-activities/${activity.activityId}?from=profile`
        : `/nft-activities/${activity.activityId}`;
      router.push(url);
    }
  };

  const isEliminated = participantInfo?.[1] || false;
  const isCompleted = participantInfo?.[6] || false;
  const isSettled = activityStatus === 2;
  const isScheduled = activityStatus === 0;
  const isActive = activityStatus === 1;

  if (hideIfSettled && isSettled) {
    return null;
  }

  // 如果 hideIfActive 为 true 且活动进行中，返回 null
  if (hideIfActive && isActive) {
    return null;
  }

  return (
    <div
      onClick={handleClick}
      style={{
        padding: 20,
        borderRadius: 16,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(20px)",
        cursor: "pointer",
        transition: "all 0.3s",
        opacity: isEliminated ? 0.5 : 1,
        filter: isEliminated ? "grayscale(80%)" : "none",
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
      {/* 状态标识和 NFT 标识 - 左侧对齐 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", justifyContent: "flex-start", alignItems: "center" }}>
        {/* 状态标识 - 放在最左侧 */}
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

        {/* 进行中状态 - 放在最左侧 */}
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

        {/* NFT 标识 */}
        <div
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            background: "rgba(139, 92, 246, 0.2)",
            color: "#a78bfa",
            border: "1px solid rgba(139, 92, 246, 0.3)"
          }}
        >
          NFT
        </div>

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
          margin: "0 0 16px 0",
          color: "#ffffff",
        }}
      >
        {activity.title}
      </h3>

      {/* 描述 */}
      {!isProfilePage && (
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
      )}

      {/* 创建者信息和日期 - Activity Hub 页面：日期在创建者右侧；My Journey 页面：分开显示 */}
      {!isProfilePage ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, opacity: 0.6, color: "#ffffff" }}>
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
                  (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="10" fill="%23${creatorAddress.slice(2, 8)}"/></svg>`;
                }}
              />
              <span>
                {creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}
              </span>
            </div>
          )}
          <span>{formatDate(activity.createdAt)}</span>
        </div>
      ) : (
        <>
          {/* My Journey 页面：创建者和日期分开显示 */}
          {creatorAddress && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
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
                  (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="10" fill="%23${creatorAddress.slice(2, 8)}"/></svg>`;
                }}
              />
              <span style={{ fontSize: 12, opacity: 0.7, color: "#ffffff" }}>
                {creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}
              </span>
            </div>
          )}
          <div style={{ fontSize: 12, opacity: 0.6, color: "#ffffff" }}>
            {formatDate(activity.createdAt)}
          </div>
        </>
      )}
    </div>
  );
}

