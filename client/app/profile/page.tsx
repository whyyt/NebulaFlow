"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAccount, useReadContract, useConnect, useDisconnect, usePublicClient } from "wagmi";
import { injected } from "wagmi/connectors";
import { ActivityMetadata } from "../../lib/types";
import { getUserCompletedActivities, saveUserCompletedActivity } from "../../lib/activityStorage";
import { ActivityCard } from "../../components/activities/ActivityCard";
import { ParticleField } from "../../components/animations/ParticleField";
import { CHALLENGE_ABI } from "../../lib/activityRegistry";
import Link from "next/link";

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
  const [filterSuccess, setFilterSuccess] = useState<boolean | null>(null); // null=全部，true=成功坚持，false=未成功
  const publicClient = usePublicClient();
  const [activityStatuses, setActivityStatuses] = useState<Record<string, { isCompleted: boolean; isEliminated: boolean }>>({});

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
        setActivities(participatedActivities);
        
        // fix: 从链上同步每个活动的状态
        if (publicClient && address && isConnected && participatedActivities.length > 0) {
          const statusMap: Record<string, { isCompleted: boolean; isEliminated: boolean }> = {};
          const updatePromises = participatedActivities.map(async (activity) => {
            if (!activity.activityContract) return;
            
            try {
              const result = await publicClient.readContract({
                address: activity.activityContract as `0x${string}`,
                abi: CHALLENGE_ABI,
                functionName: "getParticipantInfo",
                args: [address as `0x${string}`]
              });
              
              if (result && Array.isArray(result) && result.length >= 7) {
                const isEliminated = result[1] || false;
                const isCompleted = result[6] || false;
                
                statusMap[activity.activityContract.toLowerCase()] = {
                  isCompleted: Boolean(isCompleted),
                  isEliminated: Boolean(isEliminated)
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
              }
            } catch (err) {
              console.error(`读取活动 ${activity.title} 的状态失败:`, err);
              // 如果链上读取失败，使用 localStorage 中的状态
              statusMap[activity.activityContract.toLowerCase()] = {
                isCompleted: activity.isCompleted ?? false,
                isEliminated: activity.isEliminated ?? false
              };
            }
          });
          
          await Promise.all(updatePromises);
          setActivityStatuses(statusMap);
          console.log("✅ 链上状态同步完成:", statusMap);
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
                
                {/* 右侧：统计数据 */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div
                    style={{
                      padding: "16px 20px",
                      borderRadius: 12,
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      minWidth: 140,
                    }}
                  >
                    <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      完成活动
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#ffffff" }}>
                      {activities.length}+
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.5, color: "#ffffff", marginTop: 4 }}>
                      Activities
                    </div>
                  </div>
                </div>
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
                <button
                  onClick={() => {
                    // 如果当前已选中，则取消选择（显示全部）
                    setFilterSuccess(filterSuccess === true ? null : true);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: `1px solid ${filterSuccess === true ? "rgba(34, 197, 94, 0.5)" : "rgba(255, 255, 255, 0.2)"}`,
                    background: filterSuccess === true ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (filterSuccess !== true) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (filterSuccess !== true) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    }
                  }}
                >
                  成功坚持
                </button>
                <button
                  onClick={() => {
                    // 如果当前已选中，则取消选择（显示全部）
                    setFilterSuccess(filterSuccess === false ? null : false);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: `1px solid ${filterSuccess === false ? "rgba(239, 68, 68, 0.5)" : "rgba(255, 255, 255, 0.2)"}`,
                    background: filterSuccess === false ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (filterSuccess !== false) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (filterSuccess !== false) {
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
                  isEliminated: activity.isEliminated ?? false
                };
                
                const isCompleted = status.isCompleted === true;
                const isEliminated = status.isEliminated === true;
                
                if (filterSuccess === null) {
                  // 全部显示
                  return true;
                } else if (filterSuccess === true) {
                  // 成功坚持：分得了奖金的活动（已完成且未被淘汰）
                  return isCompleted && !isEliminated;
                } else {
                  // 未成功：未分得奖金的活动（被淘汰）
                  return isEliminated;
                }
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
                      {filterSuccess === null 
                        ? "还没有参与的活动"
                        : filterSuccess === true
                        ? "还没有成功坚持的活动"
                        : "还没有未成功的活动"}
                    </p>
                    <p style={{ fontSize: 13, opacity: 0.6, margin: "0 0 24px 0", color: "#ffffff" }}>
                      {filterSuccess === null
                        ? "参与活动后，活动将自动记录在这里"
                        : filterSuccess === true
                        ? "参与活动并坚持到最后，成功完成的活动将显示在这里"
                        : "被淘汰的活动将显示在这里"}
                    </p>
                    {filterSuccess === null && (
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

