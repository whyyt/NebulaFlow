"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface PrizePoolAnimationProps {
  value: string; // 显示的数值（如 "1.5 ETH"）
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function PrizePoolAnimation({ 
  value, 
  delay = 0, 
  className = "",
  style = {}
}: PrizePoolAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayValue, setDisplayValue] = useState("0");
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // 提取数字部分
    const numericMatch = value.match(/[\d.]+/);
    if (!numericMatch) {
      setDisplayValue(value);
      return;
    }

    const targetValue = parseFloat(numericMatch[0]);
    const unit = value.replace(numericMatch[0], "").trim();

    setIsAnimating(true);

    // 数字滚动动画
    const duration = 1.5;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = targetValue * easeOutCubic;
      
      setDisplayValue(`${currentValue.toFixed(unit.includes("ETH") ? 4 : 0)} ${unit}`);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, delay * 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  useEffect(() => {
    if (!containerRef.current || !isAnimating) return;

    // 发光动画
    const glowAnimation = gsap.to(containerRef.current, {
      textShadow: "0 0 20px rgba(34, 211, 238, 0.8), 0 0 40px rgba(34, 211, 238, 0.4)",
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    return () => {
      glowAnimation.kill();
    };
  }, [isAnimating]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...style,
        transition: "all 0.3s ease",
      }}
    >
      {displayValue}
    </div>
  );
}






