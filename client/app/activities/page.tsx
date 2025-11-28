"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { usePathname, useSearchParams } from "next/navigation";
import { FadeIn } from "../../components/animations/FadeIn";
import { ParticleField } from "../../components/animations/ParticleField";
import { ACTIVITY_FACTORY_ABI, ACTIVITY_REGISTRY_ABI } from "../../lib/activityRegistry";
import { NFT_ACTIVITY_FACTORY_ABI } from "../../lib/nftActivityRegistry";
import { CreateUnifiedActivityForm } from "../../components/activities/CreateUnifiedActivityForm";
import { CreateNFTActivityForm } from "../../components/activities/CreateNFTActivityForm";
import { ActivityCard } from "../../components/activities/ActivityCard";
import { NFTActivityCard } from "../../components/activities/NFTActivityCard";
import { ActivityFormData, ActivityMetadata, IncentiveType, DepositChallengeFormData } from "../../lib/types";
import { getStoredActivities, saveActivity } from "../../lib/activityStorage";
import { parseEther } from "viem";
import { decodeEventLog } from "viem";
import Link from "next/link";

const ACTIVITY_FACTORY_ADDRESS = "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650";
const NFT_ACTIVITY_FACTORY_ADDRESS = "0xc351628EB244ec633d5f21fBD6621e1a683B1181";
const ACTIVITY_REGISTRY_ADDRESS = "0x7969c5eD335650692Bc04293B07F5BF2e7A673C0"; // 直接使用硬编码地址，避免异步加载延迟

