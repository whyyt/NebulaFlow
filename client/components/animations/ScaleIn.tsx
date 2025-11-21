"use client";

import { useEffect, useRef, ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  scale?: number;
  className?: string;
  trigger?: boolean;
}

export function ScaleIn({
  children,
  delay = 0,
  duration = 0.8,
  scale = 0.8,
  className = "",
  trigger = true,
}: ScaleInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const animation = gsap.fromTo(
      ref.current,
      {
        opacity: 0,
        scale: scale,
      },
      {
        opacity: 1,
        scale: 1,
        duration: duration,
        delay: delay,
        ease: "back.out(1.7)",
        scrollTrigger: trigger
          ? {
              trigger: ref.current,
              start: "top 80%",
              toggleActions: "play none none none",
            }
          : undefined,
      }
    );

    return () => {
      animation.kill();
      if (trigger && ref.current) {
        ScrollTrigger.getAll().forEach((st) => {
          if (st.vars.trigger === ref.current) {
            st.kill();
          }
        });
      }
    };
  }, [delay, duration, scale, trigger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

