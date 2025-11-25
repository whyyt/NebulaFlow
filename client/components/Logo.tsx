"use client";

import { CSSProperties } from "react";

interface LogoProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * NebulaFlow Logo Component
 * 
 * 向上扩散的能量弧线 - 表现成长和扩散的力量
 * 从中心点向上扩散的4条弧线，最外层弧线最粗，向内逐层变细，形成从密集到扩散的视觉节奏
 * 带有光线流动动画效果
 */
export function Logo({ size = 200, className, style }: LogoProps) {
  const viewBox = "0 0 200 200";
  
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        {/* 渐变定义 - 用于创建光线流动效果 */}
        <linearGradient id="gradient1" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2">
            <animate
              attributeName="stop-opacity"
              values="0.2;0.8;0.2"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="30%" stopColor="currentColor" stopOpacity="0.6">
            <animate
              attributeName="stop-opacity"
              values="0.6;1;0.6"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="60%" stopColor="currentColor" stopOpacity="1">
            <animate
              attributeName="stop-opacity"
              values="1;0.8;1"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.2">
            <animate
              attributeName="stop-opacity"
              values="0.2;0.6;0.2"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
        
        <linearGradient id="gradient2" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15">
            <animate
              attributeName="stop-opacity"
              values="0.15;0.7;0.15"
              dur="4.4s"
              repeatCount="indefinite"
              begin="0.4s"
            />
          </stop>
          <stop offset="30%" stopColor="currentColor" stopOpacity="0.5">
            <animate
              attributeName="stop-opacity"
              values="0.5;0.95;0.5"
              dur="4.4s"
              repeatCount="indefinite"
              begin="0.4s"
            />
          </stop>
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.9">
            <animate
              attributeName="stop-opacity"
              values="0.9;0.7;0.9"
              dur="4.4s"
              repeatCount="indefinite"
              begin="0.4s"
            />
          </stop>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.15">
            <animate
              attributeName="stop-opacity"
              values="0.15;0.5;0.15"
              dur="4.4s"
              repeatCount="indefinite"
              begin="0.4s"
            />
          </stop>
        </linearGradient>
        
        <linearGradient id="gradient3" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.1">
            <animate
              attributeName="stop-opacity"
              values="0.1;0.6;0.1"
              dur="4.8s"
              repeatCount="indefinite"
              begin="0.8s"
            />
          </stop>
          <stop offset="30%" stopColor="currentColor" stopOpacity="0.4">
            <animate
              attributeName="stop-opacity"
              values="0.4;0.9;0.4"
              dur="4.8s"
              repeatCount="indefinite"
              begin="0.8s"
            />
          </stop>
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.8">
            <animate
              attributeName="stop-opacity"
              values="0.8;0.6;0.8"
              dur="4.8s"
              repeatCount="indefinite"
              begin="0.8s"
            />
          </stop>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.1">
            <animate
              attributeName="stop-opacity"
              values="0.1;0.4;0.1"
              dur="4.8s"
              repeatCount="indefinite"
              begin="0.8s"
            />
          </stop>
        </linearGradient>
        
        <linearGradient id="gradient4" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.08">
            <animate
              attributeName="stop-opacity"
              values="0.08;0.5;0.08"
              dur="5.2s"
              repeatCount="indefinite"
              begin="1.2s"
            />
          </stop>
          <stop offset="30%" stopColor="currentColor" stopOpacity="0.3">
            <animate
              attributeName="stop-opacity"
              values="0.3;0.8;0.3"
              dur="5.2s"
              repeatCount="indefinite"
              begin="1.2s"
            />
          </stop>
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.7">
            <animate
              attributeName="stop-opacity"
              values="0.7;0.5;0.7"
              dur="5.2s"
              repeatCount="indefinite"
              begin="1.2s"
            />
          </stop>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.08">
            <animate
              attributeName="stop-opacity"
              values="0.08;0.3;0.08"
              dur="5.2s"
              repeatCount="indefinite"
              begin="1.2s"
            />
          </stop>
        </linearGradient>
        
        {/* 发光滤镜 */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* 向上扩散的能量弧线 - 带光线流动效果 */}
      {/* 从中心点向上扩散的4条弧线，表现成长和扩散的力量 */}
      <path
        d="M 100 160 Q 80 120, 100 80 Q 120 120, 100 160"
        stroke="url(#gradient1)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      <path
        d="M 100 160 Q 70 110, 100 60 Q 130 110, 100 160"
        stroke="url(#gradient2)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      <path
        d="M 100 160 Q 60 100, 100 40 Q 140 100, 100 160"
        stroke="url(#gradient3)"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      <path
        d="M 100 160 Q 50 90, 100 20 Q 150 90, 100 160"
        stroke="url(#gradient4)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        filter="url(#glow)"
      />
    </svg>
  );
}

