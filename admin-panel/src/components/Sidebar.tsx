"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Key,
  FileText,
  LogOut,
  Menu,
  Activity,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { authService } from "@/services/authService";
import { cn } from "@/utils/cn";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Profiles", href: "/dashboard/profiles", icon: Users },
  { name: "Bidders", href: "/dashboard/bidders", icon: UserCheck },
  { name: "Tokens", href: "/dashboard/tokens", icon: Key },
  { name: "Rules", href: "/dashboard/rules", icon: FileText },
  { name: "Generation Logs", href: "/dashboard/logs", icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = useAuthStore((state) => state.admin);
  const logout = useAuthStore((state) => state.logout);
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const handleLogout = () => {
    authService.logout();
    logout();
    router.push("/login");
  };

  return (
    <>
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-gray-900 text-white transition-all duration-300 z-40",
          sidebarCollapsed ? "-translate-x-full lg:translate-x-0 lg:w-20" : "w-64"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-800">
            <h1 className={cn("font-bold transition-all", sidebarCollapsed ? "text-sm" : "text-xl")}>
              {sidebarCollapsed ? "RG" : "Resume Gen"}
            </h1>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-800">
            {!sidebarCollapsed && admin && (
              <div className="mb-4 px-4">
                <p className="text-sm font-medium text-white">{admin.name}</p>
                <p className="text-xs text-gray-400">{admin.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
