"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAccount, useReadContract, useConnect, useDisconnect, usePublicClient } from "wagmi";
import { injected } from "wagmi/connectors";
import { ActivityMetadata, IncentiveType } from "../../lib/types";
import { getUserCompletedActivities, saveUserCompletedActivity } from "../../lib/activityStorage";
import { ActivityCard } from "../../components/activities/ActivityCard";
import { NFTActivityCard } from "../../components/activities/NFTActivityCard";
import { ParticleField } from "../../components/animations/ParticleField";
import { CHALLENGE_ABI, ACTIVITY_REGISTRY_ABI } from "../../lib/activityRegistry";
import { NFT_ACTIVITY_ABI } from "../../lib/nftActivityRegistry";
import Link from "next/link";

const ACTIVITY_REGISTRY_ADDRESS = "0x9E545E3C0baAB3E08CdfD552C960A1050f373042"; // fix: 用于验证活动是否在链上存在

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [activities, setActivities] = useState<ActivityMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false); // 控制地址显示：false=简略，true=完整
  const [filterSuccess, setFilterSuccess] = useState<"all" | "active" | "success" | "failed">("active"); // all=全部，active=参与中，success=成功坚持，failed=未成功
  // Social Web3 和 Professional Web3 的独立筛选状态
  const [socialFilter, setSocialFilter] = useState<"active" | "settled" | null>("active"); // null=全部，active=参与中，settled=已结束（默认显示参与中）
  const [professionalFilter, setProfessionalFilter] = useState<"active" | "settled" | null>("active"); // null=全部，active=参与中，settled=已结束（默认显示参与中）
  const publicClient = usePublicClient();
  const [activityStatuses, setActivityStatuses] = useState<Record<string, { isCompleted: boolean; isEliminated: boolean; challengeStatus?: number }>>({}); // fix: 添加 challengeStatus 字段

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // fix: 只在客户端挂载后执行，避免 hydration 错误
    if (!mounted) return;
    
    if (!address || !isConnected) {
      setLoading(false);
      return;
    }

    // 获取用户参与的活动（从 localStorage）
    const fetchActivities = async () => {
      setLoading(true);
      try {
        // 从 localStorage 获取用户参与的活动
        const participatedActivities = getUserCompletedActivities(address);
        console.log("📚 从用户档案读取到", participatedActivities.length, "个参与的活动");
        console.log("📚 活动详情:", participatedActivities.map(a => ({
          title: a.title,
          isCompleted: a.isCompleted,
          isEliminated: a.isEliminated,
          activityId: a.activityId,
          activityContract: a.activityContract
        })));
        
        // fix: 严格验证活动是否在当前链上存在，过滤掉所有无效的活动
        let validActivities: typeof participatedActivities = [];
        if (publicClient && participatedActivities.length > 0) {
          try {
            // 第一步：获取当前链上的活动总数
            const currentActivityCount = await publicClient.readContract({
              address: ACTIVITY_REGISTRY_ADDRESS as `0x${string}`,
              abi: ACTIVITY_REGISTRY_ABI,
              functionName: "activityCount"
            }) as bigint;
            
            const maxActivityId = Number(currentActivityCount);
            console.log(`📊 当前链上活动总数: ${maxActivityId}`);
            
            // 第二步：验证每个活动是否在链上存在
            const validationResults = await Promise.allSettled(
              participatedActivities.map(async (activity) => {
                // 如果有 activityId，先检查是否超出当前活动总数
                if (activity.activityId !== undefined) {
                  // fix: 如果 activityId 超出当前活动总数，直接视为无效
                  if (activity.activityId > maxActivityId || activity.activityId <= 0) {
                    console.warn(`⚠️ 活动 ${activity.title} (ID: ${activity.activityId}) 超出当前活动范围 (1-${maxActivityId})，将被移除`);
                    return { activity, isValid: false, reason: "activityId_out_of_range" };
                  }
                  
                  // 验证活动是否在 ActivityRegistry 中存在
                  try {
                    const timeoutPromise = new Promise((_, reject) => 
                      setTimeout(() => reject(new Error("验证超时")), 3000)
                    );
                    
                    const readPromise = publicClient.readContract({
                      address: ACTIVITY_REGISTRY_ADDRESS as `0x${string}`,
                      abi: ACTIVITY_REGISTRY_ABI,
                      functionName: "getActivityMetadataTuple",
                      args: [BigInt(activity.activityId)]
                    });
                    
                    const result = await Promise.race([readPromise, timeoutPromise]) as any;
                    
                    // 验证返回的数据是否有效（至少应该有 title）
                    if (result && Array.isArray(result) && result.length >= 4 && result[3]) {
                      // fix: 验证返回的合约地址是否与存储的一致（如果存储了合约地址）
                      if (activity.activityContract && result[0]) {
                        const chainContract = String(result[0]).toLowerCase();
                        const storedContract = activity.activityContract.toLowerCase();
                        if (chainContract !== storedContract) {
                          console.warn(`⚠️ 活动 ${activity.title} (ID: ${activity.activityId}) 的合约地址不匹配，将被移除`);
                          return { activity, isValid: false, reason: "contract_mismatch" };
                        }
                      }
                      return { activity, isValid: true };
                    } else {
                      console.warn(`⚠️ 活动 ${activity.title} (ID: ${activity.activityId}) 返回数据无效，将被移除`);
                      return { activity, isValid: false, reason: "invalid_data" };
                    }
                  } catch (err: any) {
                    const errorMsg = err?.message || err?.shortMessage || String(err);
                    console.warn(`⚠️ 活动 ${activity.title} (ID: ${activity.activityId}) 在链上不存在:`, errorMsg);
                    return { activity, isValid: false, reason: "not_found_on_chain" };
                  }
                } else if (activity.activityContract) {
                  // 如果没有 activityId 但有合约地址，验证合约是否存在且属于当前 ActivityRegistry
                  try {
                    // 先验证合约是否存在
                    const timeoutPromise1 = new Promise((_, reject) => 
                      setTimeout(() => reject(new Error("验证超时")), 3000)
                    );
                    
                    const readCreatorPromise = publicClient.readContract({
                      address: activity.activityContract as `0x${string}`,
                      abi: CHALLENGE_ABI,
                      functionName: "creator"
                    });
                    
                    await Promise.race([readCreatorPromise, timeoutPromise1]);
                    
                    // 然后验证合约是否在 ActivityRegistry 中注册
                    const timeoutPromise2 = new Promise((_, reject) => 
                      setTimeout(() => reject(new Error("验证超时")), 3000)
                    );
                    
                    const readActivityIdPromise = publicClient.readContract({
                      address: ACTIVITY_REGISTRY_ADDRESS as `0x${string}`,
                      abi: ACTIVITY_REGISTRY_ABI,
                      functionName: "contractToActivity",
                      args: [activity.activityContract as `0x${string}`]
                    });
                    
                    const registeredActivityId = await Promise.race([readActivityIdPromise, timeoutPromise2]) as bigint;
                    
                    // 如果返回的 activityId 为 0，说明合约未在 ActivityRegistry 中注册
                    if (registeredActivityId === BigInt(0)) {
                      console.warn(`⚠️ 活动 ${activity.title} 的合约未在 ActivityRegistry 中注册，将被移除`);
                      return { activity, isValid: false, reason: "not_registered" };
                    }
                    
                    // 验证 activityId 是否在有效范围内
                    if (Number(registeredActivityId) > maxActivityId || Number(registeredActivityId) <= 0) {
                      console.warn(`⚠️ 活动 ${activity.title} 的注册ID (${registeredActivityId}) 超出范围，将被移除`);
                      return { activity, isValid: false, reason: "registered_id_out_of_range" };
                    }
                    
                    return { activity, isValid: true };
                  } catch (err: any) {
                    const errorMsg = err?.message || err?.shortMessage || String(err);
                    console.warn(`⚠️ 活动 ${activity.title} 的合约验证失败:`, errorMsg);
                    return { activity, isValid: false, reason: "contract_validation_failed" };
                  }
                } else {
                  // 既没有 activityId 也没有合约地址，视为无效
                  console.warn(`⚠️ 活动 ${activity.title} 缺少活动ID和合约地址，将被移除`);
                  return { activity, isValid: false, reason: "missing_ids" };
                }
              })
            );
            
            // 第三步：收集所有有效的活动
            validActivities = validationResults
              .filter((result): result is PromiseFulfilledResult<{ activity: typeof participatedActivities[0]; isValid: boolean; reason?: string }> => 
                result.status === "fulfilled" && result.value.isValid
              )
              .map(result => result.value.activity);
            
            const invalidCount = participatedActivities.length - validActivities.length;
            console.log(`✅ 验证完成: ${validActivities.length} 个活动有效，${invalidCount} 个活动无效`);
            
            // 第四步：更新 localStorage，只保留有效的活动
            if (invalidCount > 0) {
              const key = `nebulaflow_completed_${address.toLowerCase()}`;
              const serialized = validActivities.map((a) => ({
                ...a,
                createdAt: a.createdAt.toString(),
              }));
              localStorage.setItem(key, JSON.stringify(serialized));
              console.log(`✅ 已清理 ${invalidCount} 个无效活动，保留 ${validActivities.length} 个有效活动`);
            }
            
            setActivities(validActivities);
          } catch (err: any) {
            console.error("验证活动时出错:", err);
            // 如果验证过程出错，清空所有活动（安全策略：只显示确认存在的活动）
            console.warn("⚠️ 验证过程出错，清空活动列表以确保数据一致性");
            const key = `nebulaflow_completed_${address.toLowerCase()}`;
            localStorage.setItem(key, JSON.stringify([]));
            setActivities([]);
          }
        } else {
          // 如果没有 publicClient，不显示任何活动（安全策略）
          console.warn("⚠️ 无法验证活动，不显示任何活动");
          setActivities([]);
        }
        
        // fix: 从链上同步每个活动的状态（添加超时和更好的错误处理）
        // 使用验证后的有效活动列表
        const activitiesToSync = validActivities;
        if (publicClient && address && isConnected && activitiesToSync.length > 0) {
          const statusMap: Record<string, { isCompleted: boolean; isEliminated: boolean; challengeStatus?: number }> = {};
          
          // 先使用 localStorage 中的状态作为默认值
          activitiesToSync.forEach(activity => {
            if (activity.activityContract) {
              statusMap[activity.activityContract.toLowerCase()] = {
                isCompleted: activity.isCompleted ?? false,
                isEliminated: activity.isEliminated ?? false,
                challengeStatus: undefined // 初始化为 undefined，等待链上数据
              };
            }
          });
          setActivityStatuses(statusMap); // 立即设置默认状态，避免等待
          
          // 然后异步更新链上状态（带超时）
          const updatePromises = activitiesToSync.map(async (activity) => {
            if (!activity.activityContract) return;
            
            // 验证地址格式
            const contractAddress = activity.activityContract as `0x${string}`;
            if (!contractAddress || contractAddress === "0x" || contractAddress.length !== 42) {
              console.warn(`⚠️ 活动 ${activity.title} 的合约地址无效:`, contractAddress);
              return;
            }
            
            try {
              // 并行读取参与信息和活动状态
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("读取超时")), 5000)
              );
              
              // 根据活动类型选择不同的 ABI
              const isNFTActivity = activity.incentiveType === IncentiveType.NFTPool;
              const activityABI = isNFTActivity ? NFT_ACTIVITY_ABI : CHALLENGE_ABI;
              
              const [participantResult, challengeStatusResult] = await Promise.all([
                Promise.race([
                  publicClient.readContract({
                    address: contractAddress,
                    abi: activityABI,
                    functionName: "getParticipantInfo",
                    args: address ? [address as `0x${string}`] : undefined
                  }),
                  timeoutPromise
                ]) as Promise<any>,
                Promise.race([
                  publicClient.readContract({
                    address: contractAddress,
                    abi: activityABI,
                    functionName: "viewStatus"
                  }),
                  timeoutPromise
                ]) as Promise<any>
              ]);
              
              if (participantResult && Array.isArray(participantResult)) {
                // 押金活动：participantResult[1] = eliminated, participantResult[6] = isCompleted
                // NFT 活动：participantResult[1] = eliminated, participantResult[4] = isCompleted
                const isEliminated = participantResult[1] || false;
                const isCompleted = isNFTActivity 
                  ? (participantResult[4] || false) 
                  : (participantResult[6] || false);
                const challengeStatus = challengeStatusResult !== undefined ? Number(challengeStatusResult) : undefined;
                
                statusMap[activity.activityContract.toLowerCase()] = {
                  isCompleted: Boolean(isCompleted),
                  isEliminated: Boolean(isEliminated),
                  challengeStatus: challengeStatus // fix: 存储活动状态（0=Scheduled, 1=Active, 2=Settled）
                };
                
                // 如果状态有变化，更新 localStorage
                if (activity.isCompleted !== Boolean(isCompleted) || activity.isEliminated !== Boolean(isEliminated)) {
                  const updatedActivity = {
                    ...activity,
                    isCompleted: Boolean(isCompleted),
                    isEliminated: Boolean(isEliminated)
                  };
                  saveUserCompletedActivity(address, updatedActivity);
                }
                
                // 更新状态
                setActivityStatuses({ ...statusMap });
              }
            } catch (err: any) {
              // fix: 更详细的错误处理，不阻塞页面加载
              const errorMsg = err?.message || err?.shortMessage || String(err);
              if (errorMsg.includes("returned no data") || errorMsg.includes("0x")) {
                console.warn(`⚠️ 活动 ${activity.title} 的合约地址可能无效或合约不存在:`, contractAddress);
              } else {
                console.warn(`⚠️ 读取活动 ${activity.title} 的状态失败:`, errorMsg);
              }
              // 保持使用 localStorage 中的状态，不更新
            }
          });
          
          // 不等待所有 Promise 完成，避免阻塞页面加载
          Promise.allSettled(updatePromises).then(() => {
            console.log("✅ 链上状态同步完成（部分可能失败）:", statusMap);
          });
        } else {
          // 如果没有链上数据，使用 localStorage 中的状态
          const statusMap: Record<string, { isCompleted: boolean; isEliminated: boolean; challengeStatus?: number }> = {};
          participatedActivities.forEach(activity => {
            if (activity.activityContract) {
              statusMap[activity.activityContract.toLowerCase()] = {
                isCompleted: activity.isCompleted ?? false,
                isEliminated: activity.isEliminated ?? false,
                challengeStatus: undefined // 如果没有链上数据，challengeStatus 为 undefined
              };
            }
          });
          setActivityStatuses(statusMap);
        }
      } catch (err) {
        console.error("获取用户活动列表失败:", err);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [address, isConnected, mounted, publicClient]);

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = async () => {
    if (!address || !isConnected) return;
    
    // 重新从 localStorage 获取用户参与的活动
    const participatedActivities = getUserCompletedActivities(address);
    console.log("🔄 刷新后读取到", participatedActivities.length, "个参与的活动");
    setActivities(participatedActivities);
  };

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

      {/* 顶部导航栏 */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: "20px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10, 10, 15, 0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: 24,
            fontWeight: 700,
            backgroundImage: "linear-gradient(120deg, #ffffff, #a78bfa, #ec4899)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            letterSpacing: 1,
            textDecoration: "none",
          }}
        >
          NebulaFlow
        </Link>

        <div style={{ 
          display: "flex", 
          gap: 32, 
          alignItems: "center",
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}>
          <Link
            href="/features"
            style={{
              color: "#ffffff",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 500,
              opacity: 0.9,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.9")}
          >
            Core Features
          </Link>
          <Link
            href="/activities?animate=true"
            onClick={() => {
              sessionStorage.setItem('activities_animate', 'true');
            }}
            style={{
              color: "#ffffff",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 500,
              opacity: 0.9,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.9")}
          >
            Activity Hub
          </Link>
          <Link
            href="/profile"
            style={{
              color: "#ffffff",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 500,
              opacity: 1,
              transition: "opacity 0.2s",
              borderBottom: "2px solid rgba(255, 255, 255, 0.5)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            My Journey
          </Link>
        </div>
        
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {/* 连接钱包按钮 */}
          {mounted && (
            !isConnected ? (
              <button
                onClick={() => connect({ connector: injected() })}
                style={{
                  padding: "10px 16px",
                  borderRadius: 20,
                  borderTop: "1px solid rgba(255, 255, 255, 0.3)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
                  borderLeft: "none",
                  borderRight: "none",
                  background: "transparent",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "opacity 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "120px",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                连接钱包
              </button>
            ) : (
              <button
                onClick={() => {
                  if (showDisconnect) {
                    // 第二次点击，断开连接
                    disconnect();
                    setShowDisconnect(false);
                    if (disconnectTimeoutRef.current) {
                      clearTimeout(disconnectTimeoutRef.current);
                      disconnectTimeoutRef.current = null;
                    }
                  } else {
                    // 第一次点击，显示"断开连接"
                    setShowDisconnect(true);
                    // 清除之前的 timeout
                    if (disconnectTimeoutRef.current) {
                      clearTimeout(disconnectTimeoutRef.current);
                    }
                    // 1.5秒后自动恢复
                    disconnectTimeoutRef.current = setTimeout(() => {
                      setShowDisconnect(false);
                      disconnectTimeoutRef.current = null;
                    }, 1500);
                  }
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 20,
                  borderTop: "1px solid rgba(255, 255, 255, 0.3)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
                  borderLeft: "none",
                  borderRight: "none",
                  background: "transparent",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "opacity 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "120px",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                {showDisconnect ? "断开连接" : (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "")}
              </button>
            )
          )}
        </div>
      </nav>

      {/* 内容区域 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "120px 24px 80px",
        }}
      >

        {!mounted ? (
          // fix: 服务器端渲染时显示加载状态，避免 hydration 错误
          <div style={{ padding: 48, textAlign: "center", color: "#ffffff" }}>
            加载中...
          </div>
        ) : !isConnected ? (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              borderRadius: 24,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
            }}
          >
            <p style={{ fontSize: 18, opacity: 0.8, margin: 0 }}>
              请先连接钱包以查看您的活动档案
            </p>
          </div>
        ) : loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#ffffff" }}>
            加载中...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* 活动列表 */}
            {(() => {
              // 根据筛选条件过滤活动（使用链上同步的状态）
              const filteredActivities = activities.filter((activity) => {
                // fix: 优先使用链上同步的状态，如果没有则使用 localStorage 中的状态
                const contractKey = activity.activityContract?.toLowerCase() || "";
                const status = activityStatuses[contractKey] || {
                  isCompleted: activity.isCompleted ?? false,
                  isEliminated: activity.isEliminated ?? false,
                  challengeStatus: undefined
                };
                
                const isCompleted = status.isCompleted === true;
                const isEliminated = status.isEliminated === true;
                const challengeStatus = status.challengeStatus; // 0=Scheduled, 1=Active, 2=Settled
                
                if (filterSuccess === "all") {
                  // 全部显示
                  return true;
                } else if (filterSuccess === "active") {
                  // fix: 进行中的活动：已报名 && (未开始 || 进行中) && 未被淘汰
                  // 注意：这里假设用户已报名（因为活动在 localStorage 中）
                  // 如果 challengeStatus 为 undefined，说明链上数据还未同步，暂时不显示（等待同步完成）
                  if (challengeStatus === undefined) {
                    return false; // 等待链上数据同步
                  }
                  const isScheduled = challengeStatus === 0;
                  const isActive = challengeStatus === 1;
                  // 必须已报名（活动在 localStorage 中），且活动状态为未开始或进行中，且未被淘汰
                  return (isScheduled || isActive) && !isEliminated;
                } else if (filterSuccess === "success") {
                  // 成功坚持：活动已结束 && 已完成 && 未被淘汰
                  // 只有活动结束后，才归到成功坚持类别
                  const isSettled = challengeStatus === 2; // 活动已结束
                  return isSettled && isCompleted && !isEliminated;
                } else if (filterSuccess === "failed") {
                  // 未成功：未分得奖金的活动（被淘汰）
                  return isEliminated;
                }
                return true;
              });

              // 分类函数：根据活动描述和类型将活动分类
              const categorizeActivity = (activity: ActivityMetadata): "Professional Web3" | "Social Web3" | "Lifestyle" | null => {
                const description = (activity.description || "").toLowerCase();
                
                // Professional Web3: 描述中包含"比赛"或"会议"
                if (description.includes("比赛") || description.includes("会议")) {
                  return "Professional Web3";
                }
                
                // Social Web3: 描述中包含"集会"或"一起"
                if (description.includes("集会") || description.includes("一起")) {
                  return "Social Web3";
                }
                
                // Lifestyle: 仅押金奖池类活动（incentiveType === 0）
                if (activity.incentiveType === 0) { // 0 = DepositPool
                  return "Lifestyle";
                }
                
                // 如果都不匹配，返回 null（不显示在分类中）
                return null;
              };

              // 将活动分类到三个类别
              // Lifestyle 需要应用筛选逻辑（参与中、成功坚持、未成功）
              let lifestyleActivities = filteredActivities.filter(a => categorizeActivity(a) === "Lifestyle");
              
              // Professional Web3 和 Social Web3 显示所有符合条件的活动（不限制必须是NFT活动）
              // 不受筛选按钮影响，显示所有参与的活动
              const professionalActivities = activities.filter(a => {
                const category = categorizeActivity(a);
                if (category !== "Professional Web3") return false;
                // 显示所有参与的活动，不限制类型
                return true;
              });
              
              // Social Web3 分类：包含所有 Social Web3 活动（包括进行中和已结束的）
              // 渲染时根据状态显示：进行中显示预览卡片，已结束显示 🏆 卡片
              const socialActivities = activities.filter(a => {
                const category = categorizeActivity(a);
                if (category !== "Social Web3") return false;
                // 包含所有 Social Web3 活动，不限制状态
                return true;
              });
              
              // 调试信息
              console.log("🔍 筛选结果:", {
                filterSuccess,
                totalActivities: activities.length,
                filteredCount: filteredActivities.length,
                professionalCount: professionalActivities.length,
                socialCount: socialActivities.length,
                lifestyleCount: lifestyleActivities.length,
                activityStatuses,
                activities: activities.map(a => {
                  const contractKey = a.activityContract?.toLowerCase() || "";
                  const status = activityStatuses[contractKey] || {
                    isCompleted: a.isCompleted ?? false,
                    isEliminated: a.isEliminated ?? false
                  };
                  return {
                    title: a.title,
                    contract: a.activityContract,
                    category: categorizeActivity(a),
                    localStorage: { isCompleted: a.isCompleted, isEliminated: a.isEliminated },
                    chainStatus: status
                  };
                }),
                filtered: filteredActivities.map(a => a.title)
              });


              // Social Web3 已结束活动显示组件：显示 🏆 图标 + 标题和日期（紫色边框）
              const SocialWeb3CompletedCard = ({ activity }: { activity: ActivityMetadata }) => {
                // 根据活动类型选择 ABI
                const isNFTActivity = activity.incentiveType === IncentiveType.NFTPool;
                const activityABI = isNFTActivity ? NFT_ACTIVITY_ABI : CHALLENGE_ABI;
                
                // 从链上读取 totalRounds（活动持续天数）
                const { data: totalRounds } = useReadContract({
                  address: activity.activityContract as `0x${string}` | undefined,
                  abi: activityABI,
                  functionName: "totalRounds",
                  query: {
                    enabled: !!activity.activityContract && isConnected
                  }
                });
                
                // 格式化日期
                const formatDate = (timestamp: bigint) => {
                  const date = new Date(Number(timestamp) * 1000);
                  return date.toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  });
                };
                
                // 计算活动结束日期：活动创建日期（createdAt）+ 持续天数（totalRounds）
                // 使用活动概述中的日期（createdAt）而不是 startTime
                // totalRounds 是天数，每天 86400 秒
                const getEndDate = () => {
                  if (!totalRounds) {
                    // 如果无法读取 totalRounds，回退到显示创建日期
                    return formatDate(activity.createdAt);
                  }
                  
                  // 使用活动创建时间（createdAt）作为开始时间
                  const startTimestamp = Number(activity.createdAt);
                  
                  // 计算结束时间：创建时间 + 持续天数（每天 86400 秒）
                  const daysInSeconds = Number(totalRounds) * 86400;
                  const endTimestamp = BigInt(startTimestamp + daysInSeconds);
                  return formatDate(endTimestamp);
                };

                return (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                      padding: "20px 12px", // 减小左右边距，使边框更贴合内容
                      borderRadius: 12,
                      border: "2px solid rgba(139, 92, 246, 0.35)", // 紫色边框 - 更淡的颜色
                      background: "rgba(139, 92, 246, 0.05)", // 淡紫色背景
                      transition: "all 0.3s",
                      width: "fit-content", // 宽度自适应内容
                      minWidth: "auto", // 移除最小宽度限制
                    }}
                  >
                    {/* 🏆 图标 */}
                    <div style={{ fontSize: 40, filter: "drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))" }}>
                      🏆
                    </div>
                    
                    {/* 活动标题 */}
                    <div style={{ 
                      fontSize: 15, 
                      fontWeight: 600, 
                      color: "#ffffff",
                      textAlign: "center",
                      wordBreak: "break-word",
                    }}>
                      {activity.title}
                    </div>
                    
                    {/* 日期 - 显示活动结束日期（开始日期 + 持续天数） */}
                    <div style={{ 
                      fontSize: 12, 
                      color: "rgba(255, 255, 255, 0.6)" 
                    }}>
                      {getEndDate()}
                    </div>
                  </div>
                );
              };

              // Professional Web3 已结束活动显示组件：显示 🏆 图标 + 标题和日期（蓝色边框）
              // 完全独立于 Social Web3 的代码，不共享任何逻辑
              const ProfessionalWeb3CompletedCard = ({ activity }: { activity: ActivityMetadata }) => {
                // 根据活动类型选择 ABI
                const isNFTActivity = activity.incentiveType === IncentiveType.NFTPool;
                const activityABI = isNFTActivity ? NFT_ACTIVITY_ABI : CHALLENGE_ABI;
                
                // 从链上读取 totalRounds（活动持续天数）
                const { data: totalRounds } = useReadContract({
                  address: activity.activityContract as `0x${string}` | undefined,
                  abi: activityABI,
                  functionName: "totalRounds",
                  query: {
                    enabled: !!activity.activityContract && isConnected
                  }
                });
                
                // 格式化日期
                const formatDate = (timestamp: bigint) => {
                  const date = new Date(Number(timestamp) * 1000);
                  return date.toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  });
                };
                
                // 计算活动结束日期：活动创建日期（createdAt）+ 持续天数（totalRounds）
                // 使用活动概述中的日期（createdAt）而不是 startTime
                // totalRounds 是天数，每天 86400 秒
                const getEndDate = () => {
                  if (!totalRounds) {
                    // 如果无法读取 totalRounds，回退到显示创建日期
                    return formatDate(activity.createdAt);
                  }
                  
                  // 使用活动创建时间（createdAt）作为开始时间
                  const startTimestamp = Number(activity.createdAt);
                  
                  // 计算结束时间：创建时间 + 持续天数（每天 86400 秒）
                  const daysInSeconds = Number(totalRounds) * 86400;
                  const endTimestamp = BigInt(startTimestamp + daysInSeconds);
                  return formatDate(endTimestamp);
                };

                return (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                      padding: "20px 12px", // 减小左右边距，使边框更贴合内容
                      borderRadius: 12,
                      border: "2px solid rgba(59, 130, 246, 0.35)", // 蓝色边框 - 更淡的颜色
                      background: "rgba(59, 130, 246, 0.05)", // 淡蓝色背景
                      transition: "all 0.3s",
                      width: "fit-content", // 宽度自适应内容
                      minWidth: "auto", // 移除最小宽度限制
                    }}
                  >
                    {/* 🏆 图标 */}
                    <div style={{ fontSize: 40, filter: "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))" }}>
                      🏆
                    </div>
                    
                    {/* 活动标题 */}
                    <div style={{ 
                      fontSize: 15, 
                      fontWeight: 600, 
                      color: "#ffffff",
                      textAlign: "center",
                      wordBreak: "break-word",
                    }}>
                      {activity.title}
                    </div>
                    
                    {/* 日期 - 显示活动结束日期（开始日期 + 持续天数） */}
                    <div style={{ 
                      fontSize: 12, 
                      color: "rgba(255, 255, 255, 0.6)" 
                    }}>
                      {getEndDate()}
                    </div>
                  </div>
                );
              };

              // NFT 显示组件（移到外部，确保hooks正常工作）
              const NFTDisplayComponent = ({ activity }: { activity: ActivityMetadata }) => {
                const [nftTokens, setNftTokens] = useState<bigint[]>([]);

                // 获取用户拥有的NFT数量（仅对NFT活动）
                const { data: balance } = useReadContract({
                  address: activity.activityContract as `0x${string}` | undefined,
                  abi: [
                    {
                      type: "function",
                      name: "balanceOf",
                      inputs: [{ name: "owner", type: "address" }],
                      outputs: [{ name: "", type: "uint256" }],
                      stateMutability: "view"
                    }
                  ] as const,
                  functionName: "balanceOf",
                  args: address ? [address] : undefined,
                  query: {
                    enabled: !!activity.activityContract && !!address && isConnected && activity.incentiveType === IncentiveType.NFTPool
                  }
                });

                useEffect(() => {
                  if (balance && Number(balance) > 0) {
                    // 获取所有tokenId
                    const fetchTokens = async () => {
                      if (!publicClient || !address || !activity.activityContract) return;
                      const count = Number(balance);
                      const tokens: bigint[] = [];
                      for (let i = 0; i < count; i++) {
                        try {
                          const tokenId = await publicClient.readContract({
                            address: activity.activityContract as `0x${string}`,
                            abi: [
                              {
                                type: "function",
                                name: "tokenOfOwnerByIndex",
                                inputs: [
                                  { name: "owner", type: "address" },
                                  { name: "index", type: "uint256" }
                                ],
                                outputs: [{ name: "", type: "uint256" }],
                                stateMutability: "view"
                              }
                            ] as const,
                            functionName: "tokenOfOwnerByIndex",
                            args: [address, BigInt(i)]
                          });
                          tokens.push(tokenId as bigint);
                        } catch (e) {
                          console.error(`Failed to fetch token ${i}:`, e);
                        }
                      }
                      setNftTokens(tokens);
                    };
                    fetchTokens();
                  } else {
                    setNftTokens([]);
                  }
                }, [balance, address, activity.activityContract, publicClient]);

                // 格式化日期
                const formatDate = (timestamp: bigint) => {
                  const date = new Date(Number(timestamp) * 1000);
                  return date.toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  });
                };

                const hasNFT = balance && Number(balance) > 0 && nftTokens.length > 0;
                const isNFTActivity = activity.incentiveType === IncentiveType.NFTPool;

                return (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      padding: 20,
                      borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      background: "rgba(255, 255, 255, 0.03)",
                      transition: "all 0.3s",
                    }}
                    onClick={() => {
                      if (activity.activityId !== undefined) {
                        if (isNFTActivity) {
                          window.location.href = `/nft-activities/${activity.activityId}?from=profile`;
                        } else {
                          window.location.href = `/activities/${activity.activityId}?from=profile`;
                        }
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                      e.currentTarget.style.cursor = "pointer";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                    }}
                  >
                    {/* NFT 标识 */}
                    {hasNFT && (
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 12,
                        marginBottom: 8
                      }}>
                        <span style={{ fontSize: 32, filter: "drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))" }}>🏆</span>
                        {nftTokens.length > 0 && (
                          <div style={{ 
                            display: "flex", 
                            gap: 6, 
                            flexWrap: "wrap" 
                          }}>
                            {nftTokens.map((tokenId, idx) => (
                              <span 
                                key={idx} 
                                style={{
                                  fontSize: 12,
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  background: "rgba(139, 92, 246, 0.2)",
                                  border: "1px solid rgba(139, 92, 246, 0.3)",
                                  color: "rgba(255, 255, 255, 0.8)",
                                }}
                              >
                                #{Number(tokenId)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 活动名称 */}
                    <div style={{ 
                      fontSize: 16, 
                      fontWeight: 600, 
                      color: "#ffffff",
                      marginBottom: 4
                    }}>
                      {activity.title}
                    </div>
                    
                    {/* 日期 */}
                    <div style={{ 
                      fontSize: 12, 
                      color: "rgba(255, 255, 255, 0.5)" 
                    }}>
                      {formatDate(activity.createdAt)}
                    </div>
                  </div>
                );
              };

              // 渲染分类模块的函数
              const renderCategorySection = (
                categoryName: string,
                categoryActivities: ActivityMetadata[],
                categoryColor: string,
                isNFTDisplay: boolean = false
              ) => {
                return (
                  <div
                    key={categoryName}
                    style={{
                      marginBottom: 0,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: categoryColor,
                        marginBottom: 16,
                        paddingBottom: 12,
                        borderBottom: `2px solid ${categoryColor}40`,
                      }}
                    >
                      {categoryName}
                    </h3>
                    {categoryActivities.length === 0 ? (
                      <div
                        style={{
                          padding: "40px 20px",
                          textAlign: "center",
                          borderRadius: 12,
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          background: "rgba(255, 255, 255, 0.02)",
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: 14,
                        }}
                      >
                        暂无活动
                      </div>
                    ) : isNFTDisplay ? (
                      // NFT 横向排列显示
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        {categoryActivities.map((activity) => (
                          <NFTDisplayComponent key={activity.activityContract || activity.activityId} activity={activity} />
                        ))}
                      </div>
                    ) : (
                      // 活动卡片网格显示（Lifestyle）
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                          gap: 20,
                        }}
                      >
                        {categoryActivities.map((activity) => {
                          const contractKey = activity.activityContract?.toLowerCase() || "";
                          const status = activityStatuses[contractKey] || {
                            isCompleted: activity.isCompleted ?? false,
                            isEliminated: activity.isEliminated ?? false,
                            challengeStatus: undefined
                          };
                          return (
                            <ActivityCard
                              key={activity.activityContract || activity.activityId}
                              activity={{
                                ...activity,
                                isCompleted: status.isCompleted,
                                isEliminated: status.isEliminated,
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Lifestyle 分类 - 活动卡片显示 */}
                  <div>
                    <div
                      style={{
                        marginBottom: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 16,
                      }}
                    >
                      <h3
                        style={{
                          fontSize: 20,
                          fontWeight: 600,
                          color: "rgba(34, 197, 94, 1)",
                          margin: 0,
                        }}
                      >
                        Lifestyle
                      </h3>
                      
                      {/* 筛选按钮 - 仅应用于Lifestyle，移到标题右侧 */}
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {/* 进行中的活动按钮 */}
                      <button
                        onClick={() => {
                          setFilterSuccess(filterSuccess === "active" ? "all" : "active");
                        }}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          border: `1px solid ${filterSuccess === "active" ? "rgba(59, 130, 246, 0.5)" : "rgba(255, 255, 255, 0.2)"}`,
                          background: filterSuccess === "active" ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.05)",
                          color: "#ffffff",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 500,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (filterSuccess !== "active") {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (filterSuccess !== "active") {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                          }
                        }}
                      >
                        参与中
                      </button>
                      <button
                        onClick={() => {
                          setFilterSuccess(filterSuccess === "success" ? "all" : "success");
                        }}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          border: `1px solid ${filterSuccess === "success" ? "rgba(34, 197, 94, 0.5)" : "rgba(255, 255, 255, 0.2)"}`,
                          background: filterSuccess === "success" ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.05)",
                          color: "#ffffff",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 500,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (filterSuccess !== "success") {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (filterSuccess !== "success") {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                          }
                        }}
                      >
                        成功坚持
                      </button>
                      <button
                        onClick={() => {
                          setFilterSuccess(filterSuccess === "failed" ? "all" : "failed");
                        }}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          border: `1px solid ${filterSuccess === "failed" ? "rgba(239, 68, 68, 0.5)" : "rgba(255, 255, 255, 0.2)"}`,
                          background: filterSuccess === "failed" ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.05)",
                          color: "#ffffff",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 500,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (filterSuccess !== "failed") {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (filterSuccess !== "failed") {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                          }
                        }}
                      >
                        未成功
                      </button>
                      </div>
                    </div>
                    
                    {/* Lifestyle 活动列表 */}
                    {lifestyleActivities.length === 0 ? (
                      <div
                        style={{
                          padding: "40px 20px",
                          textAlign: "center",
                          borderRadius: 12,
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          background: "rgba(255, 255, 255, 0.02)",
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: 14,
                        }}
                      >
                        暂无活动
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                          gap: 20,
                        }}
                      >
                        {lifestyleActivities.map((activity) => {
                          const contractKey = activity.activityContract?.toLowerCase() || "";
                          const status = activityStatuses[contractKey] || {
                            isCompleted: activity.isCompleted ?? false,
                            isEliminated: activity.isEliminated ?? false,
                            challengeStatus: undefined
                          };
                          return (
                            <ActivityCard
                              key={activity.activityContract || activity.activityId}
                              activity={{
                                ...activity,
                                isCompleted: status.isCompleted,
                                isEliminated: status.isEliminated,
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Social Web3 分类 - 根据筛选按钮显示活动卡片或 🏆 卡片 */}
                  {/* 完全独立于其他类别的代码和逻辑 */}
                  <div style={{ marginTop: 40 }}>
                    <div
                      style={{
                        marginBottom: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 16,
                          marginBottom: 16,
                          paddingBottom: 12,
                          borderBottom: "2px solid rgba(236, 72, 153, 1)40",
                        }}
                      >
                        <h3
                          style={{
                            fontSize: 20,
                            fontWeight: 600,
                            color: "rgba(236, 72, 153, 1)",
                            margin: 0,
                          }}
                        >
                          Social Web3
                        </h3>
                        
                        {/* Social Web3 筛选按钮 - 独立的状态和逻辑，移到标题右侧 */}
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {/* 参与中按钮 */}
                        <button
                          onClick={() => {
                            setSocialFilter(socialFilter === "active" ? null : "active");
                          }}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: `1px solid ${socialFilter === "active" ? "rgba(59, 130, 246, 0.5)" : "rgba(255, 255, 255, 0.2)"}`,
                            background: socialFilter === "active" ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.05)",
                            color: "#ffffff",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 500,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (socialFilter !== "active") {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (socialFilter !== "active") {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                            }
                          }}
                        >
                          参与中
                        </button>
                        
                        {/* 已结束按钮 */}
                        <button
                          onClick={() => {
                            setSocialFilter(socialFilter === "settled" ? null : "settled");
                          }}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: `1px solid ${socialFilter === "settled" ? "rgba(239, 68, 68, 0.5)" : "rgba(255, 255, 255, 0.2)"}`,
                            background: socialFilter === "settled" ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.05)",
                            color: "#ffffff",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 500,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (socialFilter !== "settled") {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (socialFilter !== "settled") {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                            }
                          }}
                        >
                          已结束
                        </button>
                        </div>
                      </div>
                      
                      {/* 检查筛选后的活动数量 */}
                      {(() => {
                        // 计算筛选后应该显示的活动数量
                        const filteredActiveCount = socialActivities.filter(a => {
                          const contractKey = a.activityContract?.toLowerCase() || "";
                          const status = activityStatuses[contractKey] || {
                            isCompleted: a.isCompleted ?? false,
                            isEliminated: a.isEliminated ?? false,
                            challengeStatus: undefined
                          };
                          const challengeStatus = status.challengeStatus;
                          const isSettled = challengeStatus === 2;
                          const isInProgress = challengeStatus === 0 || challengeStatus === 1;
                          return !isSettled && (isInProgress || challengeStatus === undefined);
                        }).length;
                        
                        const filteredSettledCount = socialActivities.filter(a => {
                          const contractKey = a.activityContract?.toLowerCase() || "";
                          const status = activityStatuses[contractKey] || {
                            isCompleted: a.isCompleted ?? false,
                            isEliminated: a.isEliminated ?? false,
                            challengeStatus: undefined
                          };
                          return status.challengeStatus === 2;
                        }).length;
                        
                        // 根据筛选状态计算应该显示的活动数量
                        let shouldShowCount = 0;
                        if (socialFilter === null) {
                          shouldShowCount = filteredActiveCount + filteredSettledCount;
                        } else if (socialFilter === "active") {
                          shouldShowCount = filteredActiveCount;
                        } else if (socialFilter === "settled") {
                          shouldShowCount = filteredSettledCount;
                        }
                        
                        return shouldShowCount === 0 ? (
                          <div
                            style={{
                              padding: "40px 20px",
                              textAlign: "center",
                              borderRadius: 12,
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(255, 255, 255, 0.02)",
                              color: "rgba(255, 255, 255, 0.5)",
                              fontSize: 14,
                            }}
                          >
                            暂无活动
                          </div>
                        ) : null;
                      })()}
                      
                      {/* 根据筛选状态显示活动 */}
                      {(() => {
                        // 计算筛选后应该显示的活动数量
                        const filteredActiveCount = socialActivities.filter(a => {
                          const contractKey = a.activityContract?.toLowerCase() || "";
                          const status = activityStatuses[contractKey] || {
                            isCompleted: a.isCompleted ?? false,
                            isEliminated: a.isEliminated ?? false,
                            challengeStatus: undefined
                          };
                          const challengeStatus = status.challengeStatus;
                          const isSettled = challengeStatus === 2;
                          const isInProgress = challengeStatus === 0 || challengeStatus === 1;
                          return !isSettled && (isInProgress || challengeStatus === undefined);
                        }).length;
                        
                        const filteredSettledCount = socialActivities.filter(a => {
                          const contractKey = a.activityContract?.toLowerCase() || "";
                          const status = activityStatuses[contractKey] || {
                            isCompleted: a.isCompleted ?? false,
                            isEliminated: a.isEliminated ?? false,
                            challengeStatus: undefined
                          };
                          return status.challengeStatus === 2;
                        }).length;
                        
                        // 根据筛选状态计算应该显示的活动数量
                        let shouldShowCount = 0;
                        if (socialFilter === null) {
                          shouldShowCount = filteredActiveCount + filteredSettledCount;
                        } else if (socialFilter === "active") {
                          shouldShowCount = filteredActiveCount;
                        } else if (socialFilter === "settled") {
                          shouldShowCount = filteredSettledCount;
                        }
                        
                        return shouldShowCount > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 16, // 统一的间距，无论是进行中的活动卡片还是NFT标识框
                              alignItems: "flex-start",
                            }}
                          >
                            {/* 参与中：显示进行中和未结束的活动 */}
                            {(socialFilter === null || socialFilter === "active") && (
                              <>
                                {socialActivities.map((activity) => {
                                  const contractKey = activity.activityContract?.toLowerCase() || "";
                                  const status = activityStatuses[contractKey] || {
                                    isCompleted: activity.isCompleted ?? false,
                                    isEliminated: activity.isEliminated ?? false,
                                    challengeStatus: undefined
                                  };
                                  const challengeStatus = status.challengeStatus;
                                  const isSettled = challengeStatus === 2;
                                  const isInProgress = challengeStatus === 0 || challengeStatus === 1;
                                  
                                  // 只显示进行中和未结束的活动
                                  if (!isSettled && (isInProgress || challengeStatus === undefined)) {
                                    if (activity.incentiveType === IncentiveType.NFTPool) {
                                      return (
                                        <div key={activity.activityContract || activity.activityId} style={{ width: "320px", flexShrink: 0 }}>
                                          <NFTActivityCard
                                            activity={activity}
                                            hideIfSettled={false}
                                          />
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div key={activity.activityContract || activity.activityId} style={{ width: "320px", flexShrink: 0 }}>
                                          <ActivityCard
                                            activity={{
                                              ...activity,
                                              isCompleted: status.isCompleted,
                                              isEliminated: status.isEliminated,
                                            }}
                                          />
                                        </div>
                                      );
                                    }
                                  }
                                  return null;
                                })}
                              </>
                            )}
                            
                            {/* 已结束：显示 🏆 NFT 标识 */}
                            {(socialFilter === null || socialFilter === "settled") && (
                              <>
                                {socialActivities.map((activity) => {
                                  const contractKey = activity.activityContract?.toLowerCase() || "";
                                  const status = activityStatuses[contractKey] || {
                                    isCompleted: activity.isCompleted ?? false,
                                    isEliminated: activity.isEliminated ?? false,
                                    challengeStatus: undefined
                                  };
                                  const challengeStatus = status.challengeStatus;
                                  
                                  // 只显示已结束的活动（显示 🏆 NFT 标识）
                                  if (challengeStatus === 2) {
                                    return (
                                      <SocialWeb3CompletedCard 
                                        key={activity.activityContract || activity.activityId} 
                                        activity={activity} 
                                      />
                                    );
                                  }
                                  return null;
                                })}
                              </>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {/* Professional Web3 分类 - 根据筛选按钮显示活动卡片或 🏆 卡片 */}
                  {/* 完全独立于其他类别的代码和逻辑 */}
                  <div style={{ marginTop: 40 }}>
                    <div
                      style={{
                        marginBottom: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 16,
                          marginBottom: 16,
                          paddingBottom: 12,
                          borderBottom: "2px solid rgba(59, 130, 246, 1)40",
                        }}
                      >
                        <h3
                          style={{
                            fontSize: 20,
                            fontWeight: 600,
                            color: "rgba(59, 130, 246, 1)",
                            margin: 0,
                          }}
                        >
                          Professional Web3
                        </h3>
                        
                        {/* Professional Web3 筛选按钮 - 独立的状态和逻辑，移到标题右侧 */}
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {/* 参与中按钮 */}
                        <button
                          onClick={() => {
                            setProfessionalFilter(professionalFilter === "active" ? null : "active");
                          }}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: `1px solid ${professionalFilter === "active" ? "rgba(59, 130, 246, 0.5)" : "rgba(255, 255, 255, 0.2)"}`,
                            background: professionalFilter === "active" ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.05)",
                            color: "#ffffff",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 500,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (professionalFilter !== "active") {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (professionalFilter !== "active") {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                            }
                          }}
                        >
                          参与中
                        </button>
                        
                        {/* 已结束按钮 */}
                        <button
                          onClick={() => {
                            setProfessionalFilter(professionalFilter === "settled" ? null : "settled");
                          }}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: `1px solid ${professionalFilter === "settled" ? "rgba(239, 68, 68, 0.5)" : "rgba(255, 255, 255, 0.2)"}`,
                            background: professionalFilter === "settled" ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.05)",
                            color: "#ffffff",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 500,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (professionalFilter !== "settled") {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (professionalFilter !== "settled") {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                            }
                          }}
                        >
                          已结束
                        </button>
                        </div>
                      </div>
                      
                      {/* 检查筛选后的活动数量 */}
                      {(() => {
                        // 计算筛选后应该显示的活动数量
                        const filteredActiveCount = professionalActivities.filter(a => {
                          const contractKey = a.activityContract?.toLowerCase() || "";
                          const status = activityStatuses[contractKey] || {
                            isCompleted: a.isCompleted ?? false,
                            isEliminated: a.isEliminated ?? false,
                            challengeStatus: undefined
                          };
                          const challengeStatus = status.challengeStatus;
                          const isSettled = challengeStatus === 2;
                          const isInProgress = challengeStatus === 0 || challengeStatus === 1;
                          return !isSettled && (isInProgress || challengeStatus === undefined);
                        }).length;
                        
                        const filteredSettledCount = professionalActivities.filter(a => {
                          const contractKey = a.activityContract?.toLowerCase() || "";
                          const status = activityStatuses[contractKey] || {
                            isCompleted: a.isCompleted ?? false,
                            isEliminated: a.isEliminated ?? false,
                            challengeStatus: undefined
                          };
                          return status.challengeStatus === 2;
                        }).length;
                        
                        // 根据筛选状态计算应该显示的活动数量
                        let shouldShowCount = 0;
                        if (professionalFilter === null) {
                          shouldShowCount = filteredActiveCount + filteredSettledCount;
                        } else if (professionalFilter === "active") {
                          shouldShowCount = filteredActiveCount;
                        } else if (professionalFilter === "settled") {
                          shouldShowCount = filteredSettledCount;
                        }
                        
                        return shouldShowCount === 0 ? (
                          <div
                            style={{
                              padding: "40px 20px",
                              textAlign: "center",
                              borderRadius: 12,
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              background: "rgba(255, 255, 255, 0.02)",
                              color: "rgba(255, 255, 255, 0.5)",
                              fontSize: 14,
                            }}
                          >
                            暂无活动
                          </div>
                        ) : null;
                      })()}
                      
                      {/* 根据筛选状态显示活动 */}
                      {(() => {
                        // 计算筛选后应该显示的活动数量
                        const filteredActiveCount = professionalActivities.filter(a => {
                          const contractKey = a.activityContract?.toLowerCase() || "";
                          const status = activityStatuses[contractKey] || {
                            isCompleted: a.isCompleted ?? false,
                            isEliminated: a.isEliminated ?? false,
                            challengeStatus: undefined
                          };
                          const challengeStatus = status.challengeStatus;
                          const isSettled = challengeStatus === 2;
                          const isInProgress = challengeStatus === 0 || challengeStatus === 1;
                          return !isSettled && (isInProgress || challengeStatus === undefined);
                        }).length;
                        
                        const filteredSettledCount = professionalActivities.filter(a => {
                          const contractKey = a.activityContract?.toLowerCase() || "";
                          const status = activityStatuses[contractKey] || {
                            isCompleted: a.isCompleted ?? false,
                            isEliminated: a.isEliminated ?? false,
                            challengeStatus: undefined
                          };
                          return status.challengeStatus === 2;
                        }).length;
                        
                        // 根据筛选状态计算应该显示的活动数量
                        let shouldShowCount = 0;
                        if (professionalFilter === null) {
                          shouldShowCount = filteredActiveCount + filteredSettledCount;
                        } else if (professionalFilter === "active") {
                          shouldShowCount = filteredActiveCount;
                        } else if (professionalFilter === "settled") {
                          shouldShowCount = filteredSettledCount;
                        }
                        
                        return shouldShowCount > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 16, // 统一的间距，无论是进行中的活动卡片还是NFT标识框
                              alignItems: "flex-start",
                            }}
                          >
                            {/* 参与中：显示进行中和未结束的活动 */}
                            {(professionalFilter === null || professionalFilter === "active") && (
                              <>
                                {professionalActivities.map((activity) => {
                                  const contractKey = activity.activityContract?.toLowerCase() || "";
                                  const status = activityStatuses[contractKey] || {
                                    isCompleted: activity.isCompleted ?? false,
                                    isEliminated: activity.isEliminated ?? false,
                                    challengeStatus: undefined
                                  };
                                  const challengeStatus = status.challengeStatus;
                                  const isSettled = challengeStatus === 2;
                                  const isInProgress = challengeStatus === 0 || challengeStatus === 1;
                                  
                                  // 只显示进行中和未结束的活动
                                  if (!isSettled && (isInProgress || challengeStatus === undefined)) {
                                    if (activity.incentiveType === IncentiveType.NFTPool) {
                                      return (
                                        <div key={activity.activityContract || activity.activityId} style={{ width: "320px", flexShrink: 0 }}>
                                          <NFTActivityCard
                                            activity={activity}
                                            hideIfSettled={false}
                                          />
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div key={activity.activityContract || activity.activityId} style={{ width: "320px", flexShrink: 0 }}>
                                          <ActivityCard
                                            activity={{
                                              ...activity,
                                              isCompleted: status.isCompleted,
                                              isEliminated: status.isEliminated,
                                            }}
                                          />
                                        </div>
                                      );
                                    }
                                  }
                                  return null;
                                })}
                              </>
                            )}
                            
                            {/* 已结束：显示 🏆 NFT 标识 */}
                            {(professionalFilter === null || professionalFilter === "settled") && (
                              <>
                                {professionalActivities.map((activity) => {
                                  const contractKey = activity.activityContract?.toLowerCase() || "";
                                  const status = activityStatuses[contractKey] || {
                                    isCompleted: activity.isCompleted ?? false,
                                    isEliminated: activity.isEliminated ?? false,
                                    challengeStatus: undefined
                                  };
                                  const challengeStatus = status.challengeStatus;
                                  
                                  // 只显示已结束的活动（显示 🏆 NFT 标识）
                                  if (challengeStatus === 2) {
                                    return (
                                      <ProfessionalWeb3CompletedCard 
                                        key={activity.activityContract || activity.activityId} 
                                        activity={activity} 
                                      />
                                    );
                                  }
                                  return null;
                                })}
                              </>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )
        }
      </div>
    </div>
  );
}