export default function ActivitiesPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [activities, setActivities] = useState<ActivityMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateNFTForm, setShowCreateNFTForm] = useState(false);
  const [showCreateUnifiedForm, setShowCreateUnifiedForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const lastPathnameRef = useRef<string | null>(null);
  const [shouldAnimateActivities, setShouldAnimateActivities] = useState(false);

  // 直接使用硬编码的 ActivityRegistry 地址，避免异步加载延迟
  const registryAddress = ACTIVITY_REGISTRY_ADDRESS;

  useEffect(() => {
    setMounted(true);
  }, []);

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
      }
    };
  }, []);

  // 获取所有活动（优先从本地存储读取，然后从合约获取）
  const fetchAllActivities = useCallback(async () => {
    console.log("=".repeat(80));
    console.log("【第二步：前端数据请求取证】");
    console.log("=".repeat(80));
    console.log("📞 fetchAllActivities 被调用");
    console.log("   - registryAddress:", registryAddress);
    console.log("   - publicClient:", publicClient ? "存在" : "不存在");
    
    try {
      setLoading(true);
      
      // 1. 优先从本地存储读取
      const storedActivities = getStoredActivities();
      console.log(`\n1️⃣ 从本地存储读取:`);
      console.log(`   - 数量: ${storedActivities.length}`);
      console.log(`   - 原始数据:`, JSON.stringify(storedActivities, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      , 2));
      
      // 2. 如果本地有数据，先设置到 state，但继续从合约获取最新数据
      if (storedActivities.length > 0) {
        console.log(`   ⚠️  本地有数据，先设置到 state`);
        console.log(`   - 本地活动数量:`, storedActivities.length);
        setActivities(storedActivities);
        setLoading(false); // 先显示本地数据，让用户看到
        console.log(`   - setActivities 完成，继续从合约获取最新数据`);
      } else {
        // 如果本地没有数据，先设置空数组，避免显示旧数据
        setActivities([]);
      }
      
      // 3. 从合约获取活动列表（如果合约可用）
      if (!publicClient) {
        console.log(`\n2️⃣ 合约不可用:`);
        console.log(`   - publicClient 不存在:`, !publicClient);
        // 如果合约不可用，只使用本地数据
        if (storedActivities.length === 0) {
          console.log(`   - 本地也无数据，设置空数组`);
          setActivities([]);
        }
        setLoading(false);
        return;
      }

      console.log(`\n3️⃣ 从合约读取 activityCount...`);
      console.log(`   - 使用地址:`, registryAddress);
      console.log(`   - ABI 长度:`, ACTIVITY_REGISTRY_ABI.length);
      
      // 获取活动总数
      let count: bigint;
      try {
        count = await publicClient.readContract({
          address: registryAddress as `0x${string}`,
          abi: ACTIVITY_REGISTRY_ABI,
          functionName: "activityCount"
        }) as bigint;
        console.log(`   ✅ 成功读取 activityCount`);
        console.log(`   - 原始返回值 (bigint):`, count.toString());
        console.log(`   - 转换为数字:`, Number(count));
      } catch (err: any) {
        console.error(`   ❌ 读取 activityCount 失败:`, err);
        console.error(`   - 错误消息:`, err.message);
        console.error(`   - 错误堆栈:`, err.stack);
        throw err; // 重新抛出错误，让外层 catch 处理
      }

      if (count === BigInt(0)) {
        console.log(`   ⚠️  合约中活动总数为 0`);
        // 如果合约中没有活动，清除本地数据（可能是合约重新部署）
        console.log(`   - 清除本地存储的旧活动数据`);
        if (typeof window !== "undefined") {
          localStorage.removeItem("nebulaflow_activities");
        }
        setActivities([]);
        setLoading(false);
        return;
      }

      console.log(`\n4️⃣ 开始从合约获取 ${Number(count)} 个活动的元数据...`);
      console.log(`   ⚠️  注意：activityId 从 1 开始，不是从 0 开始！`);

      // 批量获取所有活动的元数据，添加错误处理
      // 使用串行方式逐个获取，避免并发导致的错误
      // 【关键修复】activityId 从 1 开始（合约中使用 ++activityCount），所以循环从 1 开始
      const contractActivities: ActivityMetadata[] = [];
      
      for (let i = 1; i <= Number(count); i++) {
        try {
          console.log(`   📋 读取活动 ID ${i}...`);
          console.log(`      - i 值:`, i, `(类型: ${typeof i})`);
          console.log(`      - BigInt(i):`, BigInt(i).toString(), `(类型: ${typeof BigInt(i)})`);
          
          // 使用 encodeFunctionData + call 的方式，避免 viem readContract 的参数处理问题
          const activityIdArg = BigInt(String(i));
          console.log(`      - 准备传递的参数:`, activityIdArg.toString(), `(类型: ${typeof activityIdArg})`);
          
          // 使用新的 getActivityMetadataTuple 函数，返回多个值而不是 struct
          // 这样可以避免 viem 处理 struct 时的问题
          const result: any = await publicClient.readContract({
            address: registryAddress as `0x${string}`,
            abi: ACTIVITY_REGISTRY_ABI,
            functionName: "getActivityMetadataTuple",
            args: [activityIdArg]
          });
          
          console.log(`      - 原始合约返回值类型:`, Array.isArray(result) ? "数组" : typeof result);
          console.log(`      - 原始合约返回值:`, JSON.stringify(result, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
          , 2));
          
          // getActivityMetadataTuple 返回多个值，viem 会将其解析为数组
          // 按照返回顺序：activityContract, creator, creatorName, title, description, createdAt, isPublic, incentiveType
          let metadata: any;
          if (Array.isArray(result)) {
            metadata = {
              activityContract: result[0],
              creator: result[1],
              creatorName: result[2],
              title: result[3],
              description: result[4],
              createdAt: result[5],
              isPublic: result[6],
              incentiveType: result[7] !== undefined ? Number(result[7]) : 0
            };
            console.log(`      - 检测到数组格式，已转换为对象格式`);
          } else {
            // 如果是对象格式（viem 可能也会返回对象）
            metadata = result;
            console.log(`      - 检测到对象格式，直接使用`);
          }
          
          console.log(`      - 解析后的元数据:`, JSON.stringify(metadata, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
          , 2));
          
          // 提取字段值
          const activityContract = metadata?.activityContract || metadata?.[0];
          const creator = metadata?.creator || metadata?.[1];
          const creatorName = metadata?.creatorName || metadata?.[2] || "";
          const title = metadata?.title || metadata?.[3];
          const description = metadata?.description || metadata?.[4] || "";
          const createdAt = metadata?.createdAt || metadata?.[5];
          const isPublic = metadata?.isPublic !== undefined ? metadata.isPublic : (metadata?.[6] !== undefined ? metadata[6] : true);
          const incentiveType = metadata?.incentiveType !== undefined ? Number(metadata.incentiveType) : (metadata?.[7] !== undefined ? Number(metadata[7]) : 0);
          
          console.log(`      - 提取的字段值:`);
          console.log(`         - activityContract:`, activityContract);
          console.log(`         - creator:`, creator);
          console.log(`         - creatorName:`, creatorName);
          console.log(`         - title:`, title);
          console.log(`         - description:`, description);
          console.log(`         - createdAt:`, createdAt);
          console.log(`         - isPublic:`, isPublic);
          console.log(`         - incentiveType:`, incentiveType);
          
          if (activityContract && 
              activityContract !== "0x0000000000000000000000000000000000000000" &&
              title &&
              title !== "") {
            const processedActivity: ActivityMetadata = {
              activityContract: activityContract as string,
              creator: creator as string,
              creatorName: creatorName as string,
              title: title as string,
              description: description as string,
              createdAt: BigInt(createdAt?.toString() || "0"),
              isPublic: Boolean(isPublic),
              incentiveType: incentiveType as IncentiveType,
              activityId: i // 保存真实的链上 activityId
            };
            console.log(`      - 处理后的活动数据:`, JSON.stringify(processedActivity, (key, value) => 
              typeof value === 'bigint' ? value.toString() : value
            , 2));
            contractActivities.push(processedActivity);
            console.log(`      ✅ 活动 ID ${i} 有效，已添加到数组`);
          } else {
            console.warn(`      ❌ 活动 ID ${i} 无效，跳过`);
            console.warn(`         - activityContract:`, activityContract);
            console.warn(`         - title:`, title);
            console.warn(`         - isPublic:`, isPublic);
          }
        } catch (err: any) {
          // 如果获取某个活动失败（可能活动不存在），记录错误但继续处理其他活动
          console.error(`      ❌ 获取活动 ID ${i} 的元数据失败:`, err);
          console.error(`         - 错误消息:`, err.message || String(err));
          console.error(`         - 错误堆栈:`, err.stack);
          // 继续处理下一个活动
          continue;
        }
      }

      console.log(`\n5️⃣ 从合约成功获取 ${contractActivities.length} 个有效活动`);
      console.log(`   - contractActivities 原始数组:`, JSON.stringify(contractActivities, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      , 2));
      
      // 4. 合并本地和合约数据，只保留链上存在的活动
      // 策略：严格以链上数据为准，只显示链上存在的活动
      // 如果本地有活动但链上不存在，不保留（可能是旧合约的数据）
      const mergedActivities: ActivityMetadata[] = [];
      const processedContracts = new Set<string>();
      const chainActivityIds = new Set<number>();
      
      console.log(`\n6️⃣ 合并数据（只保留链上存在的活动）:`);
      console.log(`   - 本地活动数量:`, storedActivities.length);
      console.log(`   - 合约活动数量:`, contractActivities.length);
      
      // 首先添加所有链上活动（链上数据优先）
      for (const contractActivity of contractActivities) {
        const contractAddr = contractActivity.activityContract.toLowerCase();
        mergedActivities.push(contractActivity);
        processedContracts.add(contractAddr);
        if (contractActivity.activityId !== undefined) {
          chainActivityIds.add(contractActivity.activityId);
        }
        console.log(`   ✅ 添加链上活动:`, contractActivity.activityContract, `(ID: ${contractActivity.activityId}, title: ${contractActivity.title})`);
      }
      
      // 验证本地活动是否在链上存在
      // 只保留那些 activityId 在当前链上范围内的活动（可能是刚创建还未完全同步的）
      for (const storedActivity of storedActivities) {
        const storedAddr = storedActivity.activityContract.toLowerCase();
        const storedId = storedActivity.activityId;
        
        // 如果本地活动已存在于链上，跳过（已使用链上数据）
        if (processedContracts.has(storedAddr)) {
          console.log(`   ⏭️  跳过本地活动（链上已存在，已使用链上数据）:`, storedActivity.activityContract);
          continue;
        }
        
        // 如果本地活动有 activityId，检查是否在当前链上范围内
        if (storedId !== undefined) {
          if (storedId > 0 && storedId <= Number(count)) {
            // activityId 在范围内，可能是刚创建还未完全同步，保留
            mergedActivities.push(storedActivity);
            console.log(`   ✅ 添加本地活动（activityId ${storedId} 在链上范围内，可能是新创建的活动）:`, storedActivity.activityContract, `(title: ${storedActivity.title})`);
          } else {
            // activityId 超出范围，是旧合约的数据，不保留
            console.log(`   ❌ 跳过本地活动（activityId ${storedId} 超出链上范围 1-${Number(count)}，是旧合约数据）:`, storedActivity.activityContract, `(title: ${storedActivity.title})`);
          }
        } else {
          // 没有 activityId，可能是旧数据，不保留
          console.log(`   ❌ 跳过本地活动（没有 activityId，可能是旧数据）:`, storedActivity.activityContract, `(title: ${storedActivity.title})`);
        }
      }
      
      // 清除 localStorage 中不在链上的旧活动
      if (typeof window !== "undefined") {
        const validStoredActivities = storedActivities.filter((storedActivity) => {
          const storedAddr = storedActivity.activityContract.toLowerCase();
          const storedId = storedActivity.activityId;
          
          // 如果链上已存在，保留（用于更新）
          if (processedContracts.has(storedAddr)) {
            return true;
          }
          
          // 如果有 activityId 且在范围内，保留
          if (storedId !== undefined && storedId > 0 && storedId <= Number(count)) {
            return true;
          }
          
          // 其他情况，不保留
          return false;
        });
        
        // 更新 localStorage，只保留有效的活动
        if (validStoredActivities.length !== storedActivities.length) {
          console.log(`   🧹 清除 localStorage 中的旧活动: ${storedActivities.length - validStoredActivities.length} 个`);
          const serialized = validStoredActivities.map((a) => ({
            ...a,
            createdAt: a.createdAt.toString(),
          }));
          localStorage.setItem("nebulaflow_activities", JSON.stringify(serialized));
        }
      }
      
      console.log(`   - 合并后总活动数:`, mergedActivities.length);
      
      // 按创建时间倒序排列
      mergedActivities.sort((a, b) => {
        if (a.createdAt > b.createdAt) return -1;
        if (a.createdAt < b.createdAt) return 1;
        return 0;
      });

      console.log(`\n7️⃣ 最终 setState 前的数据:`);
      console.log(`   - mergedActivities 数量:`, mergedActivities.length);
      console.log(`   - mergedActivities 完整数据:`, JSON.stringify(mergedActivities, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      , 2));
      console.log(`   - 当前 activities state 长度:`, activities.length);

      setActivities(mergedActivities);
      
      console.log(`\n8️⃣ setState 完成，预期 activities.length = ${mergedActivities.length}`);
      console.log("=".repeat(80));
    } catch (err: any) {
      console.error("\n❌ 获取活动列表失败:", err);
      console.error("   - 错误类型:", err?.constructor?.name || typeof err);
      console.error("   - 错误消息:", err?.message || String(err));
      console.error("   - 错误堆栈:", err instanceof Error ? err.stack : "无堆栈信息");
      console.error("   - 完整错误对象:", err);
      
      // 显示错误给用户
      setError(`获取活动列表失败: ${err?.message || String(err)}`);
      
      // 如果合约获取失败，至少显示本地数据
      const storedActivities = getStoredActivities();
      console.log(`   - 回退到本地数据，数量:`, storedActivities.length);
      if (storedActivities.length > 0) {
        setActivities(storedActivities);
      } else {
        setActivities([]);
      }
    } finally {
      setLoading(false);
      console.log(`\n✅ fetchAllActivities 执行完成，loading = false`);
    }
  }, [publicClient]);

  // 检查是否应该执行淡入动画（从导航栏点击进入时）
  useEffect(() => {
    if (!mounted) return;
    
    // 检查 URL 参数或 sessionStorage 中是否有动画标记
    const animateParam = searchParams.get('animate');
    const fromNav = sessionStorage.getItem('activities_animate');
    
    if (animateParam === 'true' || fromNav === 'true') {
      setShouldAnimateActivities(true);
      // 清除标记，确保只执行一次
      sessionStorage.removeItem('activities_animate');
      if (animateParam === 'true') {
        // 移除 URL 参数
        window.history.replaceState({}, '', '/activities');
      }
    } else {
      setShouldAnimateActivities(false);
    }
  }, [mounted, searchParams]);

  // 监听路由变化和 refresh 参数，当从 /create 跳转过来时刷新数据
  useEffect(() => {
    if (!mounted) return;

    const refreshParam = searchParams.get('refresh');
    if (refreshParam === 'true' && pathname === "/activities") {
      console.log("【路由刷新参数检测】检测到 refresh=true，立即刷新活动列表");
      // 移除 query 参数，避免重复刷新
      window.history.replaceState({}, '', '/activities');
      
      // 1. 立即从 localStorage 读取并显示（让用户立即看到新创建的活动）
      const stored = getStoredActivities();
      console.log("   📦 立即从 localStorage 读取到", stored.length, "个活动");
      if (stored.length > 0) {
        console.log("   - 立即显示 localStorage 数据");
        setActivities(stored);
        setLoading(false);
      }
      
      // 2. 然后从链上获取最新数据（延迟 2 秒，确保链上状态已完全更新）
      if (publicClient) {
        console.log("   🔄 延迟 2 秒从链上获取最新数据（确保链上状态已更新）...");
        const timeoutId = setTimeout(() => {
          console.log("   ✅ 开始从链上获取最新数据...");
          fetchAllActivities();
        }, 2000);
        
        // 清理 timeout（如果组件卸载）
        return () => clearTimeout(timeoutId);
      } else {
        console.log("   ⚠️  合约不可用，仅使用 localStorage 数据");
      }
    }
  }, [mounted, pathname, searchParams, publicClient, fetchAllActivities]);

  // 监听窗口焦点变化，当页面重新获得焦点时刷新
  useEffect(() => {
    if (!mounted) return;

    const handleFocus = () => {
      if (pathname === "/activities") {
        console.log("【窗口焦点变化】窗口重新获得焦点，检查并刷新活动列表");
        const stored = getStoredActivities();
        const currentCount = activities.length;
        if (stored.length > currentCount) {
          console.log("   📦 发现新活动（localStorage:", stored.length, "vs 当前:", currentCount, "），立即更新");
          setActivities(stored);
          setLoading(false);
        }
        if (publicClient) {
          fetchAllActivities();
        }
      }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [mounted, pathname, publicClient, fetchAllActivities, activities.length]);

  // 初始加载：立即从 localStorage 显示，然后从链上获取
  useEffect(() => {
    if (!mounted) return;
    
    console.log("【useEffect 触发 - 初始加载】");
    console.log("   - registryAddress:", registryAddress);
    console.log("   - publicClient:", publicClient ? "存在" : "不存在");
    
    // 先尝试从 localStorage 读取，立即显示（提供即时反馈）
    const stored = getStoredActivities();
    console.log("   📦 从 localStorage 读取到", stored.length, "个活动");
    if (stored.length > 0) {
      console.log("   - 立即显示 localStorage 数据");
      setActivities(stored);
      setLoading(false);
    } else {
      console.log("   - localStorage 为空，等待链上数据");
    }
    
    // 然后从链上获取最新数据（无论 localStorage 是否有数据）
    if (publicClient) {
      console.log("   ✅ publicClient 存在，立即调用 fetchAllActivities()");
      // 立即调用，不延迟
      fetchAllActivities();
    } else {
      console.log("   ⚠️  publicClient 不存在，仅使用 localStorage 数据");
      if (stored.length === 0) {
        setLoading(false);
      }
    }
  }, [mounted, publicClient, fetchAllActivities]);
  

  const handleSubmit = async (data: ActivityFormData) => {
    if (!isConnected || !address) {
      setError("请先连接钱包");
      return;
    }

    // ActivityFactory 地址验证已在部署时完成，这里不再需要检查

    setError(null);
    setSuccess(null);

    if (!publicClient) {
      setError("无法连接到区块链，请检查网络连接。");
      return;
    }

    try {
      // 押金金额验证
      if (!data.depositAmount || String(data.depositAmount).trim() === "") {
        setError("请输入金额");
        return;
      }
      
      // 创建押金挑战
      const depositAmountStr = String(data.depositAmount).trim();
      const depositAmountNum = parseFloat(depositAmountStr);
      if (isNaN(depositAmountNum) || depositAmountNum <= 0) {
        setError("押金金额必须大于 0");
        return;
      }
      const depositWei = parseEther(depositAmountStr);
      
      const normalizeToString = (value: any): string => {
        if (value === null || value === undefined) return "";
        if (typeof value === "number") return String(value);
        if (typeof value === "string") return value.trim();
        return String(value).trim();
      };
      
      // 处理 creatorName - 使用钱包地址
      let creatorName: string = "";
      if (address) {
        creatorName = `${address.slice(0, 6)}...${address.slice(-4)}`;
      } else {
        setError("请先连接钱包");
        return;
      }
      
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
      if (!title || title.length === 0) {
        setError("活动标题不能为空");
        return;
      }
      if (!description || description.length === 0) {
        setError("活动描述不能为空");
        return;
      }
      
      // 所有活动都设置为公开
      // 再次强制确保所有字符串字段都是字符串类型
      const finalCreatorName: string = String(creatorName || "");
      const finalTitle: string = String(title || "");
      const finalDescription: string = String(description || "");
      
      const finalArgs: [string, string, bigint, bigint, bigint, boolean, string] = [
        finalTitle,  // 强制转换为字符串
        finalDescription,  // 强制转换为字符串
        depositWei,
        BigInt(data.totalRounds || 0),
        BigInt(data.maxParticipants || 0),
        true,  // 所有活动都设置为公开
        finalCreatorName  // 创建者名称
      ];
      
      // 调试：验证参数类型和值
      console.log("=== 合约调用参数验证 (activities页面) ===");
      console.log("原始数据:", {
        creatorName: data.creatorName,
        creatorNameType: typeof data.creatorName,
        title: data.title,
        titleType: typeof data.title,
        description: data.description,
        descriptionType: typeof data.description
      });
      console.log("转换后:", {
        creatorName: creatorName,
        creatorNameType: typeof creatorName,
        creatorNameLength: creatorName.length,
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

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setSuccess("押金挑战创建成功！");
      // 刷新活动列表
      setTimeout(() => {
        fetchAllActivities();
      }, 2000); // 等待2秒确保链上数据已更新
    } catch (err: any) {
      console.error("创建活动错误:", err);
      setError(err.message || "创建活动失败");
    }
  };

  const handleSubmitUnified = async (data: { title: string; description: string; depositAmount: string; totalRounds: number; maxParticipants: number }, mode: "deposit" | "nft") => {
    // 根据模式调用不同的处理函数，保持代码独立
    try {
      if (mode === "deposit") {
        // 押金模式：调用押金活动创建逻辑（完全独立的代码路径）
        const depositFormData: ActivityFormData = {
          incentiveType: IncentiveType.DepositPool,
          creatorName: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "",
          title: data.title,
          description: data.description,
          depositAmount: data.depositAmount,
          totalRounds: data.totalRounds,
          maxParticipants: data.maxParticipants,
          isPublic: true
        };
        await handleSubmit(depositFormData);
        // 创建成功后关闭统一表单
        setShowCreateUnifiedForm(false);
      } else {
        // NFT 模式：调用 NFT 活动创建逻辑（完全独立的代码路径）
        const nftFormData = {
          title: data.title,
          description: data.description,
          totalRounds: data.totalRounds,
          maxParticipants: data.maxParticipants
        };
        await handleSubmitNFT(nftFormData);
        // 创建成功后关闭统一表单
        setShowCreateUnifiedForm(false);
      }
    } catch (err) {
      // 错误已经在 handleSubmit 或 handleSubmitNFT 中处理
      throw err;
    }
  };

  const handleSubmitNFT = async (data: { title: string; description: string; totalRounds: number; maxParticipants: number }) => {
    if (!isConnected || !address) {
      setError("请先连接钱包");
      return;
    }

    setError(null);
    setSuccess(null);

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

      const totalRounds = Number(data.totalRounds || 0);
      const maxParticipants = Number(data.maxParticipants || 0);
      if (totalRounds <= 0) {
        setError("活动天数必须大于 0");
        return;
      }
      if (maxParticipants <= 0) {
        setError("最大参与人数必须大于 0");
        return;
      }

      console.log("创建 NFT 活动参数:");
      console.log("  - creatorName:", creatorName);
      console.log("  - title:", title);
      console.log("  - description:", description);
      console.log("  - totalRounds:", totalRounds);
      console.log("  - maxParticipants:", maxParticipants);

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

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ 交易已确认:", receipt);

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
            activityContract = (decoded.args as any).nftActivityAddress;
            activityId = Number((decoded.args as any).activityId);
            console.log("✅ 解析到 NFTActivityCreated 事件");
            break;
          }
        } catch (err) {
          continue;
        }
      }

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
          incentiveType: IncentiveType.NFTPool,
          activityId: activityId
        };

        saveActivity(newActivity);
        console.log("✅ 活动已保存到本地存储");

        setSuccess("NFT 活动创建成功！");
        setShowCreateNFTForm(false);
        setTimeout(() => {
          fetchAllActivities();
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
              // 设置 sessionStorage 标记，确保淡入动画执行
              sessionStorage.setItem('activities_animate', 'true');
            }}
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
            Activity Hub
          </Link>
          <Link
            href="/profile"
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
        <FadeIn delay={0.2} duration={0.8}>
          <h1
            style={{
              fontSize: "clamp(48px, 6vw, 64px)",
              fontWeight: 700,
              marginBottom: 40,
              textAlign: "center",
              background: "linear-gradient(135deg, #ffffff, #a78bfa, #ec4899)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Activity Hub
          </h1>
        </FadeIn>

        {/* 创建活动按钮 */}
        <FadeIn delay={0.3} duration={0.8}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              marginBottom: showCreateUnifiedForm ? 40 : 60,
            }}
          >
            {/* 统一创建活动按钮 */}
            <button
              onClick={() => {
                if (!isConnected) {
                  connect({ connector: injected() });
                } else {
                  setShowCreateUnifiedForm(!showCreateUnifiedForm);
                  setShowCreateNFTForm(false); // 关闭 NFT 活动表单
                  setError(null);
                  setSuccess(null);
                }
              }}
              style={{
                padding: "16px 32px",
                borderRadius: 12,
                border: "1px solid rgba(120, 119, 198, 0.3)",
                background: showCreateUnifiedForm 
                  ? "rgba(120, 119, 198, 0.3)" 
                  : "rgba(120, 119, 198, 0.1)",
                color: "#ffffff",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.3s",
                backdropFilter: "blur(10px)",
              }}
              onMouseEnter={(e) => {
                if (!showCreateUnifiedForm) {
                  e.currentTarget.style.background = "rgba(120, 119, 198, 0.2)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 10px 30px rgba(120, 119, 198, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!showCreateUnifiedForm) {
                  e.currentTarget.style.background = "rgba(120, 119, 198, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              {showCreateUnifiedForm ? "收起创建栏" : "创建活动"}
            </button>
          </div>
        </FadeIn>

        {/* 创建 NFT 活动表单 */}
        {showCreateNFTForm && isConnected && (
          <FadeIn delay={0.4} duration={0.5}>
            <div
              style={{
                maxWidth: 900,
                width: "100%",
                margin: "0 auto 60px",
              }}
            >
              <div
                style={{
                  padding: 40,
                  borderRadius: 24,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.05)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                }}
              >

                <CreateNFTActivityForm onSubmit={handleSubmitNFT} isSubmitting={isPending} address={address || undefined} />

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
          </FadeIn>
        )}

        {/* 统一创建活动表单 */}
        {showCreateUnifiedForm && isConnected && (
          <FadeIn delay={0.4} duration={0.5}>
            <div
              style={{
                maxWidth: 900,
                width: "100%",
                margin: "0 auto 60px",
              }}
            >
              <div
                style={{
                  padding: 40,
                  borderRadius: 24,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.05)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                }}
              >

                <CreateUnifiedActivityForm onSubmit={handleSubmitUnified} isSubmitting={isPending} address={address || undefined} />

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
          </FadeIn>
        )}

        {/* 错误提示 */}
        {error && (
          <div style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 12,
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid rgba(239, 68, 68, 0.5)",
            color: "#fca5a5",
            fontSize: 14
          }}>
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>❌ 错误：</div>
            <div>{error}</div>
            <button
              onClick={() => setError(null)}
              style={{
                marginTop: 8,
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid rgba(239, 68, 68, 0.5)",
                background: "rgba(239, 68, 68, 0.3)",
                color: "#ffffff",
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              关闭
            </button>
          </div>
        )}

        {/* 调试信息面板 - 隐藏但保留代码 */}
        <div style={{
          display: "none", // fix: 隐藏调试信息面板，保留代码以便后续调试
          marginBottom: 20,
          padding: 16,
          borderRadius: 12,
          background: "rgba(0, 0, 0, 0.3)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          fontSize: 12,
          color: "#ffffff",
          fontFamily: "monospace"
        }}>
          <div style={{ marginBottom: 8, fontWeight: "bold" }}>🔍 调试信息：</div>
          <div>loading: {loading ? "true" : "false"}</div>
          <div>activities.length: {activities.length}</div>
          <div>registryAddress: {registryAddress}</div>
          <div>publicClient: {publicClient ? "✅ 存在" : "❌ 不存在"}</div>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => {
                console.log("手动刷新活动列表");
                setError(null);
                fetchAllActivities();
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                background: "rgba(120, 119, 198, 0.3)",
                color: "#ffffff",
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              手动刷新
            </button>
            <button
              onClick={() => {
                const stored = getStoredActivities();
                console.log("localStorage 活动:", stored);
                alert(`localStorage 中有 ${stored.length} 个活动\n\n详情请查看控制台`);
              }}
              style={{
                marginLeft: 8,
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                background: "rgba(236, 72, 153, 0.3)",
                color: "#ffffff",
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              检查 localStorage
            </button>
            <button
              onClick={async () => {
                if (!publicClient) {
                  alert("publicClient 不存在，无法测试");
                  return;
                }
                try {
                  console.log("测试读取 activityCount...");
                  const count = await publicClient.readContract({
                    address: registryAddress as `0x${string}`,
                    abi: ACTIVITY_REGISTRY_ABI,
                    functionName: "activityCount"
                  });
                  alert(`✅ 成功！activityCount = ${count.toString()}`);
                } catch (err: any) {
                  console.error("测试失败:", err);
                  alert(`❌ 失败：${err.message || String(err)}`);
                }
              }}
              style={{
                marginLeft: 8,
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                background: "rgba(34, 211, 238, 0.3)",
                color: "#ffffff",
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              测试合约调用
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ 
            padding: 48, 
            textAlign: "center", 
            color: "#ffffff",
            minHeight: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            加载中...
          </div>
        ) : activities.length === 0 ? (
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
              暂无活动，快去创建第一个活动吧！
            </p>
          </div>
        ) : (
          shouldAnimateActivities ? (
            <FadeIn delay={0.4} duration={0.8}>
              {/* 临时取消 isPublic 过滤，显示所有链上活动用于调试 */}
              {(() => {
                // 过滤掉已结束的活动（状态为 Settled = 2）
                // 注意：这里我们无法直接读取状态，所以需要在 ActivityCard 中处理
                const visibleActivities = activities; // 不再 filter isPublic，显示所有活动
                console.log("【渲染活动列表】");
                console.log("   - 总活动数:", activities.length);
                console.log("   - 可见活动数:", visibleActivities.length);
                console.log("   - 活动详情:", visibleActivities.map(a => ({
                  title: a.title,
                  isPublic: a.isPublic,
                  activityContract: a.activityContract
                })));
                
                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                      gap: 24,
                    }}
                  >
                    {visibleActivities.map((activity, index) => {
                    // fix: 根据 incentiveType 判断使用哪个卡片组件
                    const isNFT = activity.incentiveType === 1; // NFT 模式
                    return isNFT ? (
                      <NFTActivityCard
                        key={`${activity.activityContract}-${activity.activityId ?? index}`}
                        activity={activity}
                        hideIfSettled={true}
                      />
                    ) : (
                      <ActivityCard
                        key={`${activity.activityContract}-${activity.activityId ?? index}`}
                        activity={activity}
                        hideIfSettled={true}
                      />
                    );
                  })}
                  </div>
                );
              })()}
            </FadeIn>
          ) : (
            /* 不执行淡入动画，直接显示 */
            (() => {
              // 过滤掉已结束的活动（状态为 Settled = 2）
              const visibleActivities = activities; // 不再 filter isPublic，显示所有活动
              console.log("【渲染活动列表】");
              console.log("   - 总活动数:", activities.length);
              console.log("   - 可见活动数:", visibleActivities.length);
              console.log("   - 活动详情:", visibleActivities.map(a => ({
                title: a.title,
                isPublic: a.isPublic,
                activityContract: a.activityContract
              })));
              
              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 24,
                  }}
                >
                  {visibleActivities.map((activity, index) => {
                    // fix: 根据 incentiveType 判断使用哪个卡片组件
                    const isNFT = activity.incentiveType === 1; // NFT 模式
                    return isNFT ? (
                      <NFTActivityCard
                        key={`${activity.activityContract}-${activity.activityId ?? index}`}
                        activity={activity}
                        hideIfSettled={true}
                      />
                    ) : (
                      <ActivityCard
                        key={`${activity.activityContract}-${activity.activityId ?? index}`}
                        activity={activity}
                        hideIfSettled={true}
                      />
                    );
                  })}
                </div>
              );
            })()
          )
        )}
      </div>
    </div>
  );
}

