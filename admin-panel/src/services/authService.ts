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
  };
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<LoginResponse> => {
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
};
