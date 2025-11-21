"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface FloatingOrbProps {
  size?: number;
  color?: string;
  className?: string;
}

export function FloatingOrb({
  size = 400,
  color = "rgba(59,130,246,0.3)",
  className = "",
}: FloatingOrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orbRef.current) return;

    const orb = orbRef.current;

    // Create floating animation
    const floatAnimation = gsap.to(orb, {
      x: "random(-50, 50)",
      y: "random(-50, 50)",
      duration: "random(3, 5)",
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });

    // Create pulsing glow effect
    const pulseAnimation = gsap.to(orb, {
      scale: 1.2,
      opacity: 0.6,
      duration: 2,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });

    return () => {
      floatAnimation.kill();
      pulseAnimation.kill();
    };
  }, []);

  return (
    <div
      ref={orbRef}
      className={className}
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        filter: "blur(60px)",
        pointerEvents: "none",
        willChange: "transform",
      }}
    />
  );
}

