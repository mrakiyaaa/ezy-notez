"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth-store";

// ─── Session timeout constants ────────────────────────────────────────────────
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const ABSOLUTE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const WARNING_BEFORE_MS = 2 * 60 * 1000; // show warning 2 min before expiry
const TICK_INTERVAL_MS = 30 * 1000; // evaluate every 30 seconds

// Activity events that reset the inactivity timer
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
];

export type SessionWarningType = "inactivity" | "absolute" | null;

export interface SessionTimeoutState {
  /** Whether the warning banner should be visible */
  showWarning: boolean;
  /** What triggered the warning */
  warningType: SessionWarningType;
  /** Milliseconds remaining until forced logout */
  remainingMs: number;
  /** Extend the session by resetting both timers (only valid for inactivity) */
  extendSession: () => void;
}

/**
 * Enforces two session-expiry policies:
 *  • Inactivity timeout: logs the user out after 20 minutes of no activity.
 *  • Absolute timeout:   logs the user out 1 hour after the session started,
 *                        regardless of activity.
 *
 * A warning banner is exposed 2 minutes before whichever limit fires first.
 */
export function useSessionTimeout(): SessionTimeoutState {
  const router = useRouter();
  const { user, sessionStartedAt, clearAuth } = useAuthStore();

  const lastActivityRef = useRef<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState<SessionWarningType>(null);
  const [remainingMs, setRemainingMs] = useState<number>(ABSOLUTE_TIMEOUT_MS);

  // ── Logout helper ──────────────────────────────────────────────────────────
  const performLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Swallow – we still clear client state even if the API call fails.
    } finally {
      clearAuth();
      router.replace("/login");
    }
  }, [clearAuth, router]);

  // ── Activity tracker – resets inactivity timer ─────────────────────────────
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!user) return;

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, [user, handleActivity]);

  // ── Periodic check ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || sessionStartedAt === null) return;

    const tick = async () => {
      const now = Date.now();

      const inactivityElapsed = now - lastActivityRef.current;
      const absoluteElapsed = now - sessionStartedAt;

      const inactivityRemaining = INACTIVITY_TIMEOUT_MS - inactivityElapsed;
      const absoluteRemaining = ABSOLUTE_TIMEOUT_MS - absoluteElapsed;

      // ── Expired? ─────────────────────────────────────────────────────────
      if (inactivityRemaining <= 0) {
        await performLogout();
        return;
      }
      if (absoluteRemaining <= 0) {
        await performLogout();
        return;
      }

      // ── Determine which limit fires first ─────────────────────────────────
      const remaining = Math.min(inactivityRemaining, absoluteRemaining);
      const expiresBy: SessionWarningType =
        inactivityRemaining <= absoluteRemaining ? "inactivity" : "absolute";

      setRemainingMs(remaining);

      // ── Warning window ────────────────────────────────────────────────────
      if (remaining <= WARNING_BEFORE_MS) {
        setShowWarning(true);
        setWarningType(expiresBy);
      } else {
        setShowWarning(false);
        setWarningType(null);
      }
    };

    // Run immediately on mount, then on each interval.
    void tick();
    const id = setInterval(() => void tick(), TICK_INTERVAL_MS);

    return () => clearInterval(id);
  }, [user, sessionStartedAt, performLogout]);

  // ── Extend session (resets inactivity timer) ───────────────────────────────
  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setWarningType(null);
  }, []);

  return { showWarning, warningType, remainingMs, extendSession };
}
