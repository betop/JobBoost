import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface Admin {
  id: string;
  email: string;
  name: string;
  type: "admin" | "super_admin";
}

interface AuthState {
  admin: Admin | null;
  isAuthenticated: boolean;
  setAdmin: (admin: Admin) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      isAuthenticated: false,
      setAdmin: (admin) => set({ admin, isAuthenticated: true }),
      logout: () => {
        localStorage.removeItem("admin_token");
        set({ admin: null, isAuthenticated: false });
      },
    }),
    {
      name: "admin-auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
