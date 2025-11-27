"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, usePublicClient, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { ACTIVITY_REGISTRY_ABI, CHALLENGE_ABI } from "../../../lib/activityRegistry";
import { IncentiveType } from "../../../lib/types";
import { saveUserCompletedActivity } from "../../../lib/activityStorage";
import { ParticleField } from "../../../components/animations/ParticleField";
import { PrizePoolAnimation } from "../../../components/animations/PrizePoolAnimation";
import Link from "next/link";

const ACTIVITY_REGISTRY_ADDRESS = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";

// 活动状态枚举（对应合约中的 Status）
enum ActivityStatus {
  Scheduled = 0, // 未开始
  Active = 1,    // 进行中
  Settled = 2    // 已结束
}

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  
  // 判断是否从 My Journey 页面跳转过来
  const fromProfile = searchParams.get("from") === "profile" || 
    (typeof window !== "undefined" && document.referrer.includes("/profile"));
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
  const [successVisible, setSuccessVisible] = useState(false);

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
  
  // 所有活动都是押金模式
  const activityABI = CHALLENGE_ABI;
  const joinFunctionName = "joinChallenge";
  const startFunctionName = "forceStart";
  const endFunctionName = "forceEnd";

  // 从活动合约读取状态信息
  const { data: challengeCreator } = useReadContract({
    address: challengeAddress,
    abi: activityABI,
    functionName: "creator",
    query: {
      enabled: !!challengeAddress && metadata !== undefined
    }
  });

  const { data: challengeStatus } = useReadContract({
    address: challengeAddress,
    abi: activityABI,
    functionName: "viewStatus",
    query: {
      enabled: !!challengeAddress && metadata !== undefined
    }
  });

  const { data: startTime } = useReadContract({
    address: challengeAddress,
    abi: activityABI,
    functionName: "startTime",
    query: {
      enabled: !!challengeAddress && metadata !== undefined
    }
  });

  // 押金金额
  const { data: depositAmount } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "depositAmount",
    query: {
      enabled: !!challengeAddress && metadata !== undefined
    }
  });

  const { data: participantCount } = useReadContract({
    address: challengeAddress,
    abi: activityABI,
    functionName: "participantCount",
    query: {
      enabled: !!challengeAddress && metadata !== undefined
    }
  });

  const { data: maxParticipants } = useReadContract({
    address: challengeAddress,
    abi: activityABI,
    functionName: "maxParticipants",
    query: {
      enabled: !!challengeAddress && metadata !== undefined
    }
  });

  // 获取当前用户的参与信息
  const { data: userParticipantInfo, refetch: refetchParticipantInfo } = useReadContract({
    address: challengeAddress,
    abi: activityABI,
    functionName: "getParticipantInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: !!challengeAddress && !!address && isConnected && metadata !== undefined
    }
  });

  // 获取当前轮次和总轮次
  const { data: currentRound, refetch: refetchCurrentRound } = useReadContract({
    address: challengeAddress,
    abi: activityABI,
    functionName: "currentRound",
    query: {
      enabled: !!challengeAddress && metadata !== undefined
    }
  });

  const { data: totalRounds, refetch: refetchTotalRounds } = useReadContract({
    address: challengeAddress,
    abi: activityABI,
    functionName: "totalRounds",
    query: {
      enabled: !!challengeAddress && metadata !== undefined
    }
  });

  // 奖励金额
  const { data: rewardPerWinner } = useReadContract({
    address: challengeAddress,
    abi: CHALLENGE_ABI,
    functionName: "rewardPerWinner",
    query: {
      enabled: !!challengeAddress && metadata !== undefined
    }
  });

  const { data: winnersCount } = useReadContract({
    address: challengeAddress,
    abi: activityABI,
    functionName: "winnersCount",
    query: {
      enabled: !!challengeAddress && metadata !== undefined
    }
  });

  // 处理元数据
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
        incentiveType: Number(metadata[7] || 0) as IncentiveType
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
        refetchCurrentRound();
        refetchTotalRounds();
        // 如果状态变化较大，可以刷新整个页面
        // window.location.reload();
      }, 1500);
    }
  }, [isConfirmed, refetchParticipantInfo, refetchCurrentRound, refetchTotalRounds]);

  // 成功提示自动消失（带淡出效果，2秒后消失）
  useEffect(() => {
    if (success) {
      // 立即显示（淡入）
      setSuccessVisible(true);
      // 1.5秒后开始淡出
      const fadeOutTimer = setTimeout(() => {
        setSuccessVisible(false);
      }, 1500);
      // 2秒后完全清除（淡出动画0.5秒）
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

  // ========== 角色和状态判断 ==========
  
  // 判断是否为发布者
  const isCreator = address && challengeInfo?.creator && 
    address.toLowerCase() === challengeInfo.creator.toLowerCase();

  // 获取活动状态（使用 viewStatus 的结果）
  const activityStatus: ActivityStatus = challengeInfo?.status !== undefined 
    ? challengeInfo.status as ActivityStatus 
    : ActivityStatus.Scheduled;

  // 判断用户是否已报名
  // fix: 如果正在提交报名交易，也视为已报名，让按钮立即变化
  const hasJoined = participantInfo?.joined || (isPending && hash !== undefined) || false;
  
  // NOT_CHECKED 常量（合约中 type(uint256).max = 2^256 - 1）
  // 在 JavaScript 中，这个值太大无法直接表示，我们用一个接近的值来判断
  const NOT_CHECKED_THRESHOLD = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00");
  
  // ========== 签到状态判断 ==========
  // 判断今日是否已签到
  const isTodayCheckedIn = (() => {
    if (!hasJoined || !participantInfo || currentRound === undefined) {
      return false;
    }
    
    const lastCheckIn = participantInfo.lastCheckInRound;
    if (lastCheckIn === null || lastCheckIn === undefined) {
      return false;
    }
    
    const lastCheckInBigInt = BigInt(String(lastCheckIn));
    const currentRoundBigInt = BigInt(String(currentRound));
    
    // 如果 lastCheckInRound 是 NOT_CHECKED，说明未签到过
    if (lastCheckInBigInt >= NOT_CHECKED_THRESHOLD) {
      return false;
    }
    
    // 如果 lastCheckInRound 等于当前轮次，说明今天已签到
    return lastCheckInBigInt === currentRoundBigInt;
  })();
  
  // 判断是否可以签到（活动进行中 + 已报名 + 未淘汰 + 今日未签到）
  const canCheckIn = (() => {
    // 基础条件检查
    if (activityStatus !== ActivityStatus.Active) {
      return false;
    }
    if (!hasJoined) {
      return false;
    }
    if (participantInfo?.eliminated) {
      return false;
    }
    if (currentRound === undefined || totalRounds === undefined) {
      return false;
    }
    if (Number(currentRound) >= Number(totalRounds)) {
      return false;
    }
    
    // 如果今天已签到，不能再次签到
    if (isTodayCheckedIn) {
      return false;
    }
    
    // 检查 lastCheckInRound
    const lastCheckIn = participantInfo?.lastCheckInRound;
    if (lastCheckIn === null || lastCheckIn === undefined) {
      return true; // 未签到过，可以签到
    }
    
    const lastCheckInBigInt = BigInt(String(lastCheckIn));
    const currentRoundBigInt = BigInt(String(currentRound));
    
    // 如果 lastCheckInRound 是 NOT_CHECKED（未签到过），允许签到第0天
    if (lastCheckInBigInt >= NOT_CHECKED_THRESHOLD) {
      return Number(currentRound) === 0;
    }
    
    // 已签到过，检查是否小于当前轮次（可以签到今天）
    return lastCheckInBigInt < currentRoundBigInt;
  })();
  
  // 计算连续签到天数
  const consecutiveCheckInDays = (() => {
    if (!hasJoined || !participantInfo || currentRound === undefined) {
      return 0;
    }
    
    const lastCheckIn = participantInfo.lastCheckInRound;
    if (lastCheckIn === null || lastCheckIn === undefined) {
      return 0;
    }
    
    const lastCheckInBigInt = BigInt(String(lastCheckIn));
    
    // 如果 lastCheckInRound 是 NOT_CHECKED，说明未签到过
    if (lastCheckInBigInt >= NOT_CHECKED_THRESHOLD) {
      return 0;
    }
    
    // 如果今天已签到，返回 lastCheckInRound + 1
    if (isTodayCheckedIn) {
      return Number(lastCheckInBigInt) + 1;
    }
    
    // 如果今天未签到，返回 lastCheckInRound + 1（表示已签到的天数）
    return Number(lastCheckInBigInt) + 1;
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

  // 自动更新用户参与活动的状态到档案（活动结束时）
  useEffect(() => {
    // 条件：活动已结束 && 用户已连接 && 用户已报名
    if (
      isSettled &&
      address &&
      isConnected &&
      participantInfo?.joined &&
      activityMetadata
    ) {
      // 构建活动元数据，更新状态
      const updatedActivity = {
        activityContract: activityMetadata.activityContract || "",
        creator: activityMetadata.creator || "",
        creatorName: activityMetadata.creatorName || "",
        title: activityMetadata.title || "",
        description: activityMetadata.description || "",
        createdAt: activityMetadata.createdAt || BigInt(0),
        isPublic: activityMetadata.isPublic !== undefined ? activityMetadata.isPublic : true,
        incentiveType: (activityMetadata.incentiveType !== undefined ? activityMetadata.incentiveType : 0) as IncentiveType,
        activityId: activityId ? Number(activityId) : undefined,
        isCompleted: participantInfo?.isCompleted || false,
        isEliminated: participantInfo?.eliminated || false,
      };
      
      // 更新到用户档案（如果已存在则更新状态，不存在则创建）
      saveUserCompletedActivity(address, updatedActivity);
    }
  }, [isSettled, address, isConnected, participantInfo, activityMetadata, activityId]);

  // ========== 按钮显示逻辑 ==========
  
  // 未开始状态
  const showStartButton = isCreator && activityStatus === ActivityStatus.Scheduled;
  
  // 进行中状态
  const showEndButton = isCreator && activityStatus === ActivityStatus.Active;
  
  // 报名按钮（未开始 + 已连接，创建者也可以报名）
  const showJoinButton = 
    activityStatus === ActivityStatus.Scheduled && 
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
        address: challengeAddress as `0x${string}`,
        abi: activityABI,
        functionName: startFunctionName
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
        address: challengeAddress as `0x${string}`,
        abi: activityABI,
        functionName: endFunctionName
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
      
      if (depositAmount) {
        await writeContractAsync({
          address: challengeAddress as `0x${string}`,
          abi: activityABI,
          functionName: joinFunctionName,
          value: depositAmount
        });
        // fix: 报名交易提交后立即显示成功消息，按钮状态会通过 hasJoined 立即更新
        setSuccess("报名成功！");
        
        // fix: 报名成功后立即记录活动到用户档案
        if (activityMetadata) {
          const participatedActivity = {
            activityContract: activityMetadata.activityContract || "",
            creator: activityMetadata.creator || "",
            creatorName: activityMetadata.creatorName || "",
            title: activityMetadata.title || "",
            description: activityMetadata.description || "",
            createdAt: activityMetadata.createdAt || BigInt(0),
            isPublic: activityMetadata.isPublic !== undefined ? activityMetadata.isPublic : true,
            incentiveType: (activityMetadata.incentiveType !== undefined ? activityMetadata.incentiveType : 0) as IncentiveType,
            activityId: activityId ? Number(activityId) : undefined,
            isCompleted: false,
            isEliminated: false,
          };
          saveUserCompletedActivity(address, participatedActivity);
        }
      } else {
        setError("无法获取押金金额");
        return;
      }
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
        address: challengeAddress as `0x${string}`,
        abi: activityABI,
        functionName: "checkIn"
      });
      setSuccess("签到成功！");
      
      // 立即刷新参与信息、当前轮次等信息，更新签到状态
      setTimeout(() => {
        refetchParticipantInfo();
        refetchCurrentRound();
        refetchTotalRounds();
      }, 1000);
    } catch (err: any) {
      console.error("签到失败:", err);
      let errorMessage = err.shortMessage || err.message || "签到失败";
      
      // 解析 revert reason
      if (errorMessage.includes("revert")) {
        const match = errorMessage.match(/revert\s+(.+?)(?:\n|$)/);
        if (match) {
          errorMessage = match[1].trim();
        }
      }
      
      // 友好的错误提示
      if (errorMessage.includes("ALREADY_CHECKED_IN_TODAY")) {
        errorMessage = "今日已签到，请明天再来";
      } else if (errorMessage.includes("NOT_ACTIVE")) {
        errorMessage = "活动未开始或已结束";
      } else if (errorMessage.includes("NOT_PARTICIPANT")) {
        errorMessage = "请先报名参加活动";
      } else if (errorMessage.includes("ELIMINATED")) {
        errorMessage = "您已被淘汰，无法签到";
      } else if (errorMessage.includes("DAY_EXPIRED")) {
        errorMessage = "今日签到时间已过";
      }
      
      setError(errorMessage);
    }
  };

  // ========== 渲染 ==========

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0a0a0f",
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
        background: "#0a0a0f",
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
    <div
      style={{
        minHeight: "100vh",
        fontFamily:
          "'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#0a0a0f",
      }}
    >
      {/* 渐变背景 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3), transparent)",
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
        {/* 返回按钮 - 左上角，轻量样式 */}
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
          }}
        >
          <span>←</span>
          <span>{fromProfile ? "Back to My Journey" : "Back to Activity Hub"}</span>
        </Link>

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

        {/* 成功提示 - 带淡入淡出效果，固定在页面顶部0.01%位置，2秒后消失 */}
        {success && (
          <div 
            style={{
              position: "fixed",
              top: "5%", // fix: 修改报名成功提示框距顶部距离为5%
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

        {/* 主要内容区域 - 左右两列布局 */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 24,
          marginBottom: 24,
        }}
        className="activity-detail-grid"
        >
          {/* 左侧：活动基本信息卡片 */}
          <div style={{
            padding: 24,
            borderRadius: 16,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}>
            {/* 标题和状态 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <h1 style={{
                  fontSize: 24,
                  fontWeight: 700,
                  margin: 0,
                  color: "#ffffff",
                  lineHeight: 1.3,
                }}>
                  {activityMetadata.title}
                </h1>
              </div>
              {/* 活动描述 */}
              <p style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgba(255, 255, 255, 0.8)",
                margin: 0,
              }}>
                {activityMetadata.description}
              </p>
            </div>

            {/* 活动详细信息 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 20, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  创建者
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#ffffff", fontWeight: 500 }}>
                  <img
                    src={activityMetadata.creator ? `https://effigy.im/a/${activityMetadata.creator}.svg` : ""}
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
              {startTime && Number(startTime) > 0 && (
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    开始时间
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.8)", fontFamily: "monospace" }}>
                    {new Date(Number(startTime) * 1000).toLocaleString("zh-CN")}
                  </div>
                </div>
              )}
              {totalRounds && (
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    挑战天数
                  </div>
                  <div style={{ fontSize: 14, color: "#ffffff", fontWeight: 500 }}>
                    {Number(totalRounds)} 天
                  </div>
                </div>
              )}
              {currentRound !== undefined && totalRounds && activityStatus === ActivityStatus.Active && (
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    当前进度
                  </div>
                  <div style={{ fontSize: 14, color: "#ffffff", fontWeight: 500 }}>
                    第 {Number(currentRound) + 1} / {Number(totalRounds)} 天
                  </div>
                </div>
              )}
              {isSettled && winnersCount !== undefined && (
                <>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      完成人数
                    </div>
                    <div style={{ fontSize: 14, color: "#ffffff", fontWeight: 500 }}>
                      {Number(winnersCount)} 人
                    </div>
                  </div>
                  {rewardPerWinner !== undefined && (
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        每人奖励
                      </div>
                      {fromProfile ? (
                        <div style={{
                          fontSize: 16,
                          color: "rgba(156, 163, 175, 0.8)", // fix: 从 My Journey 跳转时取消动画，只显示灰色文本
                          fontWeight: 600,
                        }}>
                          {formatEther(rewardPerWinner)} ETH
                        </div>
                      ) : (
                        <PrizePoolAnimation
                          value={`${formatEther(rewardPerWinner)} ETH`}
                          delay={0.4}
                          style={{
                            fontSize: 16,
                            color: "#86efac",
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 右侧：奖池与进度卡片 */}
          <div style={{
            padding: 24,
            borderRadius: 16,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}>
            <h2 style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 20,
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              opacity: 0.7,
            }}>
              奖池与进度
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  当前奖池金额
                </div>
                {fromProfile ? (
                  <div style={{
                    fontSize: 24,
                    color: "rgba(156, 163, 175, 0.8)", // fix: 从 My Journey 跳转时取消动画，只显示灰色文本
                    fontWeight: 700,
                  }}>
                    {depositAmount && participantCount
                      ? `${formatEther(depositAmount * BigInt(participantCount))} ETH`
                      : "0 ETH"}
                  </div>
                ) : (
                  <PrizePoolAnimation
                    value={
                      depositAmount && participantCount
                        ? `${formatEther(depositAmount * BigInt(participantCount))} ETH`
                        : "0 ETH"
                    }
                    delay={0.2}
                    style={{
                      fontSize: 24,
                      color: "#86efac",
                      fontWeight: 700,
                    }}
                  />
                )}
              </div>
              <div style={{
                paddingTop: 16,
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              }}>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  已报名人数 / 上限
                </div>
                <div style={{ fontSize: 14, color: "#ffffff", fontWeight: 500 }}>
                  {participantCount?.toString() || "0"} / {maxParticipants?.toString() || "0"}
                </div>
              </div>
              {/* fix: 删除显示0的押金金额行，只在有押金时显示 */}
              {depositAmount && Number(depositAmount) > 0 && (
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    每人押金
                  </div>
                  <div style={{ fontSize: 14, color: "#ffffff", fontWeight: 500 }}>
                    {formatEther(depositAmount)} ETH
                  </div>
                </div>
              )}
              {currentRound !== undefined && totalRounds && (
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    当前第几天 / 总天数
                  </div>
                  <div style={{ fontSize: 14, color: "#ffffff", fontWeight: 500 }}>
                    {Number(currentRound) + 1} / {Number(totalRounds)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部：独立的操作区卡片 */}
        <div style={{
          padding: 24,
          borderRadius: 16,
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}>
          <h2 style={{
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 20,
            color: "#ffffff",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            opacity: 0.7,
          }}>
            操作
          </h2>
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

                {/* 报名参加按钮 - 未开始状态（创建者也可以报名） */}
                {showJoinButton && (
                  <button
                    onClick={handleJoinActivity}
                    disabled={isLoading || hasJoined}
                    style={{
                      padding: "14px 28px",
                      borderRadius: 12,
                      border: hasJoined 
                        ? "1px solid rgba(156, 163, 175, 0.3)"
                        : "1px solid rgba(120, 119, 198, 0.5)",
                      background: hasJoined
                        ? "rgba(156, 163, 175, 0.2)"
                        : isLoading 
                        ? "rgba(120, 119, 198, 0.2)" 
                        : "rgba(120, 119, 198, 0.3)",
                      color: hasJoined 
                        ? "rgba(255, 255, 255, 0.6)"
                        : "#ffffff",
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: (isLoading || hasJoined) ? "not-allowed" : "pointer",
                      opacity: (isLoading || hasJoined) ? 0.6 : 1,
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && !hasJoined) {
                        e.currentTarget.style.background = "rgba(120, 119, 198, 0.4)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading && !hasJoined) {
                        e.currentTarget.style.background = "rgba(120, 119, 198, 0.3)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    {isLoading && isPending 
                      ? "交易确认中..." 
                      : hasJoined
                      ? "已报名"
                      : `报名参加 (${depositAmount ? formatEther(depositAmount) : "0"} ETH)`}
                  </button>
                )}

                {/* 签到按钮区域 - 已报名用户可见（创建者报名后也可以签到） */}
                {hasJoined && !participantInfo?.eliminated && !isCompleted && (
                  <>
                    {/* 活动未开始 - 显示"等待开始" */}
                    {activityStatus === ActivityStatus.Scheduled && (
                      <button
                        disabled
                        style={{
                          padding: "14px 28px",
                          borderRadius: 12,
                          border: "1px solid rgba(156, 163, 175, 0.3)",
                          background: "rgba(156, 163, 175, 0.2)",
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: 16,
                          fontWeight: 600,
                          cursor: "not-allowed",
                          opacity: 0.6,
                        }}
                      >
                        等待开始
                      </button>
                    )}

                    {/* 活动进行中 - 今日未签到，显示可点击的"今日签到"按钮 */}
                    {activityStatus === ActivityStatus.Active && canCheckIn && (
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

                    {/* 活动进行中 - 今日已签到，显示"今日已签到" */}
                    {activityStatus === ActivityStatus.Active && !canCheckIn && isTodayCheckedIn && (
                      <button
                        disabled
                        style={{
                          padding: "14px 28px",
                          borderRadius: 12,
                          border: "1px solid rgba(34, 197, 94, 0.3)",
                          background: "rgba(34, 197, 94, 0.2)",
                          color: "#86efac",
                          fontSize: 16,
                          fontWeight: 600,
                          cursor: "not-allowed",
                          opacity: 0.8,
                        }}
                      >
                        ✅ 今日已签到
                        {consecutiveCheckInDays > 0 && totalRounds !== undefined && (
                          <span style={{ fontSize: 14, opacity: 0.8, marginLeft: 8 }}>
                            (已连续签到 {consecutiveCheckInDays} / {Number(totalRounds)} 天)
                          </span>
                        )}
                      </button>
                    )}

                    {/* 活动已结束 - 显示"活动已结束" */}
                    {isSettled && (
                      <button
                        disabled
                        style={{
                          padding: "14px 28px",
                          borderRadius: 12,
                          border: "1px solid rgba(156, 163, 175, 0.3)",
                          background: "rgba(156, 163, 175, 0.2)",
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: 16,
                          fontWeight: 600,
                          cursor: "not-allowed",
                          opacity: 0.6,
                        }}
                      >
                        活动已结束
                      </button>
                    )}
                  </>
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
                    💰 已结算：{fromProfile ? (
                      <span style={{
                        color: "rgba(156, 163, 175, 0.8)", // fix: 从 My Journey 跳转时取消动画，只显示灰色文本
                      }}>
                        {formatEther(rewardPerWinner)} ETH
                      </span>
                    ) : (
                      <PrizePoolAnimation
                        value={`${formatEther(rewardPerWinner)} ETH`}
                        delay={0.3}
                        style={{
                          display: "inline",
                          color: "#86efac",
                        }}
                      />
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
        </div>
        </div>
      </div>
  );
}

