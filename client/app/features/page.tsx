"use client";

import { FadeIn } from "../../components/animations/FadeIn";
import Link from "next/link";

export default function FeaturesPage() {
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
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3), transparent), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(236, 72, 153, 0.2), transparent)",
          zIndex: 0,
        }}
      />

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
              opacity: 0.9,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.9")}
          >
            功能特性
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
            活动库
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
            我的档案
          </Link>
        </div>
        
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
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
          <span>返回主界面</span>
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
            功能特性
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
                公开/私密档案
              </h3>
              <p
                style={{
                  fontSize: 16,
                  opacity: 0.8,
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                智能分类管理，保护隐私的同时展示成就
              </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

