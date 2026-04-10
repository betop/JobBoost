import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("admin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 errors - clear token but let components handle redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Clear auth state
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin-auth");
      // Only redirect if not already on login page
      // if (!window.location.pathname.includes("/login")) {
      //   window.location.href = "/login";
      // }
    }
    return Promise.reject(error);
  }
);

export default api;
