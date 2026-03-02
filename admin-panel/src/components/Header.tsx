"use client";

import { Search, Bell, KeyRound, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/utils/cn";
import ChangePasswordModal from "./ChangePasswordModal";

export default function Header() {
  const admin = useAuthStore((state) => state.admin);
  const logout = useAuthStore((state) => state.logout);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 transition-all duration-300 z-30",
          sidebarCollapsed ? "left-0 lg:left-20" : "left-0 lg:left-64"
        )}
      >
        <div className="flex-1 max-w-2xl ml-12 lg:ml-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search profiles, bidders, rules..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Avatar + dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {admin?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {admin?.name}
              </span>
              <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", dropdownOpen && "rotate-180")} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{admin?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{admin?.email}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); setPwModalOpen(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <KeyRound className="w-4 h-4 text-gray-400" />
                  Change Password
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ChangePasswordModal isOpen={pwModalOpen} onClose={() => setPwModalOpen(false)} />
    </>
  );
}

