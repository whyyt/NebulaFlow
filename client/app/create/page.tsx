"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, usePublicClient, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useRouter } from "next/navigation";
import { CreateActivityForm } from "../../components/activities/CreateActivityForm";
import { ActivityFormData, ActivityMetadata, IncentiveType } from "../../lib/types";
import { ACTIVITY_FACTORY_ABI, ACTIVITY_REGISTRY_ABI } from "../../lib/activityRegistry";
import { saveActivity } from "../../lib/activityStorage";
import { parseEther, decodeEventLog } from "viem";
import { ParticleField } from "../../components/animations/ParticleField";

// 合约地址（最新部署）
const ACTIVITY_FACTORY_ADDRESS = "0x4A679253410272dd5232B3Ff7cF5dbB88f295319";
const ACTIVITY_REGISTRY_ADDRESS = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";

export default function CreateActivityPage() {
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

  // ========== 创建押金挑战活动 ==========
  const handleCreateDepositChallenge = async (data: ActivityFormData) => {
    console.log("=== 开始创建押金挑战 ===");
    
    if (!isConnected || !address) {
      setError("请先连接钱包");
      return;
    }

    if (!publicClient) {
      setError("无法连接到区块链，请检查网络连接。");
      return;
    }

    try {
      // 数据验证
      // 使用钱包地址作为 creatorName
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

      const totalRounds = Number(data.totalRounds || 0);
      const maxParticipants = Number(data.maxParticipants || 0);
      
      if (totalRounds <= 0) {
        setError("挑战天数必须大于 0");
        return;
      }
      if (maxParticipants <= 0) {
        setError("最大参与人数必须大于 0");
        return;
      }

      // 押金金额验证
      if (!data.depositAmount || String(data.depositAmount).trim() === "") {
        setError("请输入金额");
        return;
      }

      const depositAmountStr = String(data.depositAmount).trim();
      const depositAmountNum = parseFloat(depositAmountStr);
      
      if (isNaN(depositAmountNum) || depositAmountNum <= 0) {
        setError("押金金额必须大于 0");
        return;
      }

      const depositWei = parseEther(depositAmountStr);

      console.log("创建活动参数:");
      console.log("  - creatorName:", creatorName);
      console.log("  - title:", title);
      console.log("  - description:", description);
      console.log("  - depositAmount:", depositWei.toString(), "wei");
      console.log("  - totalRounds:", totalRounds);
      console.log("  - maxParticipants:", maxParticipants);
      console.log("  - isPublic:", data.isPublic);

      // 调用合约
      const hash = await writeContractAsync({
        address: ACTIVITY_FACTORY_ADDRESS as `0x${string}`,
        abi: ACTIVITY_FACTORY_ABI,
        functionName: "createDepositChallenge",
        args: [
          title,
          description,
          depositWei,
          BigInt(totalRounds),
          BigInt(maxParticipants),
          Boolean(data.isPublic),
          creatorName
        ]
      });

      console.log("✅ 交易已提交，hash:", hash);

      // 等待交易确认
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ 交易已确认，区块号:", receipt.blockNumber);

      // 解析事件
      let activityId: bigint | null = null;
      let activityContract: string | null = null;

      for (const log of receipt.logs) {
        try {
          const eventAbi = ACTIVITY_FACTORY_ABI.find(
            item => item.type === "event" && item.name === "DepositChallengeCreated"
          );
          if (eventAbi) {
            const decodedLog = decodeEventLog({
              abi: [eventAbi],
              data: log.data,
              topics: log.topics
            });
            
            activityContract = (decodedLog as any).args.challengeAddress;
            activityId = (decodedLog as any).args.activityId;
            console.log("✅ 解析到 DepositChallengeCreated 事件");
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // 备用方案：从 ActivityRegistry 查询
      if (!activityContract || activityId === null) {
        console.warn("⚠️  无法从事件解析，尝试从 ActivityRegistry 查询...");
        const currentCount = await publicClient.readContract({
          address: ACTIVITY_REGISTRY_ADDRESS as `0x${string}`,
          abi: ACTIVITY_REGISTRY_ABI,
          functionName: "activityCount"
        }) as bigint;
        
        if (currentCount > 0n) {
          activityId = currentCount;
          const metadata = await publicClient.readContract({
            address: ACTIVITY_REGISTRY_ADDRESS as `0x${string}`,
            abi: ACTIVITY_REGISTRY_ABI,
            functionName: "getActivityMetadataTuple",
            args: [activityId]
          }) as any;
          
          if (metadata && Array.isArray(metadata)) {
            activityContract = metadata[0];
            console.log("✅ 从 ActivityRegistry 查询成功");
          }
        }
      }

      // 保存到 localStorage
      if (activityContract && activityId !== null && address) {
        const newActivity: ActivityMetadata = {
          activityContract: activityContract,
          creator: address,
          creatorName: creatorName,
          title: title,
          description: description,
          createdAt: BigInt(Math.floor(Date.now() / 1000)),
          isPublic: Boolean(data.isPublic),
          incentiveType: IncentiveType.DepositPool,
          activityId: Number(activityId)
        };
        
        saveActivity(newActivity);
        console.log("✅ 活动已保存到 localStorage");
      }

      setSuccess("押金挑战创建成功！");
      setTimeout(() => {
        router.push("/activities");
      }, 2000);

    } catch (err: any) {
      console.error("❌ 创建押金挑战失败:", err);
      let errorMessage = "创建押金挑战失败";
      
      if (err.message) {
        errorMessage = err.message;
        if (err.message.includes("revert") || err.message.includes("reverted")) {
          const revertMatch = err.message.match(/revert(?:ed)?\s+(.+?)(?:\n|$)/i);
          if (revertMatch) {
            errorMessage = `交易失败: ${revertMatch[1]}`;
          }
        }
      }
      
      setError(errorMessage);
    }
  };

  // ========== 【统一入口】创建活动 ==========
  const handleSubmit = async (data: ActivityFormData) => {
    setError(null);
    setSuccess(null);
    await handleCreateDepositChallenge(data);
  };

  if (!mounted) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#e8edf9" }}>
        加载中...
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

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "120px 24px 80px",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 24,
            color: "#f8fafc",
          }}
        >
          创建活动
        </h1>

      {!isConnected ? (
        <div style={{ padding: 24, borderRadius: 12, background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>
          <p style={{ marginBottom: 16 }}>请先连接钱包</p>
          <button
            onClick={() => connect({ connector: injected() })}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              border: "none",
              background: "#22d3ee",
              color: "#041016",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            连接钱包
          </button>
        </div>
      ) : (
        <div>
          <CreateActivityForm onSubmit={handleSubmit} isSubmitting={isPending} address={address || undefined} />

          {success && (
            <div style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              background: "rgba(34,211,238,0.2)",
              color: "#22d3ee",
              fontSize: 14
            }}>
              {success}
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              background: "rgba(239,68,68,0.2)",
              color: "#fca5a5",
              fontSize: 14
            }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
