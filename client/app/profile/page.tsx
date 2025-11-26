"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ActivityDashboard } from "../../components/activities/ActivityDashboard";
import { ActivityMetadata } from "../../lib/types";
import { ACTIVITY_REGISTRY_ABI, ACTIVITY_FACTORY_ABI } from "../../lib/activityRegistry";
import Link from "next/link";

const ACTIVITY_FACTORY_ADDRESS = "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [activities, setActivities] = useState<ActivityMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [registryAddress, setRegistryAddress] = useState<`0x${string}` | null>(null);

  // 从 ActivityFactory 获取 ActivityRegistry 地址
  const { data: activityRegistryAddress } = useReadContract({
    address: ACTIVITY_FACTORY_ADDRESS as `0x${string}`,
    abi: ACTIVITY_FACTORY_ABI,
    functionName: "activityRegistry",
    query: {
      enabled: !!ACTIVITY_FACTORY_ADDRESS
    }
  });

  // 当获取到 ActivityRegistry 地址后，更新状态
  useEffect(() => {
    if (activityRegistryAddress) {
      setRegistryAddress(activityRegistryAddress as `0x${string}`);
    }
  }, [activityRegistryAddress]);

  // 获取用户的活动ID列表
  const { data: activityIds, refetch } = useReadContract({
    address: registryAddress || undefined,
    abi: ACTIVITY_REGISTRY_ABI,
    functionName: "getUserActivities",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && !!registryAddress
    }
  });

  useEffect(() => {
    if (!address || !isConnected || !activityIds) {
      setLoading(false);
      return;
    }

    // 获取所有活动的元数据
    const fetchActivities = async () => {
      setLoading(true);
      try {
        // 这里应该批量查询所有活动的元数据
        // 实际实现需要调用ActivityRegistry的getActivityMetadata
        const activitiesData: ActivityMetadata[] = [];
        
        // 模拟数据，实际应该从合约获取
        setActivities(activitiesData);
      } catch (err) {
        console.error("获取活动列表失败:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [address, isConnected, activityIds]);

  const handleRefresh = async () => {
    await refetch();
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
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.2), transparent), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(236, 72, 153, 0.15), transparent)",
          zIndex: 0,
        }}
      />

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
            功能特性
          </Link>
          <Link
            href="/activities"
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
            活动库
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
            我的档案
          </Link>
        </div>
        
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        </div>
      </nav>

      {/* 返回主界面按钮 */}
      <div
        style={{
          position: "fixed",
          top: 100,
          left: 48,
          zIndex: 999,
        }}
      >
        <Link
          href="/"
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
            transition: "all 0.3s",
            backdropFilter: "blur(10px)",
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
          <span>返回主界面</span>
        </Link>
      </div>

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
        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 48px)",
            fontWeight: 700,
            marginBottom: 48,
            background: "linear-gradient(135deg, #ffffff, #a78bfa, #ec4899)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            textAlign: "center",
          }}
        >
          我的活动档案
        </h1>

        {!isConnected ? (
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
          <ActivityDashboard activities={activities} onRefresh={handleRefresh} />
        )}
      </div>
    </div>
  );
}

