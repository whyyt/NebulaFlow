"use client";

import { useEffect, useRef, ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface SlideInRightProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  x?: number;
  className?: string;
  trigger?: boolean;
}

export function SlideInRight({
  children,
  delay = 0,
  duration = 1,
  x = 100,
  className = "",
  trigger = true,
}: SlideInRightProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const animation = gsap.fromTo(
      ref.current,
      {
        opacity: 0,
        x: x,
      },
      {
        opacity: 1,
        x: 0,
        duration: duration,
        delay: delay,
        ease: "power3.out",
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
  }, [delay, duration, x, trigger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

