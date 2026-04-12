"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/utils/cn";

// Routes only accessible by super_admin
const SUPER_ADMIN_ROUTES = ["/dashboard/tokens", "/dashboard/rules", "/dashboard/versions"];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const { isAuthenticated, admin, logout, setAdmin } = useAuthStore();
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      // Check token first
      const token = authService.getStoredToken();
      
      if (!token) {
        setAuthStatus("unauthenticated");
        return;
      }

      // Token exists - check if zustand already has auth state
      if (isAuthenticated) {
        // If type is missing from existing session, refresh it from the backend
        if (admin && !admin.type) {
          authService.getMe().then((me) => {
            setAdmin({ ...admin, type: me.type });
          }).catch(() => {});
        }
        setAuthStatus("authenticated");
        return;
      }

      // Token exists but zustand not authenticated
      // Try to read from localStorage persisted state
      try {
        const persistedState = localStorage.getItem("admin-auth");
        if (persistedState) {
          const parsed = JSON.parse(persistedState);
          if (parsed.state?.isAuthenticated && parsed.state?.admin) {
            const restoredAdmin = parsed.state.admin;
            // If type is missing (old session), fetch it from backend
            if (!restoredAdmin.type) {
              authService.getMe().then((me) => {
                setAdmin({ ...restoredAdmin, type: me.type });
              }).catch(() => {
                setAdmin(restoredAdmin);
              });
            } else {
              setAdmin(restoredAdmin);
            }
            setAuthStatus("authenticated");
            return;
          }
        }
      } catch (e) {
        console.error("Failed to parse persisted auth state", e);
      }

      // No valid state found
      setAuthStatus("unauthenticated");
    };

    // Wait for zustand to attempt hydration first
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, setAdmin]);

  // Handle unauthenticated state
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      logout();
      router.push("/login");
    }
  }, [authStatus, logout, router]);

  // Redirect non-super_admin users away from restricted routes
  useEffect(() => {
    if (authStatus === "authenticated" && admin && admin.type !== "super_admin") {
      const isRestricted = SUPER_ADMIN_ROUTES.some((route) => pathname.startsWith(route));
      if (isRestricted) {
        router.replace("/dashboard");
      }
    }
  }, [authStatus, admin, pathname, router]);

  // Show loading while checking auth
  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // If not authenticated, show loading while redirect happens
  if (authStatus === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      <main
        className={cn(
          "pt-16 transition-all duration-300",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <div className="p-6">{children}</div>
      </main>
      <Toast />
    </div>
  );
}
