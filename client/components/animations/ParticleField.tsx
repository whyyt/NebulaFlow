"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface ParticleFieldProps {
  count?: number;
  className?: string;
}

export function ParticleField({ count = 20, className = "" }: ParticleFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const particles: HTMLDivElement[] = [];

    // Create particles
    for (let i = 0; i < count; i++) {
      const particle = document.createElement("div");
      particle.style.position = "absolute";
      particle.style.width = `${Math.random() * 4 + 2}px`;
      particle.style.height = particle.style.width;
      particle.style.borderRadius = "50%";
      particle.style.background = `rgba(59, 130, 246, ${Math.random() * 0.5 + 0.2})`;
      particle.style.boxShadow = `0 0 ${Math.random() * 10 + 5}px rgba(59, 130, 246, 0.5)`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      container.appendChild(particle);
      particles.push(particle);
    }

    // Animate particles
    particles.forEach((particle, index) => {
      gsap.to(particle, {
        x: `+=${(Math.random() - 0.5) * 200}`,
        y: `+=${(Math.random() - 0.5) * 200}`,
        opacity: Math.random() * 0.5 + 0.3,
        duration: Math.random() * 3 + 2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: index * 0.1,
      });
    });

    return () => {
      particles.forEach((particle) => particle.remove());
    };
  }, [count]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    />
  );
}

