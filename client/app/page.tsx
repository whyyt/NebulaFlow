"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { FadeIn } from "../components/animations/FadeIn";
import { ParticleField } from "../components/animations/ParticleField";
import Logo from "../components/Logo";
import Link from "next/link";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 计算hero section的透明度（滚动时淡出）
  const heroOpacity = Math.max(0, 1 - scrollY / 400);
  
  // 计算下方内容的透明度（滚动时淡入）
  const contentOpacity = Math.min(1, Math.max(0, (scrollY - 150) / 300));

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
            cursor: "pointer",
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
            href="/activities"
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
          opacity: heroOpacity,
          transition: "opacity 0.3s ease-out",
          pointerEvents: heroOpacity > 0.1 ? "auto" : "none",
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
            Stake-based challenges show your consistency across days. Complete challenges to earn rewards from the deposit pool. Build a verifiable on-chain activity record you truly own.
          </p>
        </FadeIn>
      </div>

      {/* 第二部分：空内容区域（保持滚动效果） */}
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
          opacity: contentOpacity,
          transition: "opacity 0.3s ease-in",
          pointerEvents: contentOpacity > 0.1 ? "auto" : "none",
        }}
      >
      </div>
    </main>
  );
}
