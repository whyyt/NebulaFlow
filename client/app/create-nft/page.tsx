"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, usePublicClient, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useRouter } from "next/navigation";
import { CreateNFTActivityForm } from "../../components/activities/CreateNFTActivityForm";
import { ActivityMetadata, IncentiveType } from "../../lib/types";
import { NFT_ACTIVITY_FACTORY_ABI } from "../../lib/nftActivityRegistry";
import { ACTIVITY_REGISTRY_ABI } from "../../lib/activityRegistry";
import { saveActivity } from "../../lib/activityStorage";
import { decodeEventLog } from "viem";
import { ParticleField } from "../../components/animations/ParticleField";

// NFT 活动工厂合约地址（最新部署）
const NFT_ACTIVITY_FACTORY_ADDRESS = "0xc351628EB244ec633d5f21fBD6621e1a683B1181";
const ACTIVITY_REGISTRY_ADDRESS = "0x7969c5eD335650692Bc04293B07F5BF2e7A673C0";

interface NFTActivityFormData {
  title: string;
  description: string;
  maxParticipants: number;
}

export default function CreateNFTActivityPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateNFTActivity = async (data: NFTActivityFormData) => {
    console.log("=== 开始创建 NFT 活动 ===");
    
    if (!isConnected || !address) {
      setError("请先连接钱包");
      return;
    }

    if (!publicClient) {
      setError("无法连接到区块链，请检查网络连接。");
      return;
    }

    try {
      const creatorName = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
      if (!creatorName) {
        setError("请先连接钱包");
        return;
      }
      
      const title = String(data.title || "").trim();
      const description = String(data.description || "").trim();
      if (!title) {
        setError("活动标题不能为空");
        return;
      }
      if (!description) {
        setError("活动描述不能为空");
        return;
      }

      const maxParticipants = Number(data.maxParticipants || 0);
      if (maxParticipants <= 0) {
        setError("最大参与人数必须大于 0");
        return;
      }

      // NFT 活动固定为 7 天
      const totalRounds = 7;

      console.log("创建 NFT 活动参数:");
      console.log("  - creatorName:", creatorName);
      console.log("  - title:", title);
      console.log("  - description:", description);
      console.log("  - totalRounds:", totalRounds);
      console.log("  - maxParticipants:", maxParticipants);

      setError(null);
      setSuccess(null);

      const hash = await writeContractAsync({
        address: NFT_ACTIVITY_FACTORY_ADDRESS as `0x${string}`,
        abi: NFT_ACTIVITY_FACTORY_ABI,
        functionName: "createNFTActivity",
        args: [
          title,
          description,
          BigInt(totalRounds),
          BigInt(maxParticipants),
          true, // isPublic
          creatorName
        ]
      });

      console.log("✅ 交易已提交，哈希:", hash);

      // 等待交易确认
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ 交易已确认:", receipt);

      // 解析事件
      let activityId: number | null = null;
      let activityContract: string | null = null;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: NFT_ACTIVITY_FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === "NFTActivityCreated") {
            activityContract = (decoded.args as any).activityAddress;
            activityId = Number((decoded.args as any).activityId);
            console.log("✅ 解析到 NFTActivityCreated 事件:");
            console.log("   - activityContract:", activityContract);
            console.log("   - activityId:", activityId);
            break;
          }
        } catch (err) {
          // 忽略无法解析的日志
        }
      }

      // 如果事件解析失败，尝试从 ActivityRegistry 获取最新活动
      if (!activityId || !activityContract) {
        console.warn("⚠️ 无法从事件中解析活动信息，尝试从 ActivityRegistry 获取");
        try {
          const count = await publicClient.readContract({
            address: ACTIVITY_REGISTRY_ADDRESS as `0x${string}`,
            abi: ACTIVITY_REGISTRY_ABI,
            functionName: "activityCount"
          }) as bigint;
          activityId = Number(count);
          const metadata = await publicClient.readContract({
            address: ACTIVITY_REGISTRY_ADDRESS as `0x${string}`,
            abi: ACTIVITY_REGISTRY_ABI,
            functionName: "getActivityMetadataTuple",
            args: [count]
          }) as any;
          activityContract = metadata[0];
        } catch (err) {
          console.error("从 ActivityRegistry 获取活动信息失败:", err);
        }
      }

      if (activityId && activityContract) {
        const newActivity: ActivityMetadata = {
          activityContract: activityContract,
          creator: address,
          creatorName: creatorName,
          title: title,
          description: description,
          createdAt: BigInt(Math.floor(Date.now() / 1000)),
          isPublic: true,
          incentiveType: 1 as IncentiveType, // NFT 模式
          activityId: activityId
        };

        saveActivity(newActivity);
        console.log("✅ 活动已保存到本地存储");

        setSuccess("NFT 活动创建成功！");
        setTimeout(() => {
          router.push("/activities");
        }, 2000);
      } else {
        setError("活动创建成功，但无法获取活动信息。请刷新页面查看。");
      }
    } catch (err: any) {
      console.error("创建 NFT 活动失败:", err);
      const errorMessage = err.shortMessage || err.message || "创建 NFT 活动失败";
      setError(errorMessage.includes("revert") ? errorMessage.split("revert")[1]?.trim() || "创建失败" : errorMessage);
    }
  };

  if (!mounted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
        加载中...
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
        background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0a0e27 100%)",
        overflow: "hidden"
      }}
    >
      <ParticleField />
      
      <div style={{ position: "relative", zIndex: 1, padding: "40px 20px", maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32, textAlign: "center", color: "#ffffff" }}>
          创建 NFT 活动
        </h1>

        {!isConnected ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ marginBottom: 20, color: "#ffffff" }}>请先连接钱包</p>
            <button
              onClick={() => connect({ connector: injected() })}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#ffffff",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              连接钱包
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: 32,
              borderRadius: 16,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.03)",
              backdropFilter: "blur(20px)"
            }}
          >
            <CreateNFTActivityForm
              onSubmit={handleCreateNFTActivity}
              isSubmitting={isPending}
              address={address}
            />

            {error && (
              <div style={{
                marginTop: 20,
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                fontSize: 14
              }}>
                ❌ {error}
              </div>
            )}

            {success && (
              <div style={{
                marginTop: 20,
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                color: "#86efac",
                fontSize: 14
              }}>
                ✅ {success}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

