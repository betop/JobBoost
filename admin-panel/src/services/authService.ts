import api from "./api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  admin: {
    id: string;
    email: string;
    name: string;
    type: "admin" | "super_admin";
  };
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<{ message: string }> => {
    const response = await api.post("/auth/register", credentials);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("admin_token");
  },

  getStoredToken: () => {
    return localStorage.getItem("admin_token");
  },

  setToken: (token: string) => {
    localStorage.setItem("admin_token", token);
  },

  getMe: async (): Promise<{ id: string; email: string; name: string; type: "admin" | "super_admin" }> => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};
