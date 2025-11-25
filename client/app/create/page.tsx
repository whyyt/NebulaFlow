"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, usePublicClient, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { CreateActivityForm } from "../../components/activities/CreateActivityForm";
import { CreateActivityFormData } from "../../lib/types";
import { ACTIVITY_FACTORY_ABI } from "../../lib/activityRegistry";
import { parseEther } from "viem";

// 这些地址应该在部署后更新
const ACTIVITY_FACTORY_ADDRESS = "0x0000000000000000000000000000000000000000"; // 待部署
const ACTIVITY_REGISTRY_ADDRESS = "0x0000000000000000000000000000000000000000"; // 待部署

export default function CreateActivityPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (data: CreateActivityFormData) => {
    if (!isConnected || !address) {
      setError("请先连接钱包");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      if (data.incentiveType === 0) {
        // 创建押金挑战
        const depositWei = parseEther(data.depositAmount || "0");
        
        const hash = await writeContractAsync({
          address: ACTIVITY_FACTORY_ADDRESS as `0x${string}`,
          abi: ACTIVITY_FACTORY_ABI,
          functionName: "createDepositChallenge",
          args: [
            data.category,
            data.title,
            data.description,
            depositWei,
            BigInt(data.totalRounds || 0),
            BigInt(data.maxParticipants || 0),
            data.isPublic
          ]
        });

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        setSuccess("押金挑战创建成功！");
      } else {
        // 创建NFT奖励
        const hash = await writeContractAsync({
          address: ACTIVITY_FACTORY_ADDRESS as `0x${string}`,
          abi: ACTIVITY_FACTORY_ABI,
          functionName: "createNFTReward",
          args: [
            data.category,
            data.nftName || "",
            data.nftSymbol || "",
            data.baseTokenURI || "",
            data.title,
            data.description,
            data.isPublic
          ]
        });

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        setSuccess("NFT奖励活动创建成功！");
      }
    } catch (err: any) {
      console.error("创建活动错误:", err);
      setError(err.message || "创建活动失败");
    }
  };

  if (!mounted) {
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
        <button
          onClick={() => connect({ connector: injected() })}
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.3)",
            background: "linear-gradient(135deg, rgba(120, 119, 198, 0.3), rgba(236, 72, 153, 0.3))",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          连接钱包
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0a0f 0%, #1a0a1f 100%)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* 背景装饰 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.2), transparent), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(236, 72, 153, 0.15), transparent)",
          zIndex: 0,
        }}
      />

      <div style={{
        position: "relative",
        zIndex: 1,
        maxWidth: 900,
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
          创建活动
        </h1>

      <div style={{
        padding: 40,
        borderRadius: 24,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
      }}>
        <CreateActivityForm onSubmit={handleSubmit} isSubmitting={isPending} />

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
      </div>
    </div>
  );
}

