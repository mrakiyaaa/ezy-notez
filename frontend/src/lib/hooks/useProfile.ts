"use client";

import { useCallback, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import type { AuthUser, Profile } from "@/types/user";

type ProfileState = {
  user: AuthUser | null;
  profile: Profile | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
};

type UpdateProfilePayload = {
  full_name: string;
};

export const useProfile = () => {
  const [state, setState] = useState<ProfileState>({
    user: null,
    profile: null,
    isLoading: true,
    isUpdating: false,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const data = await authApi.getCurrentUser();
        if (!isMounted) return;

        setState((prev) => ({
          ...prev,
          user: data.user ?? null,
          profile: data.profile ?? null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        if (!isMounted) return;

        setState((prev) => ({
          ...prev,
          user: null,
          profile: null,
          isLoading: false,
          error: (error as Error).message,
        }));
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    setState((prev) => ({ ...prev, isUpdating: true, error: null }));

    try {
      const data = await authApi.updateProfile(payload);

      setState((prev) => ({
        ...prev,
        profile: data.profile ?? prev.profile,
        isUpdating: false,
        error: null,
      }));

      return data.profile ?? null;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isUpdating: false,
        error: (error as Error).message,
      }));

      return null;
    }
  }, []);

  return {
    ...state,
    updateProfile,
  };
};
