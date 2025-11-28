"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ActivityDashboard } from "../../components/activities/ActivityDashboard";
import { ParticleField } from "../../components/animations/ParticleField";
import { ActivityMetadata } from "../../lib/types";
import { ACTIVITY_REGISTRY_ABI, ACTIVITY_FACTORY_ABI } from "../../lib/activityRegistry";

const ACTIVITY_FACTORY_ADDRESS = "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650"; // ActivityFactory 合约地址（最新部署）

export default function DashboardPage() {
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

  if (!isConnected) {
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
        <p style={{ fontSize: 20, color: "#ffffff", margin: 0 }}>请先连接钱包</p>
      </div>
    );
  }

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

      <div style={{
        position: "relative",
        zIndex: 1,
        maxWidth: 1200,
        margin: "0 auto",
        padding: "120px 24px 80px",
      }}>
        <h1 style={{
          fontSize: "clamp(36px, 5vw, 48px)",
          fontWeight: 700,
          marginBottom: 48,
          background: "linear-gradient(135deg, #ffffff, #a78bfa, #ec4899)",
          WebkitBackgroundClip: "text",
          color: "transparent",
          textAlign: "center",
        }}>
          我的活动档案
        </h1>

      {loading ? (
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

