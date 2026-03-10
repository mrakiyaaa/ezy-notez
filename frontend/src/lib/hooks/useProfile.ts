"use client";

import { useCallback, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth-store";

type UpdateProfilePayload = {
  full_name: string;
};

/**
 * Exposes the current user/profile from the global auth store and provides
 * an `updateProfile` action that persists changes to the server and keeps the
 * store in sync.
 */
export const useProfile = () => {
  const {
    user,
    profile,
    isLoading,
    isInitialized,
    setAuth,
    clearAuth,
    setLoading,
    updateProfile: storeUpdateProfile,
  } = useAuthStore();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from the server on first mount (same logic as useAuth)
  useEffect(() => {
    if (isInitialized) return;

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
  }, [isInitialized, setAuth, clearAuth, setLoading]);

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload) => {
      setIsUpdating(true);
      setError(null);
      try {
        const data = await authApi.updateProfile(payload);
        const updated = data.profile ?? null;
        if (updated) storeUpdateProfile(updated);
        return updated;
      } catch (err) {
        setError((err as Error).message);
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [storeUpdateProfile]
  );

  return { user, profile, isLoading, isUpdating, error, updateProfile };
};

