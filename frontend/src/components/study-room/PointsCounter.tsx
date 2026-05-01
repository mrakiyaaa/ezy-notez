"use client";

import { useState, useEffect, useRef } from "react";

interface PointsCounterProps {
  points: number;
}

export default function PointsCounter({ points }: PointsCounterProps) {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [showFloat, setShowFloat] = useState(false);
  const [floatValue, setFloatValue] = useState(0);
  const [bump, setBump] = useState(false);
  const prevPoints = useRef(points);

  useEffect(() => {
    const diff = points - prevPoints.current;
    if (diff > 0) {
      setFloatValue(diff);
      setShowFloat(true);
      setBump(true);

      // Animate the counter increment
      const start = prevPoints.current;
      const duration = 400;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setDisplayPoints(Math.round(start + diff * eased));
        if (progress < 1) requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);

      // Clean up animations
      const floatTimer = setTimeout(() => setShowFloat(false), 1200);
      const bumpTimer = setTimeout(() => setBump(false), 400);

      prevPoints.current = points;

      return () => {
        clearTimeout(floatTimer);
        clearTimeout(bumpTimer);
      };
    }

    prevPoints.current = points;
  }, [points]);

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Floating points animation */}
      {showFloat && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-green-400 font-bold text-lg sr-float-points pointer-events-none">
          +{floatValue}
        </span>
      )}

      {/* Main counter */}
      <div
        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.05] border border-fade-border ${
          bump ? "sr-counter-bump" : ""
        }`}
      >
        <span className="text-text-muted text-xs font-medium">PTS</span>
        <span className="text-text-primary text-xl font-bold tabular-nums">
          {displayPoints}
        </span>
      </div>
    </div>
  );
}
