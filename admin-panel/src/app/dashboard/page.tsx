"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { logsService } from "@/services/logsService";
import { Users, UserCheck, Key, FileText, Activity, Cpu } from "lucide-react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardService.getStats,
  });

  const { data: logStats, error: logStatsError, isError: logStatsIsError } = useQuery({
    queryKey: ["logs-stats-dashboard"],
    queryFn: () => logsService.stats("month"),
    retry: false,
  });

  if (logStatsError) {
    console.error("[Dashboard] logs/stats error:", logStatsError);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const widgets = [
    {
      title: "Total Profiles",
      value: stats?.total_profiles || 0,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Total Bidders",
      value: stats?.total_bidders || 0,
      icon: UserCheck,
      color: "bg-green-500",
    },
    {
      title: "Active Tokens",
      value: stats?.active_tokens || 0,
      icon: Key,
      color: "bg-yellow-500",
    },
    {
      title: "Active Rules",
      value: stats?.active_rules || 0,
      icon: FileText,
      color: "bg-purple-500",
    },
    {
      title: "Generations (30d)",
      value: logStats?.total_generations || 0,
      icon: Activity,
      color: "bg-indigo-500",
      href: "/dashboard/logs",
    },
    {
      title: "Total Tokens (30d)",
      value: ((logStats?.total_input_tokens || 0) + (logStats?.total_output_tokens || 0)).toLocaleString(),
      icon: Cpu,
      color: "bg-orange-500",
      href: "/dashboard/logs",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome to HHQ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {widgets.map((widget) => {
          const Icon = widget.icon;
          const card = (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {widget.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1.5">
                    {widget.value}
                  </p>
                </div>
                <div
                  className={`${widget.color} w-10 h-10 rounded-lg flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
          return widget.href ? (
            <Link key={widget.title} href={widget.href}>{card}</Link>
          ) : (
            <div key={widget.title}>{card}</div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Token Usage (30d)</h2>
            <Link href="/dashboard/logs" className="text-xs text-blue-600 hover:underline">
              View all logs →
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Input tokens</span>
              <span className="font-medium text-purple-600">
                {(logStats?.total_input_tokens || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Output tokens</span>
              <span className="font-medium text-green-600">
                {(logStats?.total_output_tokens || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
              <span className="text-gray-600">Claude generations</span>
              <span className="font-medium text-orange-600">{logStats?.claude_count || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">OpenAI generations</span>
              <span className="font-medium text-green-600">{logStats?.openai_count || 0}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
              <span className="text-gray-600 font-medium">All-time generations</span>
              <span className="font-bold text-gray-900">{logStats?.all_time_total || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-2">
            <Link
              href="/dashboard/profiles/new"
              className="block px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              + Create New Profile
            </Link>
            <Link
              href="/dashboard/bidders/new"
              className="block px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              + Add New Bidder
            </Link>
            <Link
              href="/dashboard/tokens"
              className="block px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              + Generate Token
            </Link>
            <Link
              href="/dashboard/logs"
              className="block px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              → View Generation Logs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
