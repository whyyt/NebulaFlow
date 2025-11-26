"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, usePublicClient, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { ACTIVITY_REGISTRY_ABI, CHALLENGE_ABI } from "../../../lib/activityRegistry";
import Link from "next/link";
import { FadeIn } from "../../../components/animations/FadeIn";

const ACTIVITY_REGISTRY_ADDRESS = "0x59b670e9fA9D0A427751Af201D676719a970857b";

// 活动状态枚举（对应合约中的 Status）
enum ActivityStatus {
  Scheduled = 0, // 未开始
  Active = 1,    // 进行中
  Settled = 2    // 已结束
}

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const activityId = params?.id ? BigInt(String(params.id)) : null;

  // 状态管理
  const [activityMetadata, setActivityMetadata] = useState<any>(null);
  const [challengeInfo, setChallengeInfo] = useState<any>(null);
  const [participantInfo, setParticipantInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // 获取 Challenge 合约地址
  const challengeAddress = metadata?.[0] as `0x${string}` | undefined;

  // 从 Challenge 合约读取状态信息
  const { data: challengeCreator } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "creator",
    query: {
      enabled: !!challengeAddress
    }
  });

  const { data: challengeStatus } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "viewStatus",
    query: {
      enabled: !!challengeAddress
    }
  });

  const { data: startTime } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "startTime",
    query: {
      enabled: !!challengeAddress
    }
  });

  const { data: depositAmount } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "depositAmount",
    query: {
      enabled: !!challengeAddress
    }
  });

  const { data: participantCount } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "participantCount",
    query: {
      enabled: !!challengeAddress
    }
  });

  const { data: maxParticipants } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "maxParticipants",
    query: {
      enabled: !!challengeAddress
    }
  });

  // 获取当前用户的参与信息
  const { data: userParticipantInfo, refetch: refetchParticipantInfo } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "getParticipantInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: !!challengeAddress && !!address && isConnected
    }
  });

  // 获取当前轮次和总轮次
  const { data: currentRound } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "currentRound",
    query: {
      enabled: !!challengeAddress
    }
  });

  const { data: totalRounds } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "totalRounds",
    query: {
      enabled: !!challengeAddress
    }
  });

  const { data: rewardPerWinner } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "rewardPerWinner",
    query: {
      enabled: !!challengeAddress
    }
  });

  const { data: winnersCount } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "winnersCount",
    query: {
      enabled: !!challengeAddress
    }
  });

  // 处理元数据
  useEffect(() => {
    if (metadata) {
      setActivityMetadata({
        activityContract: metadata[0],
        creator: metadata[1],
        title: metadata[2],
        description: metadata[3],
        createdAt: metadata[4],
        isPublic: metadata[5]
      });
    }
  }, [metadata]);

  // 处理 Challenge 信息
  useEffect(() => {
    if (challengeAddress && challengeStatus !== undefined && startTime !== undefined) {
      setChallengeInfo({
        address: challengeAddress,
        creator: challengeCreator,
        status: Number(challengeStatus),
        startTime: startTime,
        depositAmount: depositAmount,
        participantCount: participantCount,
        maxParticipants: maxParticipants
      });
    }
  }, [challengeAddress, challengeStatus, startTime, challengeCreator, depositAmount, participantCount, maxParticipants]);

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
      console.log("【用户参与信息】", {
        joined: info.joined,
        eliminated: info.eliminated,
        lastCheckInRound: info.lastCheckInRound?.toString(),
        isCompleted: info.isCompleted
      });
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
    if (activityMetadata && challengeInfo !== null) {
      setLoading(false);
    }
  }, [activityMetadata, challengeInfo]);

  // 交易确认后刷新状态
  useEffect(() => {
    if (isConfirmed) {
      // 延迟刷新，确保链上状态已更新
      setTimeout(() => {
        refetchParticipantInfo();
        window.location.reload();
      }, 2000);
    }
  }, [isConfirmed, refetchParticipantInfo]);

  // ========== 角色和状态判断 ==========
  
  // 判断是否为发布者
  const isCreator = address && challengeInfo?.creator && 
    address.toLowerCase() === challengeInfo.creator.toLowerCase();

  // 获取活动状态（使用 viewStatus 的结果）
  const activityStatus: ActivityStatus = challengeInfo?.status !== undefined 
    ? challengeInfo.status as ActivityStatus 
    : ActivityStatus.Scheduled;

  // 判断用户是否已报名
  const hasJoined = participantInfo?.joined || false;
  
  // NOT_CHECKED 常量（合约中 type(uint256).max = 2^256 - 1）
  // 在 JavaScript 中，这个值太大无法直接表示，我们用一个接近的值来判断
  const NOT_CHECKED_THRESHOLD = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00");
  
  // 判断是否可以签到（活动进行中 + 已报名 + 未淘汰 + 今日未签到）
  const canCheckIn = (() => {
    // 基础条件检查
    if (activityStatus !== ActivityStatus.Active) {
      console.log("【签到检查】活动状态不是 Active:", activityStatus);
      return false;
    }
    if (!hasJoined) {
      console.log("【签到检查】用户未报名");
      return false;
    }
    if (participantInfo?.eliminated) {
      console.log("【签到检查】用户已淘汰");
      return false;
    }
    if (currentRound === undefined || totalRounds === undefined) {
      console.log("【签到检查】轮次信息缺失:", { currentRound, totalRounds });
      return false;
    }
    if (Number(currentRound) >= Number(totalRounds)) {
      console.log("【签到检查】活动已结束");
      return false;
    }
    
    // 检查 lastCheckInRound
    const lastCheckIn = participantInfo?.lastCheckInRound;
    if (lastCheckIn === null || lastCheckIn === undefined) {
      console.log("【签到检查】lastCheckInRound 为空，允许签到");
      return true;
    }
    
    // 如果 lastCheckInRound 是 NOT_CHECKED（未签到过），允许签到
    const lastCheckInBigInt = BigInt(String(lastCheckIn));
    const currentRoundBigInt = BigInt(String(currentRound));
    
    console.log("【签到检查】", {
      lastCheckInRound: lastCheckInBigInt.toString(),
      currentRound: currentRoundBigInt.toString(),
      isNotChecked: lastCheckInBigInt >= NOT_CHECKED_THRESHOLD
    });
    
    // 如果 lastCheckInRound 非常大（接近 NOT_CHECKED），说明未签到过
    if (lastCheckInBigInt >= NOT_CHECKED_THRESHOLD) {
      // 未签到过，允许签到第0天
      const canCheck = Number(currentRound) === 0;
      console.log("【签到检查】未签到过，当前轮次:", Number(currentRound), "可以签到:", canCheck);
      return canCheck;
    }
    
    // 已签到过，检查是否小于当前轮次（可以签到今天）
    const canCheck = lastCheckInBigInt < currentRoundBigInt;
    console.log("【签到检查】已签到过，可以签到:", canCheck);
    return canCheck;
  })();
  
  console.log("【签到按钮显示】", {
    canCheckIn,
    activityStatus,
    hasJoined,
    isCreator,
    eliminated: participantInfo?.eliminated,
    currentRound: currentRound?.toString(),
    lastCheckInRound: participantInfo?.lastCheckInRound?.toString()
  });
  
  // 判断是否已完成
  const isCompleted = participantInfo?.isCompleted || false;
  
  // 判断是否已结算
  const isSettled = activityStatus === ActivityStatus.Settled;

  // ========== 按钮显示逻辑 ==========
  
  // 未开始状态
  const showStartButton = isCreator && activityStatus === ActivityStatus.Scheduled;
  
  // 进行中状态
  const showEndButton = isCreator && activityStatus === ActivityStatus.Active;
  
  // 报名按钮（未开始 + 未报名 + 不是发布者）
  const showJoinButton = !isCreator && 
    activityStatus === ActivityStatus.Scheduled && 
    !hasJoined &&
    isConnected;

  // ========== 链上交互函数 ==========

  // 开始活动
  const handleStartActivity = async () => {
    if (!challengeAddress || !isCreator) {
      setError("只有活动创建者可以开始活动");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      await writeContractAsync({
        address: challengeAddress,
        abi: CHALLENGE_ABI,
        functionName: "forceStart"
      });
      setSuccess("活动已开始");
    } catch (err: any) {
      console.error("开始活动失败:", err);
      setError(err.shortMessage || err.message || "开始活动失败");
    }
  };

  // 结束活动
  const handleEndActivity = async () => {
    if (!challengeAddress || !isCreator) {
      setError("只有活动创建者可以结束活动");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      await writeContractAsync({
        address: challengeAddress,
        abi: CHALLENGE_ABI,
        functionName: "forceEnd"
      });
      setSuccess("活动已结束，奖励已自动分配");
    } catch (err: any) {
      console.error("结束活动失败:", err);
      setError(err.shortMessage || err.message || "结束活动失败");
    }
  };

  // 报名参加
  const handleJoinActivity = async () => {
    if (!challengeAddress || !depositAmount) {
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
      
      await writeContractAsync({
        address: challengeAddress,
        abi: CHALLENGE_ABI,
        functionName: "joinChallenge",
        value: depositAmount
      });
      setSuccess("报名成功！");
    } catch (err: any) {
      console.error("报名失败:", err);
      // 提取 revert reason
      const errorMessage = err.shortMessage || err.message || "报名失败";
      setError(errorMessage.includes("revert") ? errorMessage.split("revert")[1]?.trim() || "报名失败" : errorMessage);
    }
  };

  // 签到
  const handleCheckIn = async () => {
    if (!challengeAddress) {
      setError("无法获取活动信息");
      return;
    }

    if (!isConnected || !address) {
      setError("请先连接钱包");
      return;
    }

    if (!canCheckIn) {
      setError("当前无法签到");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      await writeContractAsync({
        address: challengeAddress,
        abi: CHALLENGE_ABI,
        functionName: "checkIn"
      });
      setSuccess("签到成功！");
    } catch (err: any) {
      console.error("签到失败:", err);
      const errorMessage = err.shortMessage || err.message || "签到失败";
      setError(errorMessage.includes("revert") ? errorMessage.split("revert")[1]?.trim() || "签到失败" : errorMessage);
    }
  };

  // ========== 渲染 ==========

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0a0f 0%, #1a0a1f 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <p style={{ fontSize: 18, color: "#ffffff" }}>加载中...</p>
      </div>
    );
  }

  if (!activityMetadata || !challengeInfo) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0a0f 0%, #1a0a1f 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 24,
      }}>
        <p style={{ fontSize: 18, color: "#ffffff" }}>活动不存在</p>
        <Link
          href="/activities"
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.3)",
            background: "rgba(255, 255, 255, 0.1)",
            color: "#ffffff",
            textDecoration: "none",
          }}
        >
          返回活动列表
        </Link>
      </div>
    );
  }

  const statusText = activityStatus === ActivityStatus.Scheduled 
    ? "未开始" 
    : activityStatus === ActivityStatus.Active 
    ? "进行中" 
    : "已结束";

  const statusColor = activityStatus === ActivityStatus.Scheduled 
    ? "#fbbf24" 
    : activityStatus === ActivityStatus.Active 
    ? "#22d3ee" 
    : "#9ca3af";

  const isLoading = isPending || isConfirming;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0a0f 0%, #1a0a1f 100%)",
      padding: "120px 24px 80px",
    }}>
      <div style={{
        maxWidth: 900,
        margin: "0 auto",
      }}>
        {/* 返回按钮 */}
        <Link
          href="/activities"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.2)",
            background: "rgba(255, 255, 255, 0.1)",
            color: "#ffffff",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 32,
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.transform = "translateX(-4px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.transform = "translateX(0)";
          }}
        >
          <span>←</span>
          <span>返回活动列表</span>
        </Link>

        <FadeIn delay={0.2} duration={0.8}>
          {/* 活动标题 */}
          <h1 style={{
            fontSize: "clamp(36px, 5vw, 48px)",
            fontWeight: 700,
            marginBottom: 16,
            color: "#ffffff",
          }}>
            {activityMetadata.title}
          </h1>

          {/* 状态标签 */}
          <div style={{
            display: "inline-block",
            padding: "8px 16px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 24,
            background: `${statusColor}20`,
            color: statusColor,
            border: `1px solid ${statusColor}40`
          }}>
            {statusText}
          </div>

          {/* 错误提示 */}
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

          {/* 成功提示 */}
          {success && (
            <div style={{
              padding: 16,
              borderRadius: 12,
              background: "rgba(34, 197, 94, 0.2)",
              border: "1px solid rgba(34, 197, 94, 0.5)",
              color: "#86efac",
              marginBottom: 24,
            }}>
              ✅ {success}
            </div>
          )}

          {/* 活动描述 */}
          <div style={{
            padding: 24,
            borderRadius: 20,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            marginBottom: 24,
          }}>
            <h2 style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 12,
              color: "#ffffff",
            }}>
              活动描述
            </h2>
            <p style={{
              fontSize: 15,
              lineHeight: 1.8,
              color: "rgba(255, 255, 255, 0.8)",
              margin: 0,
            }}>
              {activityMetadata.description}
            </p>
          </div>

          {/* 活动信息 */}
          <div style={{
            padding: 24,
            borderRadius: 20,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            marginBottom: 24,
          }}>
            <h2 style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 16,
              color: "#ffffff",
            }}>
              活动信息
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>创建者</div>
                <div style={{ fontSize: 14, color: "#ffffff" }}>
                  {activityMetadata.creator.slice(0, 6)}...{activityMetadata.creator.slice(-4)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>押金金额</div>
                <div style={{ fontSize: 14, color: "#ffffff" }}>
                  {depositAmount ? formatEther(depositAmount) : "0"} ETH
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>参与人数</div>
                <div style={{ fontSize: 14, color: "#ffffff" }}>
                  {participantCount?.toString() || "0"} / {maxParticipants?.toString() || "0"}
                </div>
              </div>
              {startTime && Number(startTime) > 0 && (
                <div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>开始时间</div>
                  <div style={{ fontSize: 14, color: "#ffffff" }}>
                    {new Date(Number(startTime) * 1000).toLocaleString("zh-CN")}
                  </div>
                </div>
              )}
              {totalRounds && (
                <div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>挑战天数</div>
                  <div style={{ fontSize: 14, color: "#ffffff" }}>
                    {Number(totalRounds)} 天
                  </div>
                </div>
              )}
              {currentRound !== undefined && totalRounds && activityStatus === ActivityStatus.Active && (
                <div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>当前进度</div>
                  <div style={{ fontSize: 14, color: "#ffffff" }}>
                    第 {Number(currentRound) + 1} / {Number(totalRounds)} 天
                  </div>
                </div>
              )}
              {isSettled && winnersCount !== undefined && rewardPerWinner !== undefined && (
                <>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>完成人数</div>
                    <div style={{ fontSize: 14, color: "#ffffff" }}>
                      {Number(winnersCount)} 人
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>每人奖励</div>
                    <div style={{ fontSize: 14, color: "#86efac" }}>
                      {formatEther(rewardPerWinner)} ETH
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 操作按钮区域 */}
          <div style={{
            padding: 24,
            borderRadius: 20,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            marginBottom: 24,
          }}>
            {!isConnected ? (
              <p style={{ color: "rgba(255, 255, 255, 0.6)", margin: 0 }}>
                请先连接钱包以进行操作
              </p>
            ) : activityStatus === ActivityStatus.Settled ? (
              <p style={{ color: "rgba(255, 255, 255, 0.6)", margin: 0 }}>
                活动已结束
              </p>
            ) : (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {/* 开始活动按钮 - 仅发布者可见，未开始状态 */}
                {showStartButton && (
                  <button
                    onClick={handleStartActivity}
                    disabled={isLoading}
                    style={{
                      padding: "14px 28px",
                      borderRadius: 12,
                      border: "1px solid rgba(34, 211, 238, 0.5)",
                      background: isLoading 
                        ? "rgba(34, 211, 238, 0.2)" 
                        : "rgba(34, 211, 238, 0.3)",
                      color: "#ffffff",
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: isLoading ? "not-allowed" : "pointer",
                      opacity: isLoading ? 0.6 : 1,
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.background = "rgba(34, 211, 238, 0.4)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.background = "rgba(34, 211, 238, 0.3)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    {isLoading && isPending ? "交易确认中..." : "开始活动"}
                  </button>
                )}

                {/* 结束活动按钮 - 仅发布者可见，进行中状态 */}
                {showEndButton && (
                  <button
                    onClick={handleEndActivity}
                    disabled={isLoading}
                    style={{
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
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.4)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.3)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    {isLoading && isPending ? "交易确认中..." : "结束活动"}
                  </button>
                )}

                {/* 报名参加按钮 - 仅用户可见，未开始状态，未报名 */}
                {showJoinButton && (
                  <button
                    onClick={handleJoinActivity}
                    disabled={isLoading}
                    style={{
                      padding: "14px 28px",
                      borderRadius: 12,
                      border: "1px solid rgba(120, 119, 198, 0.5)",
                      background: isLoading 
                        ? "rgba(120, 119, 198, 0.2)" 
                        : "rgba(120, 119, 198, 0.3)",
                      color: "#ffffff",
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: isLoading ? "not-allowed" : "pointer",
                      opacity: isLoading ? 0.6 : 1,
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.background = "rgba(120, 119, 198, 0.4)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.background = "rgba(120, 119, 198, 0.3)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    {isLoading && isPending 
                      ? "交易确认中..." 
                      : `报名参加 (${depositAmount ? formatEther(depositAmount) : "0"} ETH)`}
                  </button>
                )}

                {/* 签到按钮 - 活动进行中 + 已报名 + 未淘汰 + 今日未签到 */}
                {canCheckIn && !isCreator && (
                  <button
                    onClick={handleCheckIn}
                    disabled={isLoading}
                    style={{
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
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.background = "rgba(34, 197, 94, 0.4)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.background = "rgba(34, 197, 94, 0.3)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    {isLoading && isPending ? "交易确认中..." : "今日签到"}
                  </button>
                )}

                {/* 已淘汰状态 */}
                {hasJoined && participantInfo?.eliminated && (
                  <div style={{
                    padding: "14px 28px",
                    borderRadius: 12,
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#fca5a5",
                    fontSize: 16,
                    fontWeight: 600,
                  }}>
                    ❌ 已淘汰
                  </div>
                )}

                {/* 已完成待结算 */}
                {hasJoined && isCompleted && !isSettled && (
                  <div style={{
                    padding: "14px 28px",
                    borderRadius: 12,
                    background: "rgba(251, 191, 36, 0.2)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    color: "#fbbf24",
                    fontSize: 16,
                    fontWeight: 600,
                  }}>
                    🎯 已完成待结算
                  </div>
                )}

                {/* 已结算 - 显示奖励 */}
                {hasJoined && isSettled && isCompleted && rewardPerWinner !== undefined && (
                  <div style={{
                    padding: "14px 28px",
                    borderRadius: 12,
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    color: "#86efac",
                    fontSize: 16,
                    fontWeight: 600,
                  }}>
                    💰 已结算：{formatEther(rewardPerWinner)} ETH
                  </div>
                )}

                {/* 已报名但今日已签到或无法签到 */}
                {hasJoined && !isCreator && activityStatus === ActivityStatus.Active && 
                 !canCheckIn && !participantInfo?.eliminated && !isCompleted && (
                  <div style={{
                    padding: "14px 28px",
                    borderRadius: 12,
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    color: "#86efac",
                    fontSize: 16,
                    fontWeight: 600,
                  }}>
                    ✅ 已报名参加
                    {currentRound !== undefined && totalRounds !== undefined && (
                      <span style={{ fontSize: 14, opacity: 0.8, marginLeft: 8 }}>
                        (第 {Number(currentRound) + 1} / {Number(totalRounds)} 天)
                        {participantInfo?.lastCheckInRound !== null && 
                         participantInfo?.lastCheckInRound !== undefined && (
                          <span style={{ marginLeft: 4 }}>
                            - 已签到第 {Number(participantInfo.lastCheckInRound) + 1} 天
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}

                {/* 进行中状态 - 非发布者且未报名 */}
                {activityStatus === ActivityStatus.Active && !isCreator && !hasJoined && (
                  <div style={{
                    padding: "14px 28px",
                    borderRadius: 12,
                    background: "rgba(156, 163, 175, 0.2)",
                    border: "1px solid rgba(156, 163, 175, 0.3)",
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: 16,
                    fontWeight: 600,
                  }}>
                    活动进行中
                  </div>
                )}
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

