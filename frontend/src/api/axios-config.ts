import axios, { AxiosInstance } from "axios";
import { supabase } from "@/lib/supabase/client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ─── Token cache ─────────────────────────────────────────
// Supabase acquires an exclusive Web Lock on every getSession() call.
// Firing multiple concurrent requests each calling getSession() races
// for the same lock and triggers the 10s timeout error.
//
// Strategy:
//   1. onAuthStateChange keeps cachedToken current without any lock.
//   2. Before the first auth event arrives, deduplicate concurrent
//      getSession() calls into one shared promise (one lock acquisition).
//   3. The 401 handler sets cachedToken immediately after a refresh so
//      retried requests don't need another lock round-trip.

let cachedToken: string | null = null;
let tokenInitialized = false;
let sessionFetch: Promise<string | null> | null = null;

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedToken = session?.access_token ?? null;
    tokenInitialized = true;
  });
}

async function getToken(): Promise<string | null> {
  // Fast path: auth state already known, no lock needed.
  if (tokenInitialized) return cachedToken;

  // Slow path: coalesce concurrent callers into one getSession() call.
  if (!sessionFetch) {
    sessionFetch = supabase.auth
      .getSession()
      .then(({ data }) => {
        cachedToken = data.session?.access_token ?? null;
        tokenInitialized = true;
        return cachedToken;
      })
      .finally(() => {
        sessionFetch = null;
      });
  }
  return sessionFetch;
}

// ─── Request interceptor ─────────────────────────────────
apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── 401 response interceptor ────────────────────────────
type QueueEntry = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((entry) => {
    if (error) {
      entry.reject(error);
    } else {
      entry.resolve(null);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data, error: refreshError } =
          await supabase.auth.refreshSession();

        if (refreshError || !data.session)
          throw refreshError ?? new Error("No session");

        // Update cache immediately so queued retries use the new token.
        cachedToken = data.session.access_token;

        originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error);
        cachedToken = null;
        tokenInitialized = false;
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
