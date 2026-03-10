"use client";

import { useEffect } from "react";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth-store";

/**
 * Returns the current auth state from the global Zustand store.
 *
 * On first mount after a cold start (no persisted state), it fires one
 * GET /auth/me request to re-hydrate the session from the HttpOnly cookies.
 * Subsequent renders – and any other component using useAuth – read from the
 * shared store without triggering additional API calls.
 */
export const useAuth = () => {
  const { user, profile, isLoading, isInitialized, setAuth, clearAuth, setLoading } =
    useAuthStore();

  useEffect(() => {
    // Already established a session in the store – nothing to do.
    if (isInitialized && user) return;
    // Already tried and found no session – don't keep hammering the API.
    if (isInitialized && !user) return;

    let isMounted = true;

    const loadUser = async () => {
      setLoading(true);
      try {
        const data = await authApi.getCurrentUser();
        if (!isMounted) return;
        if (data.user) {
          setAuth(data.user, data.profile ?? null);
        } else {
          clearAuth();
        }
      } catch {
        if (!isMounted) return;
        clearAuth();
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [isInitialized, user, setAuth, clearAuth, setLoading]);

  return { user, profile, isLoading };
};
