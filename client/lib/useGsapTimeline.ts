"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function useGsapTimeline() {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    // Create GSAP context for proper cleanup
    ctxRef.current = gsap.context(() => {
      timelineRef.current = gsap.timeline();
    });

    return () => {
      // Cleanup
      if (ctxRef.current) {
        ctxRef.current.revert();
      }
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, []);

  return {
    timeline: timelineRef.current,
    ctx: ctxRef.current,
  };
}

export function useGsapContext() {
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    ctxRef.current = gsap.context(() => {});

    return () => {
      if (ctxRef.current) {
        ctxRef.current.revert();
      }
    };
  }, []);

  return ctxRef.current;
}

