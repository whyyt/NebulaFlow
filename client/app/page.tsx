"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { formatEther, parseEther } from "viem";
import { FACTORY_ADDRESS, FACTORY_ABI, CHALLENGE_ABI } from "../lib/contract";

type ChallengeSummary = {
  title: string;
  description: string;
  creator: string;
  depositAmount: bigint;
  totalRounds: number;
  roundDuration: number;
  startTime: number;
  status: number;
  totalParticipants: number;
  aliveCount: number;
  winnersCount: number;
  rewardPerWinner: bigint;
  createdAt: number;
  poolBalance: bigint;
};

type TimeInfo = {
  currentRound: number;
  endTime: number;
  started: boolean;
  finished: boolean;
};

type ParticipantInfo = {
  joined: boolean;
  eliminated: boolean;
  lastCheckInRound: number;
  rewardClaimed: boolean;
  isWinner: boolean;
  hasCheckedIn: boolean;
};

const STATUS_LABEL = ["未开始", "进行中", "已结算"];

const PANEL_CARD_STYLE: CSSProperties = {
  position: "relative",
  borderRadius: 28,
  padding: 28,
  border: "1px solid rgba(148,163,184,0.22)",
  background:
    "linear-gradient(165deg, rgba(7,11,30,0.95), rgba(2,6,18,0.82))",
  boxShadow: "0 30px 80px rgba(2,6,23,0.75)",
  backdropFilter: "blur(18px)",
  overflow: "hidden",
};

const SECTION_CARD_STYLE: CSSProperties = {
  position: "relative",
  borderRadius: 30,
  padding: 32,
  border: "1px solid rgba(96,165,250,0.25)",
  background:
    "linear-gradient(180deg, rgba(4,8,20,0.92), rgba(3,7,18,0.85))",
  boxShadow: "0 40px 120px rgba(3,8,20,0.85)",
  overflow: "hidden",
};

const createGlowStyle = (radius: number, color: string): CSSProperties => ({
  position: "absolute",
  inset: 0,
  borderRadius: radius,
  background: `radial-gradient(circle at 15% 0%, ${color}, transparent 55%)`,
  opacity: 0.55,
  pointerEvents: "none",
  filter: "blur(35px)",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: challengeAddressesRaw, refetch } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getAllChallenges",
  });

  const challengeAddresses: `0x${string}`[] = useMemo(() => {
    if (!Array.isArray(challengeAddressesRaw)) return [];
    return (challengeAddressesRaw as string[]).map((item) => item as `0x${string}`);
  }, [challengeAddressesRaw]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deposit, setDeposit] = useState("0.01");
  const [totalRounds, setTotalRounds] = useState(3);
  const [roundDuration, setRoundDuration] = useState(5); // minutes
  const [startDelay, setStartDelay] = useState(1); // minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const triggerRefresh = async () => {
    setRefreshNonce((prev) => prev + 1);
    await refetch();
  };

  async function createChallenge() {
    setFormError(null);
    if (!title.trim() || !desc.trim()) {
      setFormError("请输入挑战标题与描述");
      return;
    }
    if (Number(deposit) <= 0) {
      setFormError("押金必须大于 0");
      return;
    }
    if (totalRounds <= 0) {
      setFormError("挑战天数必须大于 0");
      return;
    }
    if (roundDuration < 1) {
      setFormError("单轮时长至少 1 分钟");
      return;
    }

    try {
      setIsSubmitting(true);
      const depositWei = parseEther(deposit);
      const roundSeconds = BigInt(roundDuration * 60);
      const startDelaySeconds = BigInt(startDelay * 60);

      const hash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "createChallenge",
        args: [
          title.trim(),
          desc.trim(),
          depositWei,
          BigInt(totalRounds),
          roundSeconds,
          startDelaySeconds,
        ],
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setTitle("");
      setDesc("");
      setDeposit("0.01");
      setTotalRounds(3);
      setRoundDuration(5);
      setStartDelay(1);
      await triggerRefresh();
    } catch (error) {
      console.error(error);
      setFormError("创建失败，请检查控制台日志或钱包提示");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily:
          "'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#e8edf9",
        padding: "64px 24px 120px",
        backgroundColor: "#01030f",
        backgroundImage:
          "radial-gradient(70% 50% at 50% 0%, rgba(49,46,129,0.45), transparent), radial-gradient(40% 35% at 15% 20%, rgba(14,165,233,0.28), transparent), radial-gradient(35% 30% at 85% 8%, rgba(236,72,153,0.2), transparent), repeating-linear-gradient(0deg, rgba(148,163,184,0.06) 0px, rgba(148,163,184,0.06) 1px, transparent 1px, transparent 80px), repeating-linear-gradient(90deg, rgba(148,163,184,0.04) 0px, rgba(148,163,184,0.04) 1px, transparent 1px, transparent 80px)",
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
      }}
    >
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <Hero />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
          }}
        >
          <WalletPanel
            isConnected={isConnected}
            address={address}
            onConnect={() => connect({ connector: injected() })}
            onDisconnect={disconnect}
          />
          <CreateForm
            title={title}
            desc={desc}
            deposit={deposit}
            totalRounds={totalRounds}
            roundDuration={roundDuration}
            startDelay={startDelay}
            isConnected={isConnected}
            isSubmitting={isSubmitting || isPending}
            error={formError}
            onTitle={setTitle}
            onDesc={setDesc}
            onDeposit={setDeposit}
            onRounds={setTotalRounds}
            onRoundDuration={setRoundDuration}
            onStartDelay={setStartDelay}
            onSubmit={createChallenge}
          />
        </div>

        <ChallengeGallery
          addresses={challengeAddresses}
          account={address}
          refreshKey={refreshNonce}
          onRefetch={triggerRefresh}
        />
      </section>
    </main>
  );
}

