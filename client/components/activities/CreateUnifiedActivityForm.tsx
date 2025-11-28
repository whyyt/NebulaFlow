"use client";

import { useState, useEffect, useRef } from "react";
import { IncentiveType } from "../../lib/types";

interface UnifiedActivityFormData {
  title: string;
  description: string;
  depositAmount: string;
  totalRounds: number;
  maxParticipants: number;
  isPublic: boolean;
}

interface CreateUnifiedActivityFormProps {
  onSubmit: (data: UnifiedActivityFormData, mode: "deposit" | "nft") => Promise<void>;
  isSubmitting: boolean;
  address?: string;
}

// 检测标题中是否包含天数（如"7天"、"1天"等），并提取天数
function detectActivityModeAndDays(title: string): { mode: "deposit" | "nft"; days?: number } {
  if (!title || title.trim() === "") {
    return { mode: "nft" }; // 默认 NFT 模式
  }
  
  // 匹配模式：数字 + "天"（如"7天"、"1天"、"30天"等）
  const dayPattern = /(\d+)\s*天/;
  const match = title.match(dayPattern);
  
  if (match && match[1]) {
    const days = parseInt(match[1], 10);
    if (!isNaN(days) && days > 0) {
      return { mode: "deposit", days };
    }
  }
  
  return { mode: "nft" };
}

