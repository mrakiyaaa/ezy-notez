"use client";

import dynamic from "next/dynamic";
import type { BearEmotion } from "./constants";

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  { ssr: false }
);

interface TeddyCompanionProps {
  emotion?: BearEmotion;
  size?: number;
  height?: number;
  className?: string;
}

const LOTTIE_SRC =
  "https://lottie.host/123c1c8c-4333-414f-9f69-8ee07356153e/KYoXzqgJ6t.lottie";

export default function TeddyCompanion({
  size = 160,
  height,
  className = "",
}: TeddyCompanionProps) {
  const containerHeight = height ?? size;
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: containerHeight }}
    >
      <div style={{ width: size, height: size }}>
        <DotLottieReact src={LOTTIE_SRC} loop autoplay />
      </div>
    </div>
  );
}
