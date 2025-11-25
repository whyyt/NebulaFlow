"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { FadeIn } from "../components/animations/FadeIn";
import { ParticleField } from "../components/animations/ParticleField";
import { Logo } from "../components/Logo";
import Link from "next/link";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main
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
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3), transparent), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(236, 72, 153, 0.2), transparent)",
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
        <div
          style={{
            fontSize: 24,
              fontWeight: 700,
            backgroundImage: "linear-gradient(120deg, #ffffff, #a78bfa, #ec4899)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            letterSpacing: 1,
          }}
        >
          NebulaFlow
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Link
            href="/create"
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
            创建活动
          </Link>
          <Link
            href="/dashboard"
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
            我的档案
          </Link>
          {mounted && (
            <button
              onClick={() => {
                if (!isConnected) {
                  connect({ connector: injected() });
                }
              }}
              style={{
                padding: "10px 24px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                background: isConnected
                  ? "rgba(255, 255, 255, 0.1)"
                  : "linear-gradient(135deg, rgba(120, 119, 198, 0.3), rgba(236, 72, 153, 0.3))",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 600,
                cursor: isConnected ? "default" : "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isConnected) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 10px 30px rgba(236, 72, 153, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isConnected) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              {isConnected
                ? `${address?.slice(0, 6)}...${address?.slice(-4)}`
                : "连接钱包"}
            </button>
        )}
      </div>
      </nav>

      {/* Hero Section - 第一部分：主副标题垂直居中 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
        }}
      >
        {/* Logo */}
        <FadeIn delay={0.3} duration={1}>
          <div
            style={{
              marginBottom: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Logo
              size={240}
              style={{
                color: "#ffffff",
                filter: "drop-shadow(0 0 20px rgba(167, 139, 250, 0.5))",
              }}
            />
          </div>
        </FadeIn>

        {/* 主标题 */}
        <FadeIn delay={0.5} duration={0.8}>
          <h1
            style={{
              fontSize: "clamp(64px, 10vw, 96px)",
              fontWeight: 700,
              margin: "0 0 24px 0",
              textAlign: "center",
              lineHeight: 1.1,
              background: "linear-gradient(135deg, #ffffff, #a78bfa, #ec4899)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            On-Chain Growth
          </h1>
        </FadeIn>

        {/* 副标题 */}
        <FadeIn delay={0.7} duration={0.8}>
          <p
            style={{
              fontSize: "clamp(14px, 2vw, 18px)",
              margin: 0,
              textAlign: "center",
              opacity: 0.9,
              maxWidth: 700,
              lineHeight: 1.4,
            }}
          >
            Stake-based challenges show your consistency across days. NFT-based events capture your presence in key moments. Together, they form a verifiable on-chain profile you truly own.
          </p>
        </FadeIn>
      </div>

      {/* 第二部分：按钮和功能特性 */}
      <div
      style={{
          position: "relative",
          zIndex: 1,
          paddingTop: "80px",
          paddingBottom: "80px",
          minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* 行动按钮 */}
        <FadeIn delay={0.2} duration={0.8}>
        <div
          style={{
            display: "flex",
              gap: 20,
            flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 120,
            }}
          >
            <Link
              href="/create"
              style={{
                padding: "16px 32px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 16,
                fontWeight: 600,
                transition: "all 0.3s",
                backdropFilter: "blur(10px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 10px 30px rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              创建活动
            </Link>
            <Link
              href="/dashboard"
            style={{
                padding: "16px 32px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 16,
                fontWeight: 600,
                transition: "all 0.3s",
                backdropFilter: "blur(10px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 10px 30px rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              查看档案
            </Link>
          </div>
        </FadeIn>

        {/* 功能特性 */}
        <FadeIn delay={0.4} duration={0.8}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 32,
              maxWidth: 1200,
              width: "100%",
              padding: "0 24px",
            }}
          >
            <div
      style={{
                padding: 32,
                borderRadius: 20,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                textAlign: "center",
      }}
    >
      <div
        style={{
                  fontSize: 40,
                  marginBottom: 16,
                }}
              >
                🎯
      </div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  margin: "0 0 12px 0",
                }}
              >
                三种活动类别
              </h3>
              <p
                style={{
                  fontSize: 14,
                  opacity: 0.8,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Professional Web3、Social Web3、Lifestyle，满足不同场景需求
              </p>
            </div>

            <div
              style={{
                padding: 32,
                borderRadius: 20,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                textAlign: "center",
              }}
            >
            <div
              style={{
                  fontSize: 40,
                  marginBottom: 16,
                }}
              >
                💎
              </div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  margin: "0 0 12px 0",
                }}
              >
                双重激励机制
              </h3>
              <p
                style={{
                  fontSize: 14,
                  opacity: 0.8,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                押金奖池与NFT奖励，灵活配置激励方式
              </p>
            </div>

    <div
      style={{
                padding: 32,
                borderRadius: 20,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  marginBottom: 16,
                }}
              >
                🔐
    </div>
              <h3
      style={{
                  fontSize: 20,
                  fontWeight: 600,
                  margin: "0 0 12px 0",
                }}
              >
                公开/私密档案
              </h3>
              <p
                style={{
                  fontSize: 14,
                  opacity: 0.8,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                智能分类管理，保护隐私的同时展示成就
              </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </main>
  );
}
