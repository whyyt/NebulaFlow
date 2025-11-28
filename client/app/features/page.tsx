"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { FadeIn } from "../../components/animations/FadeIn";
import { ParticleField } from "../../components/animations/ParticleField";
import Link from "next/link";

export default function FeaturesPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [mounted, setMounted] = useState(false);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 设置 mounted 状态，避免 hydration 错误
  useEffect(() => {
    setMounted(true);
  }, []);

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
      }
    };
  }, []);
  return (
    <div
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
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3), transparent)",
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
              opacity: 1,
              transition: "opacity 0.2s",
              borderBottom: "2px solid rgba(255, 255, 255, 0.5)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Core Features
          </Link>
          <Link
            href="/activities?animate=true"
            onClick={() => {
              sessionStorage.setItem('activities_animate', 'true');
            }}
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
          {/* 连接钱包按钮 */}
          {mounted && (
            !isConnected ? (
              <button
                onClick={() => connect({ connector: injected() })}
                style={{
                  padding: "10px 16px",
                  borderRadius: 20,
                  borderTop: "1px solid rgba(255, 255, 255, 0.3)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
                  borderLeft: "none",
                  borderRight: "none",
                  background: "transparent",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "opacity 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "120px",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                连接钱包
              </button>
            ) : (
              <button
                onClick={() => {
                  if (showDisconnect) {
                    // 第二次点击，断开连接
                    disconnect();
                    setShowDisconnect(false);
                    if (disconnectTimeoutRef.current) {
                      clearTimeout(disconnectTimeoutRef.current);
                      disconnectTimeoutRef.current = null;
                    }
                  } else {
                    // 第一次点击，显示"断开连接"
                    setShowDisconnect(true);
                    // 清除之前的 timeout
                    if (disconnectTimeoutRef.current) {
                      clearTimeout(disconnectTimeoutRef.current);
                    }
                    // 1.5秒后自动恢复
                    disconnectTimeoutRef.current = setTimeout(() => {
                      setShowDisconnect(false);
                      disconnectTimeoutRef.current = null;
                    }, 1500);
                  }
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 20,
                  borderTop: "1px solid rgba(255, 255, 255, 0.3)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
                  borderLeft: "none",
                  borderRight: "none",
                  background: "transparent",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "opacity 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "120px",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                {showDisconnect ? "断开连接" : (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "")}
              </button>
            )
          )}
        </div>
      </nav>

      {/* 返回主界面按钮 */}
      <div
        style={{
          position: "fixed",
          top: 100,
          left: 48,
          zIndex: 999,
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.2)",
            background: "rgba(255, 255, 255, 0.1)",
            color: "#ffffff",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 500,
            transition: "all 0.3s",
            backdropFilter: "blur(10px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.transform = "translateX(-4px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.transform = "translateX(0)";
          }}
        >
          <span>←</span>
          <span>back to homepage</span>
        </Link>
      </div>

      {/* 内容区域 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "120px 24px 80px",
        }}
      >
        <FadeIn delay={0.2} duration={0.8}>
          <h1
            style={{
              fontSize: "clamp(48px, 6vw, 64px)",
              fontWeight: 700,
              marginBottom: 16,
              textAlign: "center",
              background: "linear-gradient(135deg, #ffffff, #a78bfa, #ec4899)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Core Features
          </h1>
          <p
            style={{
              fontSize: 18,
              textAlign: "center",
              opacity: 0.8,
              marginBottom: 80,
            }}
          >
            了解 NebulaFlow 的核心功能
          </p>
        </FadeIn>

        {/* 功能特性卡片 */}
        <FadeIn delay={0.4} duration={0.8}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 32,
              marginTop: 60,
            }}
          >
            <div
              style={{
                padding: 40,
                borderRadius: 24,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                textAlign: "center",
                transition: "transform 0.3s, box-shadow 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 24,
                }}
              >
                🎯
              </div>
              <h3
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  margin: "0 0 16px 0",
                }}
              >
                三种活动类别
              </h3>
              <p
                style={{
                  fontSize: 16,
                  opacity: 0.8,
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                Professional Web3、Social Web3、Lifestyle，满足不同场景需求
              </p>
            </div>

            <div
              style={{
                padding: 40,
                borderRadius: 24,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                textAlign: "center",
                transition: "transform 0.3s, box-shadow 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 24,
                }}
              >
                💎
              </div>
              <h3
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  margin: "0 0 16px 0",
                }}
              >
                双重激励机制
              </h3>
              <p
                style={{
                  fontSize: 16,
                  opacity: 0.8,
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                押金奖池激励，完成挑战获得奖励
              </p>
            </div>

            <div
              style={{
                padding: 40,
                borderRadius: 24,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                textAlign: "center",
                transition: "transform 0.3s, box-shadow 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 24,
                }}
              >
                🔐
              </div>
              <h3
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  margin: "0 0 16px 0",
                }}
              >
                你的个人档案
              </h3>
              <p
                style={{
                  fontSize: 16,
                  opacity: 0.8,
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                智能分类管理，回顾你的整段成长旅程
              </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

