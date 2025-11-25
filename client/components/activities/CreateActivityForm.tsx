"use client";

import { useState, useEffect } from "react";
import { ActivityCategory, IncentiveType, CreateActivityFormData, validateActivityForm, CATEGORY_RULES } from "../../lib/types";

interface CreateActivityFormProps {
  onSubmit: (data: CreateActivityFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateActivityForm({ onSubmit, isSubmitting }: CreateActivityFormProps) {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState<CreateActivityFormData>({
    category: ActivityCategory.Lifestyle,
    incentiveType: IncentiveType.DepositPool,
    title: "",
    description: "",
    depositAmount: "0.01",
    totalRounds: 7,
    maxParticipants: 10,
    nftName: "",
    nftSymbol: "",
    baseTokenURI: "",
    isPublic: false
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

  const categoryRules = CATEGORY_RULES[formData.category];
  const allowedIncentives = categoryRules.allowedIncentives;

  const handleCategoryChange = (category: ActivityCategory) => {
    const rules = CATEGORY_RULES[category];
    setFormData(prev => ({
      ...prev,
      category,
      incentiveType: rules.allowedIncentives[0], // 自动选择第一个允许的激励类型
      isPublic: rules.mustPublic // 自动设置公开状态
    }));
  };

  const handleIncentiveChange = (incentiveType: IncentiveType) => {
    setFormData(prev => ({ ...prev, incentiveType }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateActivityForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || "创建活动失败");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 活动类别选择 */}
      <div>
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          活动类别 *
        </label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(ActivityCategory)
            .filter(([_, value]) => typeof value === "number")
            .map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleCategoryChange(value as ActivityCategory)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: formData.category === value 
                    ? "2px solid #60a5fa" 
                    : "1px solid rgba(148,163,184,0.3)",
                  background: formData.category === value
                    ? "rgba(59,130,246,0.2)"
                    : "rgba(2,6,23,0.65)",
                  color: "#e8edf9",
                  cursor: "pointer",
                  fontSize: 13
                }}
              >
                {key}
              </button>
            ))}
        </div>
        <p style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
          {categoryRules.description}
        </p>
      </div>

      {/* 激励类型选择 */}
      <div>
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          激励类型 *
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          {allowedIncentives.map((incentive) => (
            <button
              key={incentive}
              type="button"
              onClick={() => handleIncentiveChange(incentive)}
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                border: formData.incentiveType === incentive
                  ? "2px solid #60a5fa"
                  : "1px solid rgba(148,163,184,0.3)",
                background: formData.incentiveType === incentive
                  ? "rgba(59,130,246,0.2)"
                  : "rgba(2,6,23,0.65)",
                color: "#e8edf9",
                cursor: "pointer",
                fontSize: 13
              }}
            >
              {incentive === IncentiveType.DepositPool ? "押金奖池" : "NFT奖励"}
            </button>
          ))}
        </div>
      </div>

      {/* 基本信息 */}
      <div>
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          活动标题 *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
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

      <div>
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          活动描述 *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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

      {/* 押金挑战相关字段 */}
      {formData.incentiveType === IncentiveType.DepositPool && (
        <>
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
        </>
      )}

      {/* NFT相关字段 */}
      {formData.incentiveType === IncentiveType.NFTReward && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                NFT名称 *
              </label>
              <input
                type="text"
                value={formData.nftName}
                onChange={(e) => setFormData(prev => ({ ...prev, nftName: e.target.value }))}
                placeholder="例如：Web3 Meetup 2024"
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
                NFT符号 *
              </label>
              <input
                type="text"
                value={formData.nftSymbol}
                onChange={(e) => setFormData(prev => ({ ...prev, nftSymbol: e.target.value.toUpperCase() }))}
                placeholder="例如：W3M"
                maxLength={10}
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

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              基础Token URI (可选)
            </label>
            <input
              type="text"
              value={formData.baseTokenURI}
              onChange={(e) => setFormData(prev => ({ ...prev, baseTokenURI: e.target.value }))}
              placeholder="https://api.example.com/metadata/"
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
        </>
      )}

      {/* 公开/私密设置 */}
      {formData.category !== ActivityCategory.ProfessionalWeb3 && 
       formData.category !== ActivityCategory.Lifestyle && (
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: 14 }}>在公开档案中显示</span>
          </label>
        </div>
      )}

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

