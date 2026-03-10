import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, Profile } from "@/types/user";

type AuthStore = {
  user: AuthUser | null;
  profile: Profile | null;
  /** Unix timestamp (ms) when the current session was created. */
  sessionStartedAt: number | null;
  /** True while the initial /auth/me fetch is in-flight */
  isLoading: boolean;
  /**
   * True once we have completed at least one attempt to load the session
   * (whether successful or not). Prevents redundant API calls on re-render.
   */
  isInitialized: boolean;

  setAuth: (user: AuthUser, profile: Profile | null) => void;
  updateProfile: (profile: Profile) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      sessionStartedAt: null,
      isLoading: true,
      isInitialized: false,

      setAuth: (user, profile) =>
        set((state) => ({
          user,
          profile,
          isLoading: false,
          isInitialized: true,
          // Only stamp session start-time on first login, not on re-hydration.
          sessionStartedAt: state.sessionStartedAt ?? Date.now(),
        })),

      updateProfile: (profile) => set({ profile }),

      clearAuth: () =>
        set({
          user: null,
          profile: null,
          sessionStartedAt: null,
          isLoading: false,
          isInitialized: true,
        }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "ezy-auth",
      // Persist user, profile and session start-time so we can enforce the
      // 1-hour absolute timeout even after a page refresh.
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        sessionStartedAt: state.sessionStartedAt,
      }),
    }
  )
);
