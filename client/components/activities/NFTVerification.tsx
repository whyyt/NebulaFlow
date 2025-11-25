"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { NFTMetadata, NFTType } from "../../lib/types";

interface NFTVerificationProps {
  nftContract: string;
  activityId: bigint;
  onVerify?: (tokenId: bigint) => Promise<void>;
}

export function NFTVerification({ nftContract, activityId, onVerify }: NFTVerificationProps) {
  const { address } = useAccount();
  const [tokenId, setTokenId] = useState<string>("");
  const [nftMetadata, setNftMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nftTypeLabels = {
    [NFTType.POAP]: "参与证明",
    [NFTType.Badge]: "成就徽章",
    [NFTType.Dynamic]: "动态NFT",
    [NFTType.Completion]: "完成证明"
  };

  const handleVerify = async () => {
    if (!tokenId) {
      setError("请输入Token ID");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 这里应该调用合约查询NFT元数据
      // const metadata = await nftContract.getNFTMetadata(BigInt(tokenId));
      // setNftMetadata(metadata);

      // 模拟验证逻辑
      if (onVerify) {
        await onVerify(BigInt(tokenId));
      }
    } catch (err: any) {
      setError(err.message || "验证失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: 24,
      borderRadius: 16,
      border: "1px solid rgba(148,163,184,0.25)",
      background: "linear-gradient(160deg, rgba(4,8,20,0.95), rgba(3,6,17,0.92))",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }}>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>NFT验证</h3>

      <div>
        <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          Token ID
        </label>
        <input
          type="text"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="输入NFT Token ID"
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

      {nftMetadata && (
        <div style={{
          padding: 16,
          borderRadius: 12,
          background: "rgba(59,130,246,0.1)",
          border: "1px solid rgba(59,130,246,0.3)"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <strong>类型:</strong> {nftTypeLabels[nftMetadata.nftType]}
            </div>
            <div>
              <strong>标题:</strong> {nftMetadata.title}
            </div>
            <div>
              <strong>描述:</strong> {nftMetadata.description}
            </div>
            <div>
              <strong>活动ID:</strong> {nftMetadata.activityId.toString()}
            </div>
            <div>
              <strong>验证状态:</strong> {nftMetadata.isVerified ? "✓ 已验证" : "✗ 未验证"}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: 12,
          borderRadius: 12,
          background: "rgba(239,68,68,0.2)",
          color: "#fca5a5",
          fontSize: 13
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleVerify}
        disabled={loading || !tokenId}
        style={{
          padding: "12px 24px",
          borderRadius: 12,
          border: "none",
          background: loading || !tokenId
            ? "rgba(148,163,184,0.3)"
            : "linear-gradient(120deg, #4ade80, #22d3ee, #60a5fa)",
          color: loading || !tokenId ? "rgba(15,23,42,0.6)" : "#041016",
          fontSize: 14,
          fontWeight: 600,
          cursor: loading || !tokenId ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "验证中..." : "验证NFT"}
      </button>
    </div>
  );
}

