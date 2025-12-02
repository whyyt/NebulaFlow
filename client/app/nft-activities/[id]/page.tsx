"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, usePublicClient, useWaitForTransactionReceipt } from "wagmi";
import { ACTIVITY_REGISTRY_ABI } from "../../../lib/activityRegistry";
import { NFT_ACTIVITY_ABI } from "../../../lib/nftActivityRegistry";
import { saveUserCompletedActivity } from "../../../lib/activityStorage";
import { ParticleField } from "../../../components/animations/ParticleField";
import { IncentiveType } from "../../../lib/types";
import Link from "next/link";

const ACTIVITY_REGISTRY_ADDRESS = "0x9E545E3C0baAB3E08CdfD552C960A1050f373042";

// NFT 活动状态枚举（完全独立，不共享）
enum NFTActivityStatus {
  Scheduled = 0,
  Active = 1,
  Settled = 2
}

export default function NFTActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  
  // 判断是否从 My Journey 页面跳转过来（只检查 URL 参数，不检查 referrer）
  const fromProfile = searchParams.get("from") === "profile";
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const activityId = params?.id ? BigInt(String(params.id)) : null;

  const [activityMetadata, setActivityMetadata] = useState<any>(null);
  const [activityInfo, setActivityInfo] = useState<any>(null);
  const [participantInfo, setParticipantInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [pendingJoinHash, setPendingJoinHash] = useState<`0x${string}` | null>(null);

  // 从 ActivityRegistry 获取活动元数据
  const { data: metadata } = useReadContract({
    address: activityId !== null ? ACTIVITY_REGISTRY_ADDRESS as `0x${string}` : undefined,
    abi: ACTIVITY_REGISTRY_ABI,
    functionName: "getActivityMetadataTuple",
    args: activityId !== null ? [activityId] : undefined,
    query: {
      enabled: activityId !== null
    }
  });

  const activityAddress = metadata?.[0] as `0x${string}` | undefined;
  
  // NFT 活动使用独立的 ABI
  const activityABI = NFT_ACTIVITY_ABI;
  const joinFunctionName = "joinActivity";
  const startFunctionName = "startActivity";
  const endFunctionName = "endActivity";

  // 从 NFT 活动合约读取状态信息
  const { data: activityCreator } = useReadContract({
    address: activityAddress,
    abi: activityABI,
    functionName: "creator",
    query: {
      enabled: !!activityAddress && metadata !== undefined
    }
  });

  const { data: activityStatus } = useReadContract({
    address: activityAddress,
    abi: activityABI,
    functionName: "viewStatus",
    query: {
      enabled: !!activityAddress && metadata !== undefined
    }
  });

  const { data: startTime } = useReadContract({
    address: activityAddress,
    abi: activityABI,
    functionName: "startTime",
    query: {
      enabled: !!activityAddress && metadata !== undefined
    }
  });

  const { data: participantCount } = useReadContract({
    address: activityAddress,
    abi: activityABI,
    functionName: "participantCount",
    query: {
      enabled: !!activityAddress && metadata !== undefined
    }
  });

  const { data: maxParticipants } = useReadContract({
    address: activityAddress,
    abi: activityABI,
    functionName: "maxParticipants",
    query: {
      enabled: !!activityAddress && metadata !== undefined
    }
  });

  const { data: totalRounds } = useReadContract({
    address: activityAddress,
    abi: activityABI,
    functionName: "totalRounds",
    query: {
      enabled: !!activityAddress && metadata !== undefined
    }
  });

  const { data: currentRound } = useReadContract({
    address: activityAddress,
    abi: activityABI,
    functionName: "getCurrentRound",
    query: {
      enabled: !!activityAddress && metadata !== undefined
    }
  });

  // 获取当前用户的参与信息
  const { data: userParticipantInfo, refetch: refetchParticipantInfo } = useReadContract({
    address: activityAddress,
    abi: activityABI,
    functionName: "getParticipantInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: !!activityAddress && !!address && isConnected && metadata !== undefined
    }
  });

  // 处理活动元数据
  useEffect(() => {
    if (metadata) {
      setActivityMetadata({
        activityContract: metadata[0],
        creator: metadata[1],
        creatorName: metadata[2] || "",
        title: metadata[3],
        description: metadata[4],
        createdAt: metadata[5],
        isPublic: metadata[6],
        incentiveType: Number(metadata[7] || 1)
      });
    }
  }, [metadata]);

  // 处理活动信息
  useEffect(() => {
    if (activityAddress && activityCreator && activityStatus !== undefined && participantCount !== undefined && maxParticipants !== undefined && totalRounds !== undefined) {
      setActivityInfo({
        creator: activityCreator,
        status: activityStatus,
        startTime: startTime,
        participantCount: participantCount,
        maxParticipants: maxParticipants,
        totalRounds: totalRounds
      });
    }
  }, [activityAddress, activityCreator, activityStatus, startTime, participantCount, maxParticipants, totalRounds]);

  // 处理用户参与信息
  useEffect(() => {
    if (userParticipantInfo) {
      const info = {
        joined: userParticipantInfo[0],
        eliminated: userParticipantInfo[1],
        lastCheckInRound: userParticipantInfo[2],
        rewardClaimed: userParticipantInfo[3],
        isWinner: userParticipantInfo[4],
        hasCheckedIn: userParticipantInfo[5],
        isCompleted: userParticipantInfo[6] || false
      };
      setParticipantInfo(info);
    } else if (address && isConnected) {
      setParticipantInfo({
        joined: false,
        eliminated: false,
        lastCheckInRound: null,
        rewardClaimed: false,
        isWinner: false,
        hasCheckedIn: false,
        isCompleted: false
      });
    }
  }, [userParticipantInfo, address, isConnected]);

  // 更新加载状态
  useEffect(() => {
    if (activityMetadata && activityInfo !== null) {
      setLoading(false);
    } else {
      const timeout = setTimeout(() => {
        if (loading) {
          console.warn("⚠️ NFT 活动详情加载超时");
          setLoading(false);
          if (!activityMetadata) {
            setError("无法加载活动信息，请检查活动ID是否正确");
          }
        }
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [activityMetadata, activityInfo, loading]);

  // 交易确认后刷新状态
  useEffect(() => {
    if (isConfirmed) {
      if (pendingJoinHash && hash === pendingJoinHash) {
        setTimeout(() => {
          setSuccess("报名成功！");
          setPendingJoinHash(null);
        }, 1000);
      }
      
      setTimeout(() => {
        refetchParticipantInfo();
      }, 1500);
    }
  }, [isConfirmed, hash, pendingJoinHash, refetchParticipantInfo]);

  // 成功提示自动消失
  useEffect(() => {
    if (success) {
      setSuccessVisible(true);
      const fadeOutTimer = setTimeout(() => {
        setSuccessVisible(false);
      }, 1500);
      const clearTimer = setTimeout(() => {
        setSuccess(null);
      }, 2000);
      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(clearTimer);
      };
    } else {
      setSuccessVisible(false);
    }
  }, [success]);

  // 判断是否为创建者
  const isCreator = address && activityInfo?.creator && 
    address.toLowerCase() === String(activityInfo.creator).toLowerCase();

  // 判断用户是否已报名
  const hasJoined = (participantInfo?.joined || false) || (isPending && hash !== undefined);

  // 判断活动状态
  const activityStatusEnum = activityStatus !== undefined ? Number(activityStatus) : NFTActivityStatus.Scheduled;
  const isScheduled = activityStatusEnum === NFTActivityStatus.Scheduled;
  const isActive = activityStatusEnum === NFTActivityStatus.Active;
  const isSettled = activityStatusEnum === NFTActivityStatus.Settled;

  // 开始活动（NFT 活动 - 完全独立的实现，不共用押金活动的代码）
  const handleStartActivity = async () => {
    if (!activityAddress) {
      setError("无法获取活动信息");
      return;
    }

    if (!isCreator) {
      setError("只有活动创建者可以开始活动");
      return;
    }

    if (!address || !isConnected) {
      setError("请先连接钱包");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      // 检查创建者是否已报名（如果已报名，使用组合方法；否则只开始活动）
      let useCombinedMethod = false;
      if (publicClient) {
        try {
          const latestParticipantInfo = await publicClient.readContract({
            address: activityAddress as `0x${string}`,
            abi: activityABI,
            functionName: "getParticipantInfo",
            args: [address]
          });
          
          const hasJoined = latestParticipantInfo[0];
          const isEliminated = latestParticipantInfo[1];
          const lastCheckInRound = latestParticipantInfo[2];
          
          // NFT 活动：如果已报名且未淘汰且未签到过，使用组合方法
          // NFT 活动的 getParticipantInfo 会将 NOT_CHECKED 转换为 0 返回
          // 所以 lastCheckInRound 为 0 表示未签到过
          const lastCheckInRoundBigInt = BigInt(String(lastCheckInRound));
          useCombinedMethod = hasJoined && !isEliminated && lastCheckInRoundBigInt === BigInt(0);
        } catch (err) {
          console.warn("无法检查签到状态，将只开始活动:", err);
        }
      }
      
      // 使用组合方法：一次签名完成开始活动和签到
      if (useCombinedMethod) {
        try {
          const hash = await writeContractAsync({
            address: activityAddress as `0x${string}`,
            abi: activityABI,
            functionName: "startActivityAndCheckIn"
          });
          
          // 等待交易确认
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash });
          }
          
          setSuccess("活动已开始");
          
          // 刷新参与信息
          setTimeout(() => {
            refetchParticipantInfo();
          }, 1000);
        } catch (err: any) {
          console.error("开始活动并签到失败:", err);
          // 如果组合方法失败，尝试只开始活动
          const startHash = await writeContractAsync({
            address: activityAddress as `0x${string}`,
            abi: activityABI,
            functionName: startFunctionName
          });
          
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash: startHash });
          }
          
          setSuccess("活动已开始");
          
          setTimeout(() => {
            refetchParticipantInfo();
          }, 1000);
        }
      } else {
        // 如果创建者未报名，只开始活动
        const startHash = await writeContractAsync({
          address: activityAddress as `0x${string}`,
          abi: activityABI,
          functionName: startFunctionName
        });
        
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: startHash });
        }
        
        setSuccess("活动已开始");
        
        setTimeout(() => {
          refetchParticipantInfo();
        }, 1000);
      }
    } catch (err: any) {
      console.error("开始活动失败:", err);
      setError(err.shortMessage || err.message || "开始活动失败");
    }
  };

  // 结束活动
  const handleEndActivity = async () => {
    if (!activityAddress) {
      setError("无法获取活动信息");
      return;
    }

    if (!isCreator) {
      setError("只有活动创建者可以结束活动");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      await writeContractAsync({
        address: activityAddress as `0x${string}`,
        abi: activityABI,
        functionName: endFunctionName
      });
      setSuccess("活动已结束");
    } catch (err: any) {
      console.error("结束活动失败:", err);
      setError(err.shortMessage || err.message || "结束活动失败");
    }
  };

  // 报名参加
  const handleJoinActivity = async () => {
    if (!activityAddress) {
      setError("无法获取活动信息");
      return;
    }

    if (!isConnected || !address) {
      setError("请先连接钱包");
      return;
    }

    if (hasJoined) {
      setError("您已经报名参加此活动");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const txHash = await writeContractAsync({
        address: activityAddress as `0x${string}`,
        abi: activityABI,
        functionName: joinFunctionName
      });
      
      if (txHash) {
        setPendingJoinHash(txHash);
      }
      
      if (activityMetadata) {
        const participatedActivity = {
          activityContract: activityMetadata.activityContract || "",
          creator: activityMetadata.creator || "",
          creatorName: activityMetadata.creatorName || "",
          title: activityMetadata.title || "",
          description: activityMetadata.description || "",
          createdAt: activityMetadata.createdAt || BigInt(0),
          isPublic: activityMetadata.isPublic !== undefined ? activityMetadata.isPublic : true,
          incentiveType: IncentiveType.NFTPool,
          activityId: activityId ? Number(activityId) : undefined,
          isCompleted: false,
          isEliminated: false,
        };
        saveUserCompletedActivity(address, participatedActivity);
      }
    } catch (err: any) {
      console.error("报名失败:", err);
      const errorMessage = err.shortMessage || err.message || "报名失败";
      setError(errorMessage.includes("revert") ? errorMessage.split("revert")[1]?.trim() || "报名失败" : errorMessage);
    }
  };

  // 签到
  const handleCheckIn = async () => {
    if (!activityAddress) {
      setError("无法获取活动信息");
      return;
    }

    if (!isConnected || !address) {
      setError("请先连接钱包");
      return;
    }

    if (!hasJoined) {
      setError("请先报名参加活动");
      return;
    }

    if (participantInfo?.eliminated) {
      setError("您已被淘汰，无法签到");
      return;
    }

    if (!isActive) {
      setError("活动未开始或已结束");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      await writeContractAsync({
        address: activityAddress as `0x${string}`,
        abi: activityABI,
        functionName: "checkIn"
      });
      setSuccess("签到成功！");
      
      setTimeout(() => {
        refetchParticipantInfo();
      }, 1500);
    } catch (err: any) {
      console.error("签到失败:", err);
      setError(err.shortMessage || err.message || "签到失败");
    }
  };

  const getWalletAvatar = (addr: string) => {
    if (!addr) return "";
    return `https://effigy.im/a/${addr}.svg`;
  };

  const isLoading = isPending || isConfirming;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
        加载中...
      </div>
    );
  }

  if (!activityMetadata) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, marginBottom: 16 }}>无法加载活动信息</p>
          <Link href="/activities" style={{ color: "#86efac", textDecoration: "underline" }}>
            返回活动列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#0a0a0f",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.3), transparent)",
          zIndex: 0,
        }}
      />

      <ParticleField count={20} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "80px 24px 40px",
        }}
      >
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}>
          <Link
            href={fromProfile ? "/profile" : "/activities"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.15)",
              background: "rgba(255, 255, 255, 0.05)",
              color: "rgba(255, 255, 255, 0.8)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.2s",
              marginBottom: 24,
            }}
          >
            <span>←</span>
            <span>{fromProfile ? "Back to My Journey" : "Back to Activity Hub"}</span>
          </Link>

          {error && (
            <div style={{
              padding: 16,
              borderRadius: 12,
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              color: "#fca5a5",
              marginBottom: 24,
            }}>
              ❌ {error}
            </div>
          )}

          {success && (
            <div 
              style={{
                position: "fixed",
                top: "5%",
                left: "50%",
                transform: successVisible 
                  ? "translate(-50%, 0)" 
                  : "translate(-50%, -10px)",
                padding: "10px 20px",
                borderRadius: 8,
                background: "rgba(34, 197, 94, 0.2)",
                border: "1px solid rgba(34, 197, 94, 0.5)",
                color: "#86efac",
                fontSize: 14,
                fontWeight: 500,
                zIndex: 1000,
                opacity: successVisible ? 1 : 0,
                transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
                pointerEvents: "none",
              }}
            >
              ✅ {success}
            </div>
          )}

          {/* 主要内容区域 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 400px",
            gap: 32,
            marginBottom: 40,
          }} className="activity-detail-grid">
            {/* 左侧：活动信息和操作按钮 */}
            <div>
              {/* 活动信息框（灰色，带标题） */}
              <div style={{
                padding: 32,
                borderRadius: 16,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px)",
                marginBottom: 24,
              }}>
                <h1 style={{
                  fontSize: 32,
                  fontWeight: 700,
                  margin: "0 0 20px 0",
                  color: "#ffffff",
                  textAlign: "left",
                }}>
                  {activityMetadata.title}
                </h1>
                <p style={{
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: "rgba(255, 255, 255, 0.8)",
                  marginBottom: 24,
                }}>
                  {activityMetadata.description}
                </p>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 16,
                }}>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      创建者
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#ffffff", fontWeight: 500 }}>
                      <img
                        src={activityMetadata.creator ? getWalletAvatar(activityMetadata.creator) : ""}
                        alt="creator avatar"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                        }}
                        onError={(e) => {
                          if (activityMetadata.creator) {
                            (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="10" fill="%23${activityMetadata.creator.slice(2, 8)}"/></svg>`;
                          }
                        }}
                      />
                      <span>{activityMetadata.creatorName || activityMetadata.creator.slice(0, 6) + "..." + activityMetadata.creator.slice(-4)}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      参与人数
                    </div>
                    <div style={{ fontSize: 14, color: "#ffffff", fontWeight: 500 }}>
                      {participantCount ? Number(participantCount) : 0} / {maxParticipants ? Number(maxParticipants) : 0}
                    </div>
                  </div>

                  {totalRounds && (
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        活动天数
                      </div>
                      <div style={{ fontSize: 14, color: "#ffffff", fontWeight: 500 }}>
                        {Number(totalRounds)} 天
                      </div>
                    </div>
                  )}

                  {currentRound !== undefined && totalRounds && isActive && Number(currentRound) > 0 && (
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        距结束还有
                      </div>
                      <div style={{ fontSize: 14, color: "#ffffff", fontWeight: 500 }}>
                        {Math.max(0, Number(totalRounds) - Number(currentRound))} 天
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 操作按钮区域（大框） */}
              <div style={{
                padding: 24,
                borderRadius: 16,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px)",
              }}>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}>
                  {/* 开始活动和报名参加在同一行 */}
                  {(isCreator && isScheduled) || (isScheduled && !hasJoined) ? (
                    <div style={{
                      display: "flex",
                      gap: 12,
                    }}>
                      {/* 创建者：开始活动按钮 */}
                      {isCreator && isScheduled && (
                        <button
                          onClick={handleStartActivity}
                          disabled={isLoading}
                          style={{
                            flex: 1,
                            padding: "14px 28px",
                            borderRadius: 12,
                            border: "1px solid rgba(34, 197, 94, 0.5)",
                            background: isLoading 
                              ? "rgba(34, 197, 94, 0.2)" 
                              : "rgba(34, 197, 94, 0.3)",
                            color: "#ffffff",
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: isLoading ? "not-allowed" : "pointer",
                            opacity: isLoading ? 0.6 : 1,
                          }}
                        >
                          {isLoading ? "处理中..." : "开始活动"}
                        </button>
                      )}

                      {/* 报名参加按钮 */}
                      {isScheduled && !hasJoined && (
                        <button
                          onClick={handleJoinActivity}
                          disabled={isLoading}
                          style={{
                            flex: 1,
                            padding: "14px 28px",
                            borderRadius: 12,
                            border: "1px solid rgba(139, 92, 246, 0.5)",
                            background: isLoading 
                              ? "rgba(139, 92, 246, 0.2)" 
                              : "rgba(139, 92, 246, 0.3)",
                            color: "#ffffff",
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: isLoading ? "not-allowed" : "pointer",
                            opacity: isLoading ? 0.6 : 1,
                          }}
                        >
                          {isLoading ? "处理中..." : "报名参加"}
                        </button>
                      )}
                    </div>
                  ) : null}

                  {/* 结束活动按钮（创建者，活动进行中） */}
                  {isCreator && isActive && (
                    <button
                      onClick={handleEndActivity}
                      disabled={isLoading}
                      style={{
                        width: "100%",
                        padding: "14px 28px",
                        borderRadius: 12,
                        border: "1px solid rgba(239, 68, 68, 0.5)",
                        background: isLoading 
                          ? "rgba(239, 68, 68, 0.2)" 
                          : "rgba(239, 68, 68, 0.3)",
                        color: "#ffffff",
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.6 : 1,
                      }}
                    >
                      {isLoading ? "处理中..." : "结束活动"}
                    </button>
                  )}

                  {/* 已报名状态 */}
                  {hasJoined && (
                    <div style={{
                      padding: "14px 28px",
                      borderRadius: 12,
                      background: "rgba(156, 163, 175, 0.2)",
                      border: "1px solid rgba(156, 163, 175, 0.3)",
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: 16,
                      fontWeight: 600,
                      textAlign: "center",
                    }}>
                      {isScheduled ? "已报名，等待开始" : "已报名"}
                    </div>
                  )}

                  {/* 签到按钮 */}
                  {isActive && hasJoined && !participantInfo?.eliminated && (
                    (() => {
                      // 判断是否已签到：lastCheckInRound === currentRound
                      const isCheckedIn = currentRound !== undefined && 
                        participantInfo?.lastCheckInRound !== undefined && 
                        participantInfo?.lastCheckInRound !== null &&
                        Number(participantInfo.lastCheckInRound) === Number(currentRound);
                      
                      return (
                        <button
                          onClick={handleCheckIn}
                          disabled={isLoading || isCheckedIn}
                          style={{
                            width: "100%",
                            padding: "14px 28px",
                            borderRadius: 12,
                            border: isCheckedIn 
                              ? "1px solid rgba(156, 163, 175, 0.3)"
                              : "1px solid rgba(34, 197, 94, 0.5)",
                            background: isCheckedIn
                              ? "rgba(156, 163, 175, 0.2)"
                              : isLoading 
                                ? "rgba(34, 197, 94, 0.2)" 
                                : "rgba(34, 197, 94, 0.3)",
                            color: "#ffffff",
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: (isLoading || isCheckedIn) ? "not-allowed" : "pointer",
                            opacity: (isLoading || isCheckedIn) ? 0.6 : 1,
                          }}
                        >
                          {isLoading ? "处理中..." : isCheckedIn ? "已签到" : "签到"}
                        </button>
                      );
                    })()
                  )}

                  {/* 已淘汰状态 */}
                  {participantInfo?.eliminated && (
                    <div style={{
                      padding: "14px 28px",
                      borderRadius: 12,
                      background: "rgba(239, 68, 68, 0.2)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: "#fca5a5",
                      fontSize: 16,
                      fontWeight: 600,
                      textAlign: "center",
                    }}>
                      ❌ 已淘汰
                    </div>
                  )}

                  {/* 已完成状态 */}
                  {isSettled && participantInfo?.isCompleted && (
                    <div style={{
                      padding: "14px 28px",
                      borderRadius: 12,
                      background: "rgba(34, 197, 94, 0.2)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      color: "#86efac",
                      fontSize: 16,
                      fontWeight: 600,
                      textAlign: "center",
                    }}>
                      ✅ 已完成
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧：NFT 奖励展示 */}
            <div>
              <div style={{
                padding: 32,
                borderRadius: 16,
                border: "1px solid rgba(139, 92, 246, 0.3)",
                background: "rgba(139, 92, 246, 0.1)",
                backdropFilter: "blur(20px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 400,
              }}>
                <div style={{
                  fontSize: 120,
                  marginBottom: 24,
                  filter: "drop-shadow(0 0 20px rgba(139, 92, 246, 0.5))",
                }}>
                  🏆
                </div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#a78bfa",
                  marginBottom: 12,
                  textAlign: "center",
                }}>
                  完成活动即可获得
                </div>
                <div style={{
                  fontSize: 16,
                  color: "rgba(255, 255, 255, 0.7)",
                  textAlign: "center",
                  lineHeight: 1.6,
                }}>
                  {activityMetadata.nftName || "NFT 纪念品"}
                </div>
                {activityMetadata.nftSymbol && (
                  <div style={{
                    fontSize: 14,
                    color: "rgba(255, 255, 255, 0.5)",
                    textAlign: "center",
                    marginTop: 8,
                  }}>
                    {activityMetadata.nftSymbol}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

