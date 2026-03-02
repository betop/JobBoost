"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";

export default function Home() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/login";
    }
  }, [hydrated, isAuthenticated]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>
  );
}
