"use client";

import { Logo } from "../../components/Logo";

export default function LogoPreviewPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0a0f 0%, #1a0a1f 100%)",
        padding: "80px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 80,
      }}
    >
      <h1
        style={{
          fontSize: "clamp(32px, 5vw, 48px)",
          fontWeight: 700,
          color: "#ffffff",
          textAlign: "center",
          marginBottom: 40,
        }}
      >
        NebulaFlow Logo
      </h1>

      {/* Logo展示 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          padding: "40px",
          borderRadius: 20,
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          maxWidth: 600,
          width: "100%",
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 600, color: "#ffffff", margin: 0 }}>
          向上扩散的能量弧线
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255, 255, 255, 0.7)",
            textAlign: "center",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          4条从中心点向上扩散的弧线，表现成长和扩散的力量。最外层弧线最粗，向内逐层变细，形成从密集到扩散的视觉节奏。
        </p>
        <Logo
          size={200}
          style={{
            color: "#ffffff",
            filter: "drop-shadow(0 0 20px rgba(167, 139, 250, 0.5))",
          }}
        />
      </div>

      {/* 尺寸对比 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          padding: "40px",
          borderRadius: 20,
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          maxWidth: 800,
          width: "100%",
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 600, color: "#ffffff", margin: 0 }}>
          不同尺寸展示
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Logo size={80} style={{ color: "#ffffff" }} />
            <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)" }}>80px</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Logo size={120} style={{ color: "#ffffff" }} />
            <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)" }}>120px</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Logo size={200} style={{ color: "#ffffff" }} />
            <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)" }}>200px</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Logo size={300} style={{ color: "#ffffff" }} />
            <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)" }}>300px</span>
          </div>
        </div>
      </div>
    </div>
  );
}

