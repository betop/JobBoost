"use client";

import { useEffect, useState } from "react";
import { authService } from "@/services/authService";

export default function Home() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Simple check - if token exists, go to dashboard, otherwise login
    const token = authService.getStoredToken();
    
    // Also check persisted auth state
    let isAuthenticated = false;
    try {
      const persistedState = localStorage.getItem("admin-auth");
      if (persistedState) {
        const parsed = JSON.parse(persistedState);
        isAuthenticated = parsed.state?.isAuthenticated === true;
      }
    } catch (e) {
      // ignore
    }

    if (token && isAuthenticated) {
      window.location.href = "/dashboard";
    } else {
      // window.location.href = "/login";
    }
    setChecked(true);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>
  );
}
