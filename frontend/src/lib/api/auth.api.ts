import { apiClient } from "./axios-config";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export const authApi = {
  async login(credentials: LoginCredentials) {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data;
  },

  async register(data: RegisterData) {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  },

  async logout() {
    localStorage.removeItem("token");
  },
};
