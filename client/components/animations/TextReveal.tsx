"use client";

import { useEffect, useRef, ReactNode } from "react";
import { gsap } from "gsap";

interface TextRevealProps {
  children: string;
  delay?: number;
  duration?: number;
  className?: string;
  splitBy?: "char" | "word";
}

export function TextReveal({
  children,
  delay = 0,
  duration = 0.05,
  className = "",
  splitBy = "char",
}: TextRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const text = container.textContent || "";
    container.textContent = "";

    const elements: HTMLSpanElement[] = [];

    if (splitBy === "char") {
      // Split by characters
      text.split("").forEach((char, index) => {
        const span = document.createElement("span");
        span.textContent = char === " " ? "\u00A0" : char;
        span.style.display = "inline-block";
        span.style.opacity = "0";
        span.style.transform = "translateY(20px)";
        container.appendChild(span);
        elements.push(span);
      });
    } else {
      // Split by words
      text.split(" ").forEach((word, index) => {
        const span = document.createElement("span");
        span.textContent = word;
        span.style.display = "inline-block";
        span.style.opacity = "0";
        span.style.transform = "translateY(20px)";
        span.style.marginRight = "0.25em";
        container.appendChild(span);
        elements.push(span);
      });
    }

    // Animate each element
    gsap.to(elements, {
      opacity: 1,
      y: 0,
      duration: duration,
      stagger: {
        amount: text.length * duration,
        from: "start",
      },
      delay: delay,
      ease: "power2.out",
    });

    return () => {
      container.textContent = text;
    };
  }, [children, delay, duration, splitBy]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

