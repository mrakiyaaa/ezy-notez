import axios, { AxiosInstance } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ─── 401 auto-refresh interceptor ────────────────────────
// When any request returns 401, try POST /auth/refresh (which rotates the
// HttpOnly cookies server-side). If that succeeds, replay the original
// request. If it fails, clear the client-side auth store and redirect to
// login so the user isn't silently stuck in a broken state.

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

    // Only intercept 401s that haven't already been retried, and
    // never intercept the refresh or login endpoints themselves.
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/verify-otp")
    ) {
      if (isRefreshing) {
        // Queue concurrent requests until the refresh resolves
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post("/auth/refresh");
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error);
        // Clear the persisted auth state and send the user to login
        if (typeof window !== "undefined") {
          import("../store/auth-store")
            .then(({ useAuthStore }) => useAuthStore.getState().clearAuth())
            .catch(() => {});
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
