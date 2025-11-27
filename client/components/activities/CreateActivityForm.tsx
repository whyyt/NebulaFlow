"use client";

import { useState, useEffect } from "react";
import { ActivityFormData, IncentiveType, validateActivityForm } from "../../lib/types";

interface CreateActivityFormProps {
  onSubmit: (data: ActivityFormData) => Promise<void>;
  isSubmitting: boolean;
  address?: string; // 钱包地址
}

export function CreateActivityForm({ onSubmit, isSubmitting, address }: CreateActivityFormProps) {
  const [mounted, setMounted] = useState(false);
  
  const [formData, setFormData] = useState<ActivityFormData>({
    incentiveType: IncentiveType.DepositPool,
    creatorName: "",
    title: "",
    description: "",
    depositAmount: "0.01",
    totalRounds: 7, // 默认值，但输入框允许为空
    maxParticipants: 10,
    isPublic: true
  });
  
  // 用于控制输入框显示的值（允许为空字符串）
  const [totalRoundsInput, setTotalRoundsInput] = useState<string>("");
  const [maxParticipantsInput, setMaxParticipantsInput] = useState<string>("");
  const [depositAmountInput, setDepositAmountInput] = useState<string>("");

  const [error, setError] = useState<string | null>(null);

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

    // 确保所有字段都是字符串类型
    // 使用钱包地址作为 creatorName（如果地址存在）
    const creatorName = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
    
    const submitData: ActivityFormData = {
      ...formData,
      incentiveType: IncentiveType.DepositPool,
      creatorName: creatorName, // 使用钱包地址
      title: normalizeToString(formData.title),
      description: normalizeToString(formData.description),
      depositAmount: depositAmountInput === "" ? "" : String(depositAmountInput),
      totalRounds: totalRoundsInput === "" ? 7 : (Number(totalRoundsInput) || 7),
      maxParticipants: maxParticipantsInput === "" ? 10 : (Number(maxParticipantsInput) || 10),
      isPublic: Boolean(formData.isPublic)
    };

    

    const validationError = validateActivityForm(submitData);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await onSubmit(submitData);
    } catch (err: any) {
      setError(err.message || "创建活动失败");
    }
  };

  // 生成钱包头像（基于地址的简单哈希）
  const getWalletAvatar = (addr: string) => {
    if (!addr) return "";
    // 使用地址生成一个简单的头像URL（可以使用 ENS 头像服务或生成基于地址的图片）
    // 这里使用一个简单的占位符，实际可以使用 https://effigy.im/a/ 或其他服务
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
                // 如果头像加载失败，使用默认头像
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
          placeholder="例如：7天Solidity学习挑战"
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
          placeholder="详细描述活动内容、规则和要求"
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

      {/* 押金金额 */}
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
            // 防止鼠标滚轮改变数字
            (e.target as HTMLInputElement).blur();
          }}
        />
      </div>

      {/* 活动天数和最大参与人数 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
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
              // 如果输入为空，保持 formData.totalRounds 为默认值 7（提交时会使用）
              if (value !== "") {
                const numValue = parseInt(value);
                if (!isNaN(numValue) && numValue > 0) {
                  setFormData(prev => ({ ...prev, totalRounds: numValue }));
                }
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
              // 防止鼠标滚轮改变数字
              (e.target as HTMLInputElement).blur();
            }}
          />
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
              // 如果输入为空，保持 formData.maxParticipants 为默认值 10（提交时会使用）
              if (value !== "") {
                const numValue = parseInt(value);
                if (!isNaN(numValue) && numValue > 0) {
                  setFormData(prev => ({ ...prev, maxParticipants: numValue }));
                }
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
            onWheel={(e) => {
              // 防止鼠标滚轮改变数字
              (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 13 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          padding: "14px 24px",
          borderRadius: 12,
          border: "none",
          background: isSubmitting
            ? "rgba(148,163,184,0.3)"
            : "linear-gradient(120deg, #4ade80, #22d3ee, #60a5fa)",
          color: isSubmitting ? "rgba(15,23,42,0.6)" : "#041016",
          fontSize: 15,
          fontWeight: 600,
          cursor: isSubmitting ? "not-allowed" : "pointer",
          boxShadow: isSubmitting ? "none" : "0 15px 35px rgba(34,211,238,0.35)"
        }}
      >
        {isSubmitting ? "创建中..." : "创建活动"}
      </button>
    </form>
  );
}

