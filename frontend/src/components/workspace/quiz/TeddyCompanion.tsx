"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { BearEmotion } from "./constants";
import {
  BEAR_FALLBACK_ANIMATIONS,
  QUIZ_GREEN_RGB,
  QUIZ_AMBER_RGB,
  QUIZ_RED,
  QUIZ_RED_RGB,
} from "./constants";

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface TeddyCompanionProps {
  emotion: BearEmotion;
  size?: number;
  className?: string;
}

// Simple bear animation data for fallback (a cute animated bear face)
const createBearFallback = (emotion: BearEmotion) => {
  // These are simplified animation representations
  // In production, you'd use actual Lottie JSON files
  return {
    v: "5.5.7",
    fr: 30,
    ip: 0,
    op: 60,
    w: 200,
    h: 200,
    layers: [
      {
        ty: 4,
        nm: "bear",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: {
            a: emotion === "idle" || emotion === "thinking" ? 1 : 0,
            k: emotion === "idle" || emotion === "thinking"
              ? [
                  { t: 0, s: [-3], e: [3] },
                  { t: 30, s: [3], e: [-3] },
                  { t: 60, s: [-3] },
                ]
              : [0],
          },
          p: { a: 0, k: [100, 100] },
          s: {
            a: emotion === "happy" || emotion === "celebrating" ? 1 : 0,
            k: emotion === "happy" || emotion === "celebrating"
              ? [
                  { t: 0, s: [100, 100], e: [105, 105] },
                  { t: 15, s: [105, 105], e: [100, 100] },
                  { t: 30, s: [100, 100], e: [105, 105] },
                  { t: 45, s: [105, 105], e: [100, 100] },
                  { t: 60, s: [100, 100] },
                ]
              : [100, 100],
          },
        },
        shapes: [
          // Bear face
          {
            ty: "el",
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [80, 80] },
          },
          {
            ty: "fl",
            c: { a: 0, k: [0.63, 0.32, 0.18, 1] },
          },
        ],
      },
    ],
  };
};

export default function TeddyCompanion({
  emotion,
  size = 160,
  className = "",
}: TeddyCompanionProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const fetchAnimation = async () => {
      try {
        const response = await fetch(BEAR_FALLBACK_ANIMATIONS[emotion]);
        if (!response.ok) throw new Error("Failed to fetch animation");
        const data = await response.json();
        if (mounted) {
          setAnimationData(data);
          setIsLoading(false);
        }
      } catch {
        if (mounted) {
          setAnimationData(createBearFallback(emotion));
          setIsLoading(false);
        }
      }
    };

    fetchAnimation();

    return () => {
      mounted = false;
    };
  }, [emotion]);

  // Determine the emotion indicator
  const getEmotionStyles = () => {
    switch (emotion) {
      case "happy":
      case "celebrating":
        return {
          glowColor: `rgba(${QUIZ_GREEN_RGB}, 0.3)`,
          borderColor: `rgba(${QUIZ_GREEN_RGB}, 0.4)`,
        };
      case "sad":
      case "disappointed":
        return {
          glowColor: `rgba(${QUIZ_RED_RGB}, 0.2)`,
          borderColor: `rgba(${QUIZ_RED_RGB}, 0.3)`,
        };
      case "thinking":
        return {
          glowColor: `rgba(${QUIZ_AMBER_RGB}, 0.2)`,
          borderColor: `rgba(${QUIZ_AMBER_RGB}, 0.3)`,
        };
      default:
        return {
          glowColor: "rgba(255, 255, 255, 0.05)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        };
    }
  };

  const styles = getEmotionStyles();

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{
          width: size,
          height: size,
        }}
      >
        <div
          className="w-16 h-16 rounded-full animate-pulse"
          style={{ backgroundColor: `rgba(${QUIZ_GREEN_RGB}, 0.1)` }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Glow effect behind bear */}
      <div
        className="absolute inset-0 rounded-full blur-xl transition-all duration-500"
        style={{
          backgroundColor: styles.glowColor,
          transform: "scale(0.8)",
        }}
      />

      {/* Bear container */}
      <div
        className="relative rounded-full overflow-hidden transition-all duration-300"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          boxShadow: `0 0 20px ${styles.glowColor}`,
        }}
      >
        {animationData && (
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>

      {/* Emotion indicator badge */}
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
        style={{
          backgroundColor:
            emotion === "happy" || emotion === "celebrating"
              ? `rgba(${QUIZ_GREEN_RGB}, 0.2)`
              : emotion === "sad" || emotion === "disappointed"
              ? `rgba(${QUIZ_RED_RGB}, 0.2)`
              : "rgba(255, 255, 255, 0.1)",
          color:
            emotion === "happy" || emotion === "celebrating"
              ? `rgb(${QUIZ_GREEN_RGB})`
              : emotion === "sad" || emotion === "disappointed"
              ? QUIZ_RED
              : "var(--color-text-muted)",
          border: `1px solid ${styles.borderColor}`,
        }}
      >
        {emotion}
      </div>
    </div>
  );
}