export function CreateUnifiedActivityForm({ onSubmit, isSubmitting, address }: CreateUnifiedActivityFormProps) {
  const [mounted, setMounted] = useState(false);
  
  const [formData, setFormData] = useState<UnifiedActivityFormData>({
    title: "",
    description: "",
    depositAmount: "",
    totalRounds: 7,
    maxParticipants: 10,
    isPublic: true
  });
  
  // 用于控制输入框显示的值（允许为空字符串）
  const [totalRoundsInput, setTotalRoundsInput] = useState<string>("");
  const [maxParticipantsInput, setMaxParticipantsInput] = useState<string>("");
  const [depositAmountInput, setDepositAmountInput] = useState<string>("");
  
  const [error, setError] = useState<string | null>(null);
  
  // 用于跟踪用户是否在编辑标题输入框
  const [isTitleFocused, setIsTitleFocused] = useState<boolean>(false);
  
  // 用于存储标题失焦时的最终值（用于模式检测和天数填充）
  const [finalTitle, setFinalTitle] = useState<string>("");
  
  // 根据最终标题（失焦后的值）自动检测模式和天数
  const { mode: activityMode, days: detectedDays } = detectActivityModeAndDays(finalTitle);
  const isDepositMode = activityMode === "deposit";
  
  // 当检测到天数时，自动填充到活动天数输入框
  // 使用 useRef 来跟踪上次自动填充的标题和天数
  const lastAutoFilledTitleRef = useRef<string>("");
  const lastAutoFilledDaysRef = useRef<number | null>(null);
  const userManuallyEditedRef = useRef<boolean>(false);
  
  // 只在标题失焦后（finalTitle变化）才更新模式和天数
  useEffect(() => {
    if (finalTitle === "") {
      // 标题为空时，清空活动天数输入框
      setTotalRoundsInput("");
      setFormData(prev => ({ ...prev, totalRounds: 7 })); // 保持默认值，但输入框显示为空
      lastAutoFilledTitleRef.current = "";
      lastAutoFilledDaysRef.current = null;
      userManuallyEditedRef.current = false;
      return;
    }
    
    if (isDepositMode && detectedDays !== undefined && detectedDays > 0) {
      const titleChanged = lastAutoFilledTitleRef.current !== finalTitle;
      const daysChanged = lastAutoFilledDaysRef.current !== detectedDays;
      
      // 如果标题变化或检测到的天数变化，则自动填充
      if (titleChanged || daysChanged) {
        // 优先检查：如果用户没有手动编辑过，直接填充
        if (!userManuallyEditedRef.current) {
          // 用户没有手动编辑，直接自动填充
          setTotalRoundsInput(String(detectedDays));
          setFormData(prev => ({ ...prev, totalRounds: detectedDays }));
          lastAutoFilledTitleRef.current = finalTitle;
          lastAutoFilledDaysRef.current = detectedDays;
        } else {
          // 用户手动编辑过，但如果标题中的天数变了，也更新（标题优先）
          const currentDays = totalRoundsInput === "" ? null : parseInt(totalRoundsInput, 10);
          if (currentDays !== detectedDays) {
            setTotalRoundsInput(String(detectedDays));
            setFormData(prev => ({ ...prev, totalRounds: detectedDays }));
            lastAutoFilledTitleRef.current = finalTitle;
            lastAutoFilledDaysRef.current = detectedDays;
          }
        }
      }
    } else {
      // 如果切换到 NFT 模式，清除自动填充标记，但不清空活动天数（保留用户可能已输入的值）
      lastAutoFilledTitleRef.current = "";
      lastAutoFilledDaysRef.current = null;
    }
  }, [finalTitle, isDepositMode, detectedDays]); // 依赖最终标题（失焦后的值）和检测到的天数

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#e8edf9" }}>
        加载中...
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizeToString = (value: any): string => {
      if (value === null || value === undefined) return "";
      if (typeof value === "number") return String(value);
      if (typeof value === "string") return value.trim();
      return String(value).trim();
    };

    const normalizeToNumber = (value: any): number => {
      if (value === null || value === undefined || value === "") return 0;
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    };

    const title = normalizeToString(formData.title);
    const description = normalizeToString(formData.description);
    
    if (!title) {
      setError("请输入活动标题");
      return;
    }
    if (!description) {
      setError("请输入活动描述");
      return;
    }

    // 押金模式和 NFT 模式都需要验证活动天数
    const totalRounds = normalizeToNumber(totalRoundsInput || formData.totalRounds);
    const maxParticipants = normalizeToNumber(maxParticipantsInput || formData.maxParticipants);
    
    // 验证活动天数（押金模式和 NFT 模式都需要）
    if (totalRounds <= 0) {
      setError("请输入活动天数");
      return;
    }
    if (maxParticipants <= 0) {
      setError("请输入最大参与人数");
      return;
    }

    // 押金模式需要验证押金金额
    if (isDepositMode) {
      const depositAmount = normalizeToString(depositAmountInput);
      if (!depositAmount || depositAmount.trim() === "") {
        setError("请输入押金金额");
        return;
      }
      const depositAmountNum = parseFloat(depositAmount);
      if (isNaN(depositAmountNum) || depositAmountNum <= 0) {
        setError("请输入有效的押金金额");
        return;
      }
    }

    const submitData: UnifiedActivityFormData = {
      title,
      description,
      depositAmount: isDepositMode ? normalizeToString(depositAmountInput) : "",
      totalRounds,
      maxParticipants,
      isPublic: true
    };

    try {
      await onSubmit(submitData, activityMode);
    } catch (err: any) {
      setError(err.message || "创建活动失败");
    }
  };

  // 生成钱包头像
  const getWalletAvatar = (addr: string) => {
    if (!addr) return "";
    return `https://effigy.im/a/${addr}.svg`;
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 钱包地址显示 */}
      {address && (
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
            活动创建者
          </label>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.28)",
            background: "rgba(2,6,23,0.65)",
          }}>
            <img
              src={getWalletAvatar(address)}
              alt="wallet avatar"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="%23${address.slice(2, 8)}"/></svg>`;
              }}
            />
            <span style={{ color: "#f8fafc", fontSize: 14 }}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
        </div>
      )}

      {/* 活动标题 */}
      <div>
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          活动标题 *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => {
            const value = String(e.target.value);
            setFormData(prev => ({ ...prev, title: value }));
          }}
          onFocus={() => {
            setIsTitleFocused(true);
          }}
          onBlur={(e) => {
            setIsTitleFocused(false);
            // 失焦时，更新最终标题用于模式检测和天数填充
            const finalValue = String(e.target.value).trim();
            setFinalTitle(finalValue);
          }}
          placeholder="例如：7天挑战活动 或 NFT 艺术创作"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.28)",
            background: "rgba(2,6,23,0.65)",
            color: "#f8fafc",
            fontSize: 14
          }}
        />
        {/* 模式提示 - 仅在标题不为空且不在编辑状态时显示彩色框 */}
        {finalTitle && finalTitle.trim() !== "" && !isTitleFocused && (
          <div style={{
            marginTop: 8,
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            background: isDepositMode 
              ? "rgba(34, 211, 238, 0.2)" 
              : "rgba(167, 139, 250, 0.2)",
            border: isDepositMode
              ? "1px solid rgba(34, 211, 238, 0.3)"
              : "1px solid rgba(167, 139, 250, 0.3)",
            color: isDepositMode ? "#22d3ee" : "#a78bfa",
          }}>
            {isDepositMode ? "💰 检测到押金奖池模式" : "🖼️ 检测到 NFT 模式"}
          </div>
        )}
      </div>

      {/* 活动描述 */}
      <div>
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          活动描述 *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => {
            const value = String(e.target.value);
            setFormData(prev => ({ ...prev, description: value }));
          }}
          placeholder="请输入活动描述"
          rows={4}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.28)",
            background: "rgba(2,6,23,0.65)",
            color: "#f8fafc",
            fontSize: 14,
            resize: "vertical"
          }}
        />
      </div>

      {/* 押金金额 - 仅在押金模式显示 */}
      {isDepositMode && (
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
            押金金额 (ETH) *
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={depositAmountInput}
            onChange={(e) => {
              const value = e.target.value;
              setDepositAmountInput(value);
              setFormData(prev => ({ ...prev, depositAmount: value }));
            }}
            placeholder="请输入金额"
            className="no-spinner"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.28)",
              background: "rgba(2,6,23,0.65)",
              color: "#f8fafc",
              fontSize: 14
            }}
            onWheel={(e) => {
              (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
      )}

      {/* 活动天数和最大参与人数 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {/* 活动天数 - 押金模式和 NFT 模式都显示 */}
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
            活动天数 *
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={totalRoundsInput}
            onChange={(e) => {
              const value = e.target.value;
              setTotalRoundsInput(value);
              // 标记用户手动编辑过
              userManuallyEditedRef.current = true;
              if (value !== "") {
                const numValue = parseInt(value);
                if (!isNaN(numValue) && numValue > 0) {
                  setFormData(prev => ({ ...prev, totalRounds: numValue }));
                }
              } else {
                // 如果输入为空，保持 formData 中的默认值，但输入框显示为空
                setFormData(prev => ({ ...prev, totalRounds: 7 }));
              }
            }}
            placeholder="请输入活动天数"
            className="no-spinner"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.28)",
              background: "rgba(2,6,23,0.65)",
              color: "#f8fafc",
              fontSize: 14
            }}
            onWheel={(e) => {
              (e.target as HTMLInputElement).blur();
            }}
          />
          <div style={{ 
            marginTop: 4, 
            fontSize: 12, 
            color: "rgba(148, 163, 184, 0.7)",
            fontStyle: "italic"
          }}>
            {totalRoundsInput && Number(totalRoundsInput) > 0 
              ? `输入${totalRoundsInput}表示第${totalRoundsInput}天24:00结束`
              : "输入1表示当日24:00结束，输入2表示第二天24:00结束，以此类推"}
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
            最大参与人数 *
          </label>
          <input
            type="number"
            min="1"
            max="10000"
            value={maxParticipantsInput}
            onChange={(e) => {
              const value = e.target.value;
              setMaxParticipantsInput(value);
              if (value !== "") {
                const numValue = parseInt(value);
                if (!isNaN(numValue) && numValue > 0) {
                  setFormData(prev => ({ ...prev, maxParticipants: numValue }));
                }
              } else {
                setFormData(prev => ({ ...prev, maxParticipants: 0 }));
              }
            }}
            placeholder="请输入最大参与人数"
            className="no-spinner"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.28)",
              background: "rgba(2,6,23,0.65)",
              color: "#f8fafc",
              fontSize: 14
            }}
            onWheel={(e) => { (e.target as HTMLInputElement).blur(); }}
          />
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div style={{
          padding: 12,
          borderRadius: 8,
          background: "rgba(239, 68, 68, 0.2)",
          color: "#fca5a5",
          fontSize: 14,
          border: "1px solid rgba(239, 68, 68, 0.5)"
        }}>
          {error}
        </div>
      )}

      {/* 提交按钮 - 仅在标题不为空且不在编辑状态时显示 */}
      {finalTitle && finalTitle.trim() !== "" && !isTitleFocused && (
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "14px 28px",
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.28)",
            background: isSubmitting
              ? "rgba(59, 130, 246, 0.2)"
              : isDepositMode
                ? "linear-gradient(135deg, rgba(34, 211, 238, 0.4), rgba(59, 130, 246, 0.4))"
                : "linear-gradient(135deg, rgba(120, 119, 198, 0.4), rgba(236, 72, 153, 0.4))",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 600,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.7 : 1,
            transition: "all 0.3s",
            marginTop: 10,
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.transform = "translateY(-2px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          {isSubmitting ? "创建中..." : `创建${isDepositMode ? "押金奖池" : "NFT"}活动`}
        </button>
      )}
    </form>
  );
}

// 确保组件正确导出
export default CreateUnifiedActivityForm;