function Hero() {
  return (
    <header
      style={{
        position: "relative",
        borderRadius: 32,
        padding: "52px 56px",
        background:
          "linear-gradient(120deg, rgba(59,130,246,0.25), rgba(236,72,153,0.22), rgba(14,165,233,0.18))",
        border: "1px solid rgba(99,102,241,0.35)",
        boxShadow: "0 40px 140px rgba(14,116,144,0.45)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "-20% -30% 10% -10%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.45), transparent 55%)",
          opacity: 0.6,
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <p style={{ letterSpacing: 4, fontSize: 13, opacity: 0.85 }}>
          HERSOLIDITY · WEB3 CHALLENGE
        </p>
        <h1
          style={{
            fontSize: 48,
            lineHeight: 1.1,
            margin: 0,
            fontWeight: 700,
            backgroundImage:
              "linear-gradient(120deg, #c7d2fe, #60a5fa, #f472b6)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            textShadow: "0 0 35px rgba(59,130,246,0.45)",
          }}
        >
          押金激励的链上挑战 Demo
        </h1>
        <p style={{ fontSize: 17, opacity: 0.9, maxWidth: 640, lineHeight: 1.7 }}>
          通过押金奖池 + 每日签到淘汰机制，展示从创建挑战、报名押金、链
          上签到、结算到 NFT 纪念章的完整流程。所有逻辑由智能合约自动执行，
          公平、透明、不可作假。
        </p>
      </div>
    </header>
  );
}

