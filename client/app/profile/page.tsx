"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAccount, useReadContract, useConnect, useDisconnect, usePublicClient } from "wagmi";
import { injected } from "wagmi/connectors";
import { ActivityMetadata } from "../../lib/types";
import { getUserCompletedActivities, saveUserCompletedActivity } from "../../lib/activityStorage";
import { ActivityCard } from "../../components/activities/ActivityCard";
import { ParticleField } from "../../components/animations/ParticleField";
import { CHALLENGE_ABI, ACTIVITY_REGISTRY_ABI } from "../../lib/activityRegistry";
import Link from "next/link";

const ACTIVITY_REGISTRY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // fix: 用于验证活动是否在链上存在

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
  const [filterSuccess, setFilterSuccess] = useState<"all" | "active" | "success" | "failed">("all"); // all=全部，active=参与中，success=成功坚持，failed=未成功
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
          const statusMap: Record<string, { isCompleted: boolean; isEliminated: boolean }> = {};
          
          // 先使用 localStorage 中的状态作为默认值
          activitiesToSync.forEach(activity => {
            if (activity.activityContract) {
              statusMap[activity.activityContract.toLowerCase()] = {
                isCompleted: activity.isCompleted ?? false,
                isEliminated: activity.isEliminated ?? false
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
              
              const [participantResult, challengeStatusResult] = await Promise.all([
                Promise.race([
                  publicClient.readContract({
                    address: contractAddress,
                    abi: CHALLENGE_ABI,
                    functionName: "getParticipantInfo",
                    args: [address as `0x${string}`]
                  }),
                  timeoutPromise
                ]) as Promise<any>,
                Promise.race([
                  publicClient.readContract({
                    address: contractAddress,
                    abi: CHALLENGE_ABI,
                    functionName: "viewStatus"
                  }),
                  timeoutPromise
                ]) as Promise<any>
              ]);
              
              if (participantResult && Array.isArray(participantResult) && participantResult.length >= 7) {
                const isEliminated = participantResult[1] || false;
                const isCompleted = participantResult[6] || false;
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
          const statusMap: Record<string, { isCompleted: boolean; isEliminated: boolean }> = {};
          participatedActivities.forEach(activity => {
            if (activity.activityContract) {
              statusMap[activity.activityContract.toLowerCase()] = {
                isCompleted: activity.isCompleted ?? false,
                isEliminated: activity.isEliminated ?? false
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
            {/* 用户信息头部区域 - Galxe 风格 */}
            <div
              style={{
                padding: "32px 40px",
                borderRadius: 16,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 32, flexWrap: "wrap" }}>
                {/* 左侧：用户信息 */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flex: 1, minWidth: 300 }}>
                  {/* 头像 */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <img
                      src={address ? `https://effigy.im/a/${address}.svg` : ""}
                      alt="wallet avatar"
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        border: "2px solid rgba(255, 255, 255, 0.2)",
                        background: "rgba(255, 255, 255, 0.05)",
                      }}
                      onError={(e) => {
                        if (address) {
                          (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23${address.slice(2, 8)}"/></svg>`;
                        }
                      }}
                    />
                    {/* 在线状态 */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "#22c55e",
                        border: "3px solid rgba(10, 10, 15, 0.95)",
                      }}
                    />
                  </div>
                  
                  {/* 用户信息 */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                      {mounted ? (
                        <h2
                          onClick={() => {
                            if (address) {
                              setShowFullAddress(!showFullAddress);
                            }
                          }}
                          style={{
                            fontSize: 24, // fix: 调整字号使其更协调
                            fontWeight: 700,
                            margin: 0,
                            color: "#ffffff",
                            cursor: address ? "pointer" : "default",
                            fontFamily: "monospace",
                            transition: "opacity 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (address) {
                              e.currentTarget.style.opacity = "0.8";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (address) {
                              e.currentTarget.style.opacity = "1";
                            }
                          }}
                        >
                          {address 
                            ? (showFullAddress 
                                ? address 
                                : `${address.slice(0, 6)}...${address.slice(-4)}`)
                            : "未连接"}
                        </h2>
                      ) : (
                        <h2
                          style={{
                            fontSize: 24,
                            fontWeight: 700,
                            margin: 0,
                            color: "#ffffff",
                            fontFamily: "monospace",
                          }}
                        >
                          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "未连接"}
                        </h2>
                      )}
                      {/* Web3 徽章 */}
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: "rgba(167, 139, 250, 0.15)",
                          border: "1px solid rgba(167, 139, 250, 0.3)",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#a78bfa",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Web3
                      </div>
                      {address && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // 阻止事件冒泡到 h2
                            // fix: 检查 navigator.clipboard 是否可用（仅在客户端环境）
                            if (typeof window !== "undefined" && navigator.clipboard) {
                              navigator.clipboard.writeText(address).catch((err) => {
                                console.error("复制失败:", err);
                                // 降级方案：使用传统方法
                                const textArea = document.createElement("textarea");
                                textArea.value = address;
                                textArea.style.position = "fixed";
                                textArea.style.opacity = "0";
                                document.body.appendChild(textArea);
                                textArea.select();
                                try {
                                  document.execCommand("copy");
                                } catch (fallbackErr) {
                                  console.error("降级复制方法也失败:", fallbackErr);
                                }
                                document.body.removeChild(textArea);
                              });
                            }
                          }}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            border: "none",
                            background: "rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                            cursor: "pointer",
                            fontSize: 12,
                            opacity: 0.7,
                            transition: "opacity 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "0.7";
                          }}
                        >
                          📋
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 右侧：统计数据 - 已删除完成活动框 */}
              </div>
            </div>

            {/* 指标卡片区域 - Galxe 风格 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              {/* 作为活动创建者 - 移到最前面 */}
              <div
                style={{
                  padding: "20px 24px",
                  borderRadius: 16,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.03)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 12, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  作为活动创建者
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
                  {activities.filter(a => a.creator.toLowerCase() === address?.toLowerCase()).length}
                </div>
                <div style={{ fontSize: 11, opacity: 0.5, color: "#ffffff" }}>
                  Created
                </div>
              </div>
              <div
                style={{
                  padding: "20px 24px",
                  borderRadius: 16,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.03)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 12, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  参与活动数
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
                  {activities.length}
                </div>
                <div style={{ fontSize: 11, opacity: 0.5, color: "#ffffff" }}>
                  -- +0 (7D)
                </div>
              </div>
              <div
                style={{
                  padding: "20px 24px",
                  borderRadius: 16,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.03)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 12, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  押金池活动
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
                  {activities.filter(a => a.incentiveType === 0).length}
                </div>
                <div style={{ fontSize: 11, opacity: 0.5, color: "#ffffff" }}>
                  -- +0 (7D)
                </div>
              </div>
            </div>

            {/* 活动列表标题和筛选 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    margin: 0,
                    color: "#ffffff",
                  }}
                >
                  参与的活动
                </h2>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#ffffff",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: 13,
                    fontWeight: 500,
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
                  {loading ? "刷新中..." : "🔄 刷新"}
                </button>
              </div>
              
              {/* 筛选按钮 */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {/* fix: 参与中的活动按钮 - 在成功坚持左侧 */}
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
                  // fix: 参与中的活动：已报名 && (未开始 || 进行中) && 未被淘汰
                  // 注意：这里假设用户已报名（因为活动在 localStorage 中）
                  const isScheduled = challengeStatus === 0;
                  const isActive = challengeStatus === 1;
                  return (isScheduled || isActive) && !isEliminated;
                } else if (filterSuccess === "success") {
                  // 成功坚持：分得了奖金的活动（已完成且未被淘汰）
                  return isCompleted && !isEliminated;
                } else if (filterSuccess === "failed") {
                  // 未成功：未分得奖金的活动（被淘汰）
                  return isEliminated;
                }
                return true;
              });
              
              // 调试信息
              console.log("🔍 筛选结果:", {
                filterSuccess,
                totalActivities: activities.length,
                filteredCount: filteredActivities.length,
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
                    localStorage: { isCompleted: a.isCompleted, isEliminated: a.isEliminated },
                    chainStatus: status
                  };
                }),
                filtered: filteredActivities.map(a => a.title)
              });

              if (filteredActivities.length === 0) {
                return (
                  <div
                    style={{
                      padding: "60px 40px",
                      textAlign: "center",
                      borderRadius: 16,
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      background: "rgba(255, 255, 255, 0.03)",
                      backdropFilter: "blur(20px)",
                    }}
                  >
                    <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>📚</div>
                    <p style={{ fontSize: 16, opacity: 0.8, margin: "0 0 8px 0", color: "#ffffff", fontWeight: 500 }}>
                      {filterSuccess === "all"
                        ? "还没有参与的活动"
                        : filterSuccess === "active"
                        ? "还没有参与中的活动"
                        : filterSuccess === "success"
                        ? "还没有成功坚持的活动"
                        : "还没有未成功的活动"}
                    </p>
                    <p style={{ fontSize: 13, opacity: 0.6, margin: "0 0 24px 0", color: "#ffffff" }}>
                      {filterSuccess === "all"
                        ? "参与活动后，活动将自动记录在这里"
                        : filterSuccess === "active"
                        ? "正在进行的活动将显示在这里"
                        : filterSuccess === "success"
                        ? "参与活动并坚持到最后，成功完成的活动将显示在这里"
                        : "被淘汰的活动将显示在这里"}
                    </p>
                    {filterSuccess === "all" && (
                      <Link
                        href="/activities"
                        style={{
                          display: "inline-block",
                          padding: "10px 20px",
                          borderRadius: 8,
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "#ffffff",
                          textDecoration: "none",
                          fontSize: 13,
                          fontWeight: 500,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                        }}
                      >
                        去 Activity Hub 看看 →
                      </Link>
                    )}
                  </div>
                );
              }

              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 24,
                  }}
                >
                  {filteredActivities.map((activity, index) => (
                    <ActivityCard key={`${activity.activityContract}-${activity.activityId ?? index}`} activity={activity} />
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

