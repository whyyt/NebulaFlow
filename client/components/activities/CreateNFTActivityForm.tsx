"use client";

import { useState, useEffect } from "react";

interface NFTActivityFormData {
  title: string;
  description: string;
  totalRounds: number;
  maxParticipants: number;
}

interface CreateNFTActivityFormProps {
  onSubmit: (data: NFTActivityFormData) => Promise<void>;
  isSubmitting: boolean;
  address?: string; // 钱包地址
}

export function CreateNFTActivityForm({ onSubmit, isSubmitting, address }: CreateNFTActivityFormProps) {
  const [mounted, setMounted] = useState(false);
  
  const [formData, setFormData] = useState<NFTActivityFormData>({
    title: "",
    description: "",
    totalRounds: 7,
    maxParticipants: 10,
  });
  
  // 用于控制输入框显示的值（允许为空字符串）
  const [totalRoundsInput, setTotalRoundsInput] = useState<string>("");
  const [maxParticipantsInput, setMaxParticipantsInput] = useState<string>("");

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
      return String(value).trim();
    };

    const normalizeToNumber = (value: any): number => {
      if (value === null || value === undefined || value === "") return 0;
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    };

    const submitData: NFTActivityFormData = {
      title: normalizeToString(formData.title),
      description: normalizeToString(formData.description),
      totalRounds: normalizeToNumber(totalRoundsInput || formData.totalRounds),
      maxParticipants: normalizeToNumber(maxParticipantsInput || formData.maxParticipants),
    };

    // 验证
    if (!submitData.title) {
      setError("请输入活动标题");
      return;
    }
    if (!submitData.description) {
      setError("请输入活动描述");
      return;
    }
    if (submitData.totalRounds <= 0) {
      setError("请输入活动天数");
      return;
    }
    if (submitData.maxParticipants <= 0) {
      setError("请输入最大参与人数");
      return;
    }

    try {
      await onSubmit(submitData);
    } catch (err: any) {
      setError(err.message || "提交失败");
    }
  };

  // 生成钱包头像（基于地址的简单哈希）
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
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="请输入活动标题"
          required
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
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="请输入活动描述"
          required
          rows={4}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.28)",
            background: "rgba(2,6,23,0.65)",
            color: "#f8fafc",
            fontSize: 14,
            resize: "vertical",
            fontFamily: "inherit"
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
          padding: "12px 16px",
          borderRadius: 8,
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "#fca5a5",
          fontSize: 13
        }}>
          {error}
        </div>
      )}

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          padding: "14px 24px",
          borderRadius: 12,
          border: "none",
          background: isSubmitting
            ? "rgba(148, 163, 184, 0.3)"
            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#ffffff",
          fontSize: 15,
          fontWeight: 600,
          cursor: isSubmitting ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          opacity: isSubmitting ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!isSubmitting) {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 16px rgba(102, 126, 234, 0.4)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isSubmitting) {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }
        }}
      >
        {isSubmitting ? "创建中..." : "创建活动"}
      </button>
    </form>
  );
}

// 确保组件正确导出
export default CreateNFTActivityForm;

