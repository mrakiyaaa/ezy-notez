import { apiClient } from "./axios-config";

export interface RequestOtpPayload {
  email: string;
  redirectTo?: string;
}

export interface VerifyOtpPayload {
  email: string;
  token: string;
}

export interface UpdateProfilePayload {
  full_name: string;
}

export const authApi = {
  async requestOtp(payload: RequestOtpPayload) {
    const response = await apiClient.post("/auth/request-otp", payload);
    return response.data;
  },

  async verifyOtp(payload: VerifyOtpPayload) {
    const response = await apiClient.post("/auth/verify-otp", payload);
    return response.data;
  },

  async getCurrentUser() {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  async updateProfile(payload: UpdateProfilePayload) {
    const response = await apiClient.put("/auth/update-profile", payload);
    return response.data;
  },
};
