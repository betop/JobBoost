"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Key,
  FileText,
  LogOut,
  Menu,
  Activity,
  Package,
  Mail,
  ChevronsLeft,
  ChevronsRight,
  Ban,
  Wallet,
  HelpCircle,
  Download,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { authService } from "@/services/authService";
import { creditsService } from "@/services/creditsService";
import { cn } from "@/utils/cn";

type NavItem = { name: string; href: string; icon: typeof Users; superOnly: boolean; adminOnly?: boolean; external?: boolean };
type NavGroup = { label: string | null; items: NavItem[] };

const navigationGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, superOnly: false },
    ],
  },
  {
    label: "Resumes",
    items: [
      { name: "Profiles", href: "/dashboard/profiles", icon: Users, superOnly: false },
      { name: "Blacklist", href: "/dashboard/blacklist", icon: Ban, superOnly: false },
      { name: "Generation Logs", href: "/dashboard/logs", icon: Activity, superOnly: false },
      { name: "Rules", href: "/dashboard/rules", icon: FileText, superOnly: true },
    ],
  },
  {
    label: "Team",
    items: [
      { name: "Users", href: "/dashboard/users", icon: UserCheck, superOnly: false },
      { name: "Keys", href: "/dashboard/tokens", icon: Key, superOnly: false },
    ],
  },
  {
    label: "Billing",
    items: [
      { name: "Credits", href: "/dashboard/credits", icon: Wallet, superOnly: false, adminOnly: true },
    ],
  },
  {
    label: "Tools",
    items: [
      { name: "Mail Triage", href: "/dashboard/mail-triage", icon: Mail, superOnly: true },
      { name: "Extensions", href: "/dashboard/versions", icon: Package, superOnly: true },
      { name: "Download", href: "/download", icon: Download, superOnly: false, external: true },
    ],
  },
  {
    label: "Support",
    items: [
      { name: "Help", href: "/dashboard/help", icon: HelpCircle, superOnly: false },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = useAuthStore((state) => state.admin);
  const logout = useAuthStore((state) => state.logout);
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    authService.logout();
    logout();
    router.push("/login");
  };

  const isSuperAdmin = admin?.type === "super_admin";
  const visibleGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.superOnly && !isSuperAdmin) return false;
        if (item.adminOnly && !isSuperAdmin && admin?.type !== "admin") return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const { data: balanceData } = useQuery({
    queryKey: ["sidebar-credits-balance"],
    queryFn: () => creditsService.getBalance(),
    enabled: admin?.type === "admin",
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const balance = balanceData?.credit_balance;
  const isLowBalance = typeof balance === "number" && balance < 10;
  const isNegativeBalance = typeof balance === "number" && balance < 0;

  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(true)}
        className={cn(
          "lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg",
          mobileMenuOpen && "hidden"
        )}
      >
        <Menu className="w-6 h-6" />
      </button>

      {mobileMenuOpen && (
        <button
          className="lg:hidden fixed inset-0 z-30 bg-black/40"
          aria-label="Close menu backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-gray-900 text-white transition-all duration-300 z-40 w-64",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "lg:w-20" : "lg:w-64",
          "lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className={cn("border-b border-gray-800 p-6", sidebarCollapsed && "lg:p-4") }>
            <div className={cn("flex items-center justify-between", sidebarCollapsed && "lg:justify-center")}>
              <h1 className={cn("font-bold text-xl", sidebarCollapsed && "lg:hidden")}>HHQ</h1>
              <button
                onClick={toggleSidebar}
                className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronsRight className="w-4 h-4" />
                ) : (
                  <ChevronsLeft className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex lg:hidden items-center justify-center w-8 h-8 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                aria-label="Hide menu"
                title="Hide menu"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          <nav className="sidebar-nav flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {visibleGroups.map((group, groupIndex) => (
              <div key={group.label ?? "main"} className={cn(groupIndex > 0 && "pt-4")}>
                {group.label && (
                  <p
                    className={cn(
                      "px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500",
                      sidebarCollapsed && "lg:hidden"
                    )}
                  >
                    {group.label}
                  </p>
                )}
                {group.label && sidebarCollapsed && (
                  <div className="hidden lg:block mx-2 mb-2 border-t border-gray-800" />
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        !item.external && (item.href === "/dashboard"
                          ? pathname === "/dashboard"
                          : pathname === item.href || pathname.startsWith(item.href + "/"));
                      const showBalanceBadge = item.href === "/dashboard/credits" && admin?.type === "admin" && typeof balance === "number";

                      const itemClass = cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary-600 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      );

                      if (item.external) {
                        return (
                          <a
                            key={item.name}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setMobileMenuOpen(false)}
                            className={itemClass}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span className={cn("text-sm font-medium flex-1", sidebarCollapsed && "lg:hidden")}>{item.name}</span>
                          </a>
                        );
                      }

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={itemClass}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className={cn("text-sm font-medium flex-1", sidebarCollapsed && "lg:hidden")}>{item.name}</span>
                          {showBalanceBadge && (
                            <span
                              className={cn(
                                "text-xs font-semibold px-2 py-0.5 rounded-full",
                                sidebarCollapsed && "lg:hidden",
                                isNegativeBalance
                                  ? "bg-red-500 text-white"
                                  : isLowBalance
                                  ? "bg-yellow-500 text-gray-900"
                                  : "bg-gray-700 text-gray-200"
                              )}
                            >
                              ${balance!.toFixed(0)}
                            </span>
                          )}
                        </Link>
                      );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-800">
            {admin && (
              <div className="mb-4 px-4">
                <p className={cn("text-sm font-medium text-white", sidebarCollapsed && "lg:hidden")}>{admin.name}</p>
                <p className={cn("text-xs text-gray-400", sidebarCollapsed && "lg:hidden")}>{admin.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className={cn("text-sm font-medium", sidebarCollapsed && "lg:hidden")}>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
