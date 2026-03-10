"use client";

import React from "react";
import type { SessionWarningType } from "@/lib/hooks/useSessionTimeout";

interface SessionTimeoutWarningProps {
  show: boolean;
  warningType: SessionWarningType;
  remainingMs: number;
  onStayLoggedIn: () => void;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * A dismissible warning banner shown when the session is about to expire.
 * Appears 2 minutes before either the inactivity or absolute timeout fires.
 */
export default function SessionTimeoutWarning({
  show,
  warningType,
  remainingMs,
  onStayLoggedIn,
}: SessionTimeoutWarningProps) {
  if (!show) return null;

  const message =
    warningType === "inactivity"
      ? "You've been inactive for a while."
      : "Your session has been active for nearly 1 hour.";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md rounded-xl border border-yellow-400/30 bg-yellow-950/90 px-5 py-4 shadow-2xl backdrop-blur"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="mt-0.5 text-yellow-400 text-lg select-none">⚠️</span>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-yellow-200">
            Session expiring soon
          </p>
          <p className="mt-0.5 text-xs text-yellow-300/80">
            {message} You will be logged out in{" "}
            <span className="font-bold text-yellow-200">
              {formatRemaining(remainingMs)}
            </span>
            .
          </p>
        </div>

        {/* Action */}
        {warningType === "inactivity" && (
          <button
            type="button"
            onClick={onStayLoggedIn}
            className="shrink-0 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-yellow-950 transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            Stay logged in
          </button>
        )}
      </div>
    </div>
  );
}