function WalletPanel({
  isConnected,
  address,
  onConnect,
  onDisconnect,
}: {
  isConnected: boolean;
  address?: `0x${string}`;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const glowStyle = createGlowStyle(28, "rgba(59,130,246,0.5)");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const walletConnected = mounted && isConnected;

  return (
    <div style={{ ...PANEL_CARD_STYLE, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={glowStyle} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>钱包状态</h2>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>
            使用浏览器钱包 (MetaMask 等) 来签名交易。
          </p>
        </div>
        {!walletConnected ? (
          <>
            <p style={{ opacity: 0.8 }}>
              一键连接后，可创建挑战、报名押金并执行签到。
            </p>
            <button
              onClick={onConnect}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "12px 22px",
                fontSize: 15,
                background:
                  "linear-gradient(120deg, rgba(59,130,246,1), rgba(236,72,153,1))",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
                boxShadow: "0 10px 30px rgba(59,130,246,0.45)",
              }}
            >
              连接钱包
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                padding: 16,
                borderRadius: 18,
                background:
                  "linear-gradient(120deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))",
                wordBreak: "break-all",
                fontSize: 14,
                border: "1px solid rgba(59,130,246,0.4)",
              }}
            >
              {address}
            </div>
            <button
              onClick={onDisconnect}
              style={{
                border: "1px solid rgba(255,255,255,0.35)",
                borderRadius: 999,
                padding: "10px 18px",
                fontSize: 14,
                background: "transparent",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              断开连接
            </button>
          </>
        )}
      </div>
    </div>
  );
}

type CreateFormProps = {
  title: string;
  desc: string;
  deposit: string;
  totalRounds: number;
  roundDuration: number;
  startDelay: number;
  isConnected: boolean;
  isSubmitting: boolean;
  error: string | null;
  onTitle: (value: string) => void;
  onDesc: (value: string) => void;
  onDeposit: (value: string) => void;
  onRounds: (value: number) => void;
  onRoundDuration: (value: number) => void;
  onStartDelay: (value: number) => void;
  onSubmit: () => void;
};

function CreateForm(props: CreateFormProps) {
  const {
    title,
    desc,
    deposit,
    totalRounds,
    roundDuration,
    startDelay,
    isConnected,
    isSubmitting,
    error,
    onTitle,
    onDesc,
    onDeposit,
    onRounds,
    onRoundDuration,
    onStartDelay,
    onSubmit,
  } = props;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const disabled = !mounted || !isConnected || isSubmitting;

  const glowStyle = createGlowStyle(28, "rgba(236,72,153,0.45)");

  return (
    <div style={{ ...PANEL_CARD_STYLE, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={glowStyle} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>创建链上挑战</h2>
          <p style={{ opacity: 0.78, fontSize: 14, marginTop: 6 }}>
            设置押金、挑战天数（轮次）与每日签到窗口，即可生成新的 Challenge
            合约。
          </p>
        </div>
        <Field label="挑战标题">
          <input
            placeholder="例如：3 天 Rust 每日打卡"
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="挑战描述">
          <textarea
            placeholder="介绍玩法与验证方式，可用于 Demo Day 讲解"
            value={desc}
            rows={3}
            onChange={(e) => onDesc(e.target.value)}
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
          />
        </Field>
        <Field label="押金（ETH）">
          <input
            type="number"
            min={0}
            step="0.001"
            value={deposit}
            onChange={(e) => onDeposit(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Field label="挑战天数">
            <input
              type="number"
              min={1}
              value={totalRounds}
              onChange={(e) => onRounds(Number(e.target.value))}
              style={inputStyle}
            />
          </Field>
          <Field label="每轮时长（分钟）">
            <input
              type="number"
              min={1}
              value={roundDuration}
              onChange={(e) => onRoundDuration(Number(e.target.value))}
              style={inputStyle}
            />
            <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.7 }}>
              每轮签到的时间长度，在该轮次结束前任意时间都可以签到
            </p>
          </Field>
          <Field label="开赛延迟（分钟）">
            <input
              type="number"
              min={0}
              value={startDelay}
              onChange={(e) => onStartDelay(Number(e.target.value))}
              style={inputStyle}
            />
          </Field>
        </div>
        {error && (
          <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>
        )}
        <button
          onClick={onSubmit}
          disabled={disabled}
          style={{
            border: "none",
            borderRadius: 18,
            padding: "14px 18px",
            fontSize: 15,
            fontWeight: 600,
            background: disabled
              ? "rgba(148,163,184,0.3)"
              : "linear-gradient(120deg, #4ade80, #22d3ee, #60a5fa)",
            color: disabled ? "rgba(15,23,42,0.8)" : "#041016",
            cursor: disabled ? "not-allowed" : "pointer",
            boxShadow: disabled ? "none" : "0 15px 35px rgba(34,211,238,0.35)",
          }}
        >
          {isSubmitting ? "创建中..." : "部署挑战"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontSize: 13,
        opacity: 0.85,
      }}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(148,163,184,0.28)",
  padding: "12px 14px",
  background: "rgba(2,6,23,0.65)",
  boxShadow: "inset 0 0 0 1px rgba(59,130,246,0.08)",
  color: "#f8fafc",
  fontSize: 14,
  outline: "none",
};

function ChallengeGallery({
  addresses,
  account,
  refreshKey,
  onRefetch,
}: {
  addresses: `0x${string}`[];
  account?: `0x${string}`;
  refreshKey: number;
  onRefetch: () => void;
}) {
  const glowStyle = createGlowStyle(30, "rgba(14,165,233,0.45)");

  return (
    <section style={{ ...SECTION_CARD_STYLE, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={glowStyle} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>链上挑战列表</h2>
            <p style={{ opacity: 0.7, margin: 0, fontSize: 14 }}>
              当前已部署合约：{addresses.length}
            </p>
          </div>
          <button
            onClick={onRefetch}
            style={{
              borderRadius: 999,
              padding: "10px 18px",
              background: "rgba(59,130,246,0.18)",
              border: "1px solid rgba(59,130,246,0.55)",
              color: "#bfdbfe",
              cursor: "pointer",
              fontSize: 13,
              boxShadow: "0 10px 30px rgba(59,130,246,0.35)",
            }}
          >
            手动刷新
          </button>
        </div>

        {addresses.length === 0 ? (
          <div
            style={{
              padding: 36,
              borderRadius: 22,
              border: "1px dashed rgba(148,163,184,0.35)",
              textAlign: "center",
              color: "rgba(226,232,240,0.8)",
            }}
          >
            暂无挑战，快来率先创建吧！
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {addresses.map((addr) => (
              <ChallengeCard
                key={addr + refreshKey}
                challengeAddress={addr}
                account={account}
                onActionComplete={onRefetch}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ChallengeCard({
  challengeAddress,
  account,
  onActionComplete,
}: {
  challengeAddress: `0x${string}`;
  account?: `0x${string}`;
  onActionComplete: () => void;
}) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { address: currentAccount } = useAccount();

  const [summary, setSummary] = useState<ChallengeSummary | null>(null);
  const [timeInfo, setTimeInfo] = useState<TimeInfo | null>(null);
  const [participant, setParticipant] = useState<ParticipantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = () => setRefreshNonce((prev) => prev + 1);

  useEffect(() => {
    if (!publicClient) return;
    let disposed = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const calls: Promise<unknown>[] = [
          publicClient.readContract({
            address: challengeAddress,
            abi: CHALLENGE_ABI,
            functionName: "getSummary",
          }),
          publicClient.readContract({
            address: challengeAddress,
            abi: CHALLENGE_ABI,
            functionName: "getTimeInfo",
          }),
        ];
        if (account) {
          calls.push(
            publicClient.readContract({
              address: challengeAddress,
              abi: CHALLENGE_ABI,
              functionName: "getParticipantInfo",
              args: [account],
            })
          );
        }
        const results = await Promise.all(calls);
        if (disposed) return;
        const summaryData = results[0];
        const timeData = results[1];
        const participantData = account ? results[2] : null;

        setSummary({
          title: summaryData[0],
          description: summaryData[1],
          creator: summaryData[2],
          depositAmount: summaryData[3],
          totalRounds: Number(summaryData[4]),
          roundDuration: Number(summaryData[5]),
          startTime: Number(summaryData[6]),
          status: Number(summaryData[7]),
          totalParticipants: Number(summaryData[8]),
          aliveCount: Number(summaryData[9]),
          winnersCount: Number(summaryData[10]),
          rewardPerWinner: summaryData[11],
          createdAt: Number(summaryData[12]),
          poolBalance: summaryData[13],
        });

        setTimeInfo({
          currentRound: Number(timeData[0]),
          endTime: Number(timeData[1]),
          started: Boolean(timeData[2]),
          finished: Boolean(timeData[3]),
        });

        if (participantData) {
          setParticipant({
            joined: Boolean(participantData[0]),
            eliminated: Boolean(participantData[1]),
            lastCheckInRound: Number(participantData[2]),
            rewardClaimed: Boolean(participantData[3]),
            isWinner: Boolean(participantData[4]),
            hasCheckedIn: Boolean(participantData[5]),
          });
        } else {
          setParticipant(null);
        }
      } catch (err) {
        console.error(err);
        if (!disposed) {
          setError("读取挑战数据失败");
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    fetchData();
    const timer = setInterval(fetchData, 15000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [publicClient, challengeAddress, account, refreshNonce]);

  const statusLabel = summary ? STATUS_LABEL[summary.status] ?? "未知" : "加载中";
  const canJoin =
    summary &&
    summary.status === 0 &&
    !loading &&
    (!participant || !participant.joined);
  const canStart =
    summary &&
    summary.status === 0 &&
    account &&
    account.toLowerCase() === summary.creator.toLowerCase();
  const canCheckIn =
    summary &&
    summary.status === 1 &&
    participant &&
    participant.joined &&
    !participant.eliminated &&
    (!timeInfo || !timeInfo.finished);
  const canSettle =
    summary &&
    timeInfo &&
    timeInfo.finished &&
    summary.status !== 2;
  const canForceSettle =
    summary &&
    summary.status === 1 &&
    account &&
    account.toLowerCase() === summary.creator.toLowerCase();
  const canClaim =
    summary &&
    summary.status === 2 &&
    participant &&
    participant.isWinner &&
    !participant.rewardClaimed;

  async function handleAction(functionName: string, overrides?: { value?: bigint }) {
    try {
      setWorking(functionName);
      setError(null);
      
      // 先进行模拟调用，提前发现错误
      if (publicClient && currentAccount) {
        try {
          await publicClient.simulateContract({
            account: currentAccount,
            address: challengeAddress,
            abi: CHALLENGE_ABI,
            functionName,
            ...(overrides ?? {}),
          });
        } catch (simulateErr: any) {
          // 模拟调用失败，提取错误信息
          let simulateError = "操作无法执行";
          if (simulateErr?.shortMessage) {
            simulateError = simulateErr.shortMessage;
          } else if (simulateErr?.message) {
            simulateError = simulateErr.message;
          } else if (simulateErr?.cause?.data) {
            const data = simulateErr.cause.data;
            if (typeof data === 'string') {
              const revertMatch = data.match(/revert\s+(.+?)(?:\s|$)/i);
              if (revertMatch) {
                simulateError = revertMatch[1];
              }
            }
          }
          
          // 转换为中文提示
          if (simulateError.includes('NOT_ACTIVE')) {
            simulateError = "挑战尚未开始或已结束";
          } else if (simulateError.includes('NOT_PARTICIPANT')) {
            simulateError = "请先报名参加挑战";
          } else if (simulateError.includes('ELIMINATED')) {
            simulateError = "您已被淘汰，无法签到";
          } else if (simulateError.includes('CHALLENGE_FINISHED')) {
            simulateError = "挑战已结束";
          } else if (simulateError.includes('MISSED_FIRST_ROUND')) {
            simulateError = "您错过了第一轮签到";
          } else if (simulateError.includes('ALREADY_CHECKED')) {
            simulateError = "您已经签到过当前轮次";
          } else if (simulateError.includes('SKIPPED_ROUND')) {
            simulateError = "您跳过了轮次，无法签到";
          } else if (simulateError.includes('MISSED_PREVIOUS_ROUND')) {
            simulateError = "您错过了上一轮签到，已被淘汰";
          } else if (simulateError.includes('revert')) {
            simulateError = "操作失败: " + simulateError;
          }
          
          setError(simulateError);
          setWorking(null);
          return;
        }
      }
      
      const hash = await writeContractAsync({
        address: challengeAddress,
        abi: CHALLENGE_ABI,
        functionName,
        ...(overrides ?? {}),
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      refresh();
      onActionComplete();
    } catch (err: any) {
      console.error("交易错误详情:", err);
      let errorMessage = "交易执行失败，请检查钱包提示";
      
      // 尝试提取更详细的错误信息
      if (err?.shortMessage) {
        errorMessage = err.shortMessage;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.reason) {
        errorMessage = err.reason;
      } else if (err?.data?.message) {
        errorMessage = err.data.message;
      }
      
      // 处理 viem 的 ContractFunctionExecutionError
      if (err?.cause) {
        const cause = err.cause;
        // 尝试从 cause 中提取错误信息
        if (cause?.data) {
          const data = cause.data;
          if (typeof data === 'string') {
            // 尝试匹配 revert reason
            const revertMatch = data.match(/revert\s+(.+?)(?:\s|$)/i);
            if (revertMatch) {
              errorMessage = `合约执行失败: ${revertMatch[1]}`;
            } else if (data.includes('revert')) {
              errorMessage = "合约执行被回退，请检查是否满足签到条件";
            }
          }
        }
        // 尝试从 cause.shortMessage 获取
        if (cause?.shortMessage && !errorMessage.includes('合约')) {
          errorMessage = cause.shortMessage;
        }
      }
      
      // 常见错误的中文提示
      if (errorMessage.includes('NOT_ACTIVE')) {
        errorMessage = "挑战尚未开始或已结束";
      } else if (errorMessage.includes('NOT_PARTICIPANT')) {
        errorMessage = "请先报名参加挑战";
      } else if (errorMessage.includes('ELIMINATED')) {
        errorMessage = "您已被淘汰，无法签到";
      } else if (errorMessage.includes('CHALLENGE_FINISHED')) {
        errorMessage = "挑战已结束";
      } else if (errorMessage.includes('MISSED_FIRST_ROUND')) {
        errorMessage = "您错过了第一轮签到";
      } else if (errorMessage.includes('ALREADY_CHECKED')) {
        errorMessage = "您已经签到过当前轮次";
      } else if (errorMessage.includes('SKIPPED_ROUND')) {
        errorMessage = "您跳过了轮次，无法签到";
      } else if (errorMessage.includes('MISSED_PREVIOUS_ROUND')) {
        errorMessage = "您错过了上一轮签到，已被淘汰";
      }
      
      setError(errorMessage);
    } finally {
      setWorking(null);
    }
  }

  const cardGlow = createGlowStyle(24, "rgba(236,72,153,0.4)");

  return (
    <article
      style={{
        borderRadius: 24,
        padding: 24,
        border: "1px solid transparent",
        backgroundImage:
          "linear-gradient(160deg, rgba(4,8,20,0.95), rgba(3,6,17,0.92)) , linear-gradient(140deg, rgba(59,130,246,0.45), rgba(236,72,153,0.4))",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
        boxShadow: "0 25px 60px rgba(3,7,18,0.85)",
        minHeight: 320,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        <div style={cardGlow} />
      </div>
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: 1, opacity: 0.7 }}>
          {challengeAddress}
        </p>
        {loading ? (
          <p style={{ margin: "12px 0", opacity: 0.6 }}>读取链上数据中...</p>
        ) : summary ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>{summary.title}</h3>
              <span
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  background:
                    summary.status === 0
                      ? "linear-gradient(120deg, rgba(148,163,184,0.2), rgba(148,163,184,0.05))"
                      : summary.status === 1
                      ? "linear-gradient(120deg, rgba(74,222,128,0.25), rgba(16,185,129,0.15))"
                      : "linear-gradient(120deg, rgba(14,165,233,0.2), rgba(14,165,233,0.08))",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {statusLabel}
              </span>
            </div>
            <p style={{ margin: 0, opacity: 0.78, minHeight: 40 }}>{summary.description}</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              <InfoBlock
                label="押金 / 奖池"
                value={`${formatEther(summary.depositAmount)} ETH / ${formatEther(
                  summary.poolBalance
                )} ETH`}
              />
              <InfoBlock
                label="参赛 / 存活"
                value={`${summary.totalParticipants} 人 / ${summary.aliveCount} 人`}
              />
              <InfoBlock
                label="当前轮次"
                value={
                  timeInfo
                    ? `${Math.min(timeInfo.currentRound + 1, summary.totalRounds)} / ${
                        summary.totalRounds
                      }`
                    : "-"
                }
              />
              <InfoBlock
                label="挑战截止"
                value={timeInfo ? formatTime(timeInfo.endTime) : "-"}
              />
            </div>

          {participant && (
            <div
              style={{
                padding: 12,
                borderRadius: 16,
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.2)",
                fontSize: 13,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <strong>我的状态</strong>
              <span>
                {participant.joined ? "已报名" : "未报名"} ·{" "}
                {participant.eliminated
                  ? "已淘汰"
                  : participant.hasCheckedIn
                  ? `最近签到轮次 #${participant.lastCheckInRound + 1}`
                  : "尚未签到"}
              </span>
              {summary.status === 2 && (
                <span>
                  {participant.isWinner
                    ? participant.rewardClaimed
                      ? "奖励已领取"
                      : `可领取 ${formatEther(summary.rewardPerWinner)} ETH`
                    : "本次未获奖"}
                </span>
              )}
            </div>
          )}

            {error && (
              <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 6,
              }}
            >
              {canStart && (
                <ActionButton
                  label="开始挑战"
                  disabled={!canStart}
                  busy={working === "forceStart"}
                  onClick={() => {
                    void handleAction("forceStart");
                  }}
                />
              )}
              <ActionButton
                label="报名押金"
                disabled={!canJoin}
                busy={working === "joinChallenge"}
                onClick={() => {
                  if (!summary) return;
                  void handleAction("joinChallenge", { value: summary.depositAmount });
                }}
              />
              <ActionButton
                label="每日签到"
                disabled={!canCheckIn}
                busy={working === "checkIn"}
                onClick={() => {
                  void handleAction("checkIn");
                }}
              />
              {/* 到达结束时间后，任何人都可以触发结算 */}
              <ActionButton
                label="自动结算"
                disabled={!canSettle}
                busy={working === "settle"}
                onClick={() => {
                  void handleAction("settle");
                }}
              />
              {/* 只有 creator 可以在挑战进行中强制结算 */}
              {canForceSettle && (
                <ActionButton
                  label="强制结算"
                  disabled={!canForceSettle}
                  busy={working === "forceSettle"}
                  onClick={() => {
                    void handleAction("forceSettle");
                  }}
                />
              )}
              <ActionButton
                label="领取奖励"
                disabled={!canClaim}
                busy={working === "claimReward"}
                onClick={() => {
                  void handleAction("claimReward");
                }}
              />
              <ActionButton label="刷新数据" disabled={false} onClick={refresh} />
            </div>
          </>
        ) : (
          <p style={{ margin: "12px 0", opacity: 0.6 }}>暂无详情</p>
        )}
      </div>
    </article>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.25)",
        background:
          "linear-gradient(160deg, rgba(15,23,42,0.65), rgba(2,6,23,0.7))",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        boxShadow: "inset 0 0 20px rgba(15,118,255,0.08)",
      }}
    >
      <span style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.5 }}>{label}</span>
      <strong style={{ fontSize: 14 }}>{value}</strong>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  busy,
  onClick,
}: {
  label: string;
  disabled: boolean;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 999,
        padding: "10px 18px",
        fontSize: 13,
        background: disabled
          ? "rgba(148,163,184,0.2)"
          : "linear-gradient(130deg, rgba(139,92,246,0.85), rgba(14,165,233,0.85))",
        color: disabled ? "rgba(15,23,42,0.6)" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 10px 30px rgba(59,130,246,0.35)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {busy ? "执行中..." : label}
    </button>
  );
}

function formatTime(timestamp: number) {
  if (!timestamp) return "-";
  const date = new Date(timestamp * 1000);
  return TIME_FORMATTER.format(date);
}