"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, usePublicClient, useConnect, useReadContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { useRouter } from "next/navigation";
import { CreateActivityForm } from "../../components/activities/CreateActivityForm";
import { DepositChallengeFormData, ActivityMetadata } from "../../lib/types";
import { ACTIVITY_FACTORY_ABI } from "../../lib/activityRegistry";
import { saveActivity, getStoredActivities } from "../../lib/activityStorage";
import { parseEther, decodeEventLog } from "viem";

// 这些地址应该在部署后更新
// 注意：如果显示红色错误提示，说明此地址对应的 ActivityFactory 未正确初始化 ActivityRegistry
// 请重新运行部署脚本，并使用新部署的地址
const ACTIVITY_FACTORY_ADDRESS = "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1"; // ActivityFactory 合约地址（最新部署）
const ACTIVITY_REGISTRY_ADDRESS = "0x59b670e9fA9D0A427751Af201D676719a970857b"; // ActivityRegistry 地址（通过 ActivityFactory 访问，通常不需要直接使用）

export default function CreateActivityPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // 直接使用硬编码的 ActivityRegistry 地址，避免异步加载延迟
  const registryAddress = ACTIVITY_REGISTRY_ADDRESS;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (data: DepositChallengeFormData) => {
    if (!isConnected || !address) {
      setError("请先连接钱包");
      return;
    }

    // 检查合约地址是否已部署（这里 ACTIVITY_FACTORY_ADDRESS 是常量，不需要检查）
    // 如果合约地址无效，会在后续的合约调用中失败

    setError(null);
    setSuccess(null);

    // 检查 publicClient 是否可用
    if (!publicClient) {
      setError("无法连接到区块链，请检查网络连接。");
      return;
    }

    try {
      // 创建押金挑战
      const depositWei = parseEther(data.depositAmount || "0");
      
      // 智能转换函数：无论输入是数字还是字符串，都转换为字符串
      const normalizeToString = (value: any): string => {
        if (value === null || value === undefined) return "";
        if (typeof value === "number") return String(value);
        if (typeof value === "string") return value.trim();
        return String(value).trim();
      };
      
      // 处理 title - 强制转换为字符串，无论输入是什么类型
      let title: string = "";
      if (data.title !== null && data.title !== undefined) {
        // 无论是什么类型，都先转换为字符串
        const tempTitle = String(data.title);
        title = tempTitle.trim();
      }
      
      // 处理 description - 强制转换为字符串，无论输入是什么类型
      let description: string = "";
      if (data.description !== null && data.description !== undefined) {
        // 无论是什么类型，都先转换为字符串
        const tempDescription = String(data.description);
        description = tempDescription.trim();
      }
      
      // 验证非空
      if (!title || title.length === 0) {
        setError("活动标题不能为空");
        return;
      }
      if (!description || description.length === 0) {
        setError("活动描述不能为空");
        return;
      }
      
      // 最终验证：确保是字符串类型
      if (typeof title !== "string") {
        console.error("Title 类型错误:", typeof title, title);
        setError("活动标题格式错误");
        return;
      }
      if (typeof description !== "string") {
        console.error("Description 类型错误:", typeof description, description);
        setError("活动描述格式错误");
        return;
      }
      
      // 构建参数数组 - 确保每个参数类型正确
      // 所有活动都设置为公开
      // 再次强制确保 title 和 description 是字符串类型
      const finalTitle: string = String(title || "");
      const finalDescription: string = String(description || "");
      
      const finalArgs: [string, string, bigint, bigint, bigint, boolean] = [
        finalTitle,  // 强制转换为字符串
        finalDescription,  // 强制转换为字符串
        depositWei,
        BigInt(data.totalRounds || 0),
        BigInt(data.maxParticipants || 0),
        true  // 所有活动都设置为公开
      ];
      
      // 调试：验证参数类型和值
      console.log("=== 合约调用参数验证 ===");
      console.log("原始数据:", {
        title: data.title,
        titleType: typeof data.title,
        description: data.description,
        descriptionType: typeof data.description
      });
      console.log("转换后:", {
        title: title,
        titleType: typeof title,
        titleLength: title.length,
        description: description,
        descriptionType: typeof description,
        descriptionLength: description.length
      });
      console.log("最终参数数组:", finalArgs);
      console.log("参数类型:", finalArgs.map((arg, i) => ({
        index: i,
        value: arg,
        type: typeof arg,
        isString: typeof arg === "string"
      })));
      
      const hash = await writeContractAsync({
        address: ACTIVITY_FACTORY_ADDRESS as `0x${string}`,
        abi: ACTIVITY_FACTORY_ABI,
        functionName: "createDepositChallenge",
        args: finalArgs
      });

      let receipt;
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash });
      }

      // 从 receipt 中解析事件获取 activityId 和 activityContract
      let activityId: bigint | null = null;
      let activityContract: string | null = null;
      
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: ACTIVITY_FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });
            
            if (decoded.eventName === "DepositChallengeCreated") {
              activityId = decoded.args.activityId as bigint;
              activityContract = decoded.args.challengeAddress as string;
              break;
            }
          } catch (e) {
            // 忽略解析失败的事件
          }
        }
      }

      // 如果无法从事件中获取，尝试从合约返回值获取
      if (!activityContract && publicClient) {
        try {
          // 获取最新的 activityCount
          const count = await publicClient.readContract({
            address: registryAddress as `0x${string}`,
            abi: [
              {
                type: "function",
                name: "activityCount",
                inputs: [],
                outputs: [{ name: "", type: "uint256" }],
                stateMutability: "view"
              }
            ],
            functionName: "activityCount"
          });
          activityId = (count as bigint) - BigInt(1);
          
          // 获取活动元数据
          const metadata = await publicClient.readContract({
            address: registryAddress as `0x${string}`,
            abi: [
              {
                type: "function",
                name: "getActivityMetadata",
                inputs: [{ name: "_activityId", type: "uint256" }],
                outputs: [
                  { name: "activityContract", type: "address" },
                  { name: "creator", type: "address" },
                  { name: "title", type: "string" },
                  { name: "description", type: "string" },
                  { name: "createdAt", type: "uint256" },
                  { name: "isPublic", type: "bool" }
                ],
                stateMutability: "view"
              }
            ],
            functionName: "getActivityMetadata",
            args: [activityId]
          });
          activityContract = (metadata as any).activityContract;
        } catch (e) {
          console.warn("无法从合约获取活动信息:", e);
        }
      }

      // 从链上读取最新创建的活动数据（确保使用链上的 createdAt）
      console.log("=".repeat(80));
      console.log("【第四步：创建活动后刷新逻辑取证】");
      console.log("=".repeat(80));
      console.log("📝 创建活动成功，开始处理后续逻辑");
      console.log("   - activityContract:", activityContract);
      console.log("   - activityId:", activityId);
      console.log("   - address:", address);
      
      // 如果从事件中获取到了 activityId，立即从链上读取完整数据
      if (activityId !== null && publicClient) {
        try {
          console.log("   🔍 从链上读取最新创建的活动数据...");
          const metadata: any = await publicClient.readContract({
            address: registryAddress as `0x${string}`,
            abi: [
              {
                type: "function",
                name: "getActivityMetadata",
                inputs: [{ name: "_activityId", type: "uint256" }],
                outputs: [
                  { name: "activityContract", type: "address" },
                  { name: "creator", type: "address" },
                  { name: "title", type: "string" },
                  { name: "description", type: "string" },
                  { name: "createdAt", type: "uint256" },
                  { name: "isPublic", type: "bool" }
                ],
                stateMutability: "view"
              }
            ],
            functionName: "getActivityMetadata",
            args: [activityId]
          });
          
          console.log("   ✅ 从链上获取到活动元数据:", JSON.stringify(metadata, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
          , 2));
          
          // 使用链上的数据构造活动对象
          const newActivity: ActivityMetadata = {
            activityContract: metadata.activityContract as string,
            creator: metadata.creator as string,
            title: metadata.title as string,
            description: metadata.description || "" as string,
            createdAt: metadata.createdAt as bigint,  // 使用链上的时间戳
            isPublic: metadata.isPublic as boolean
          };
          
          console.log("   - 新活动对象（使用链上数据）:", JSON.stringify(newActivity, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
          , 2));
          
          console.log("   💾 保存到 localStorage...");
          saveActivity(newActivity);
          
          // 验证是否保存成功
          const stored = getStoredActivities();
          console.log("   ✅ 保存后验证，localStorage 中活动数量:", stored.length);
          console.log("   - localStorage 内容:", JSON.stringify(stored, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
          , 2));
        } catch (e) {
          console.warn("   ⚠️  从链上读取活动数据失败，使用事件数据:", e);
          // 如果从链上读取失败，使用事件中的数据
          if (activityContract && address) {
            const newActivity: ActivityMetadata = {
              activityContract: activityContract,
              creator: address,
              title: title,
              description: description,
              createdAt: BigInt(Math.floor(Date.now() / 1000)),  // 降级使用前端时间戳
              isPublic: true
            };
            saveActivity(newActivity);
          }
        }
      } else if (activityContract && address && publicClient) {
        // 如果无法从事件获取 activityId，使用已知数据
        console.warn("   ⚠️  无法获取 activityId，使用事件中的 activityContract");
        const newActivity: ActivityMetadata = {
          activityContract: activityContract,
          creator: address,
          title: title,
          description: description,
          createdAt: BigInt(Math.floor(Date.now() / 1000)),
          isPublic: true
        };
        saveActivity(newActivity);
      } else {
        console.warn("   ⚠️  无法保存活动到 localStorage:");
        console.warn("      - activityContract:", activityContract);
        console.warn("      - activityId:", activityId);
        console.warn("      - address:", address);
      }

      setSuccess("押金挑战创建成功！");
      
      console.log("   🔄 准备跳转到 /activities 页面...");
      // 延迟跳转，让用户看到成功消息，并确保数据已保存
      setTimeout(() => {
        console.log("   ✅ 执行 router.push('/activities?refresh=true')");
        router.push("/activities?refresh=true"); // 添加 query 参数触发刷新
      }, 1000); // 减少延迟时间，因为 activities 页面会立即显示 localStorage 数据
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

