"use client";

import { useState, useEffect } from "react";
import { DepositChallengeFormData, validateDepositChallengeForm } from "../../lib/types";

interface CreateActivityFormProps {
  onSubmit: (data: DepositChallengeFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateActivityForm({ onSubmit, isSubmitting }: CreateActivityFormProps) {
  const [mounted, setMounted] = useState(false);
  
  const [formData, setFormData] = useState<DepositChallengeFormData>({
    title: "",
    description: "",
    depositAmount: "0.01",
    totalRounds: 7,
    maxParticipants: 10,
    isPublic: true
  });

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
    const submitData: DepositChallengeFormData = {
      ...formData,
      title: normalizeToString(formData.title),
      description: normalizeToString(formData.description),
      depositAmount: String(formData.depositAmount || "0.01"),
      totalRounds: Number(formData.totalRounds) || 7,
      maxParticipants: Number(formData.maxParticipants) || 10,
      isPublic: Boolean(formData.isPublic)
    };

    // 调试：验证提交数据
    console.log("=== 表单提交数据验证 ===");
    console.log("原始 formData:", formData);
    console.log("提交 submitData:", submitData);
    console.log("数据类型:", {
      title: { value: submitData.title, type: typeof submitData.title },
      description: { value: submitData.description, type: typeof submitData.description }
    });

    const validationError = validateDepositChallengeForm(submitData);
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

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
          value={formData.depositAmount}
          onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))}
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

      {/* 挑战天数和最大参与人数 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
            挑战天数 *
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={formData.totalRounds}
            onChange={(e) => setFormData(prev => ({ ...prev, totalRounds: parseInt(e.target.value) || 0 }))}
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

        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
            最大参与人数 *
          </label>
          <input
            type="number"
            min="1"
            max="10000"
            value={formData.maxParticipants}
            onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 0 }))}
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

