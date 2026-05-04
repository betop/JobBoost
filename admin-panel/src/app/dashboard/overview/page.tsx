"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toZonedTime } from "date-fns-tz";
import { userService, User } from "@/services/userService";
import { profileService, Profile } from "@/services/profileService";
import { useAuthStore } from "@/store/authStore";
import * as logCache from "@/services/logCache";
import { toStartOfDayEST, toEndOfDayEST } from "@/services/logsService";
import type { GenerationLog } from "@/services/logsService";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { BarChart2, Users, LayoutList } from "lucide-react";

const EST = "America/New_York";

function todayEST(): string {
  const est = toZonedTime(new Date(), EST);
  return [
    est.getFullYear(),
    String(est.getMonth() + 1).padStart(2, "0"),
    String(est.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildHourlyData(records: GenerationLog[]): { hour: string; count: number }[] {
  const counts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) counts[h] = 0;

  for (const r of records) {
    const est = toZonedTime(new Date(r.created_at), EST);
    const hour = est.getHours();
    counts[hour] = (counts[hour] ?? 0) + 1;
  }

  return Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    count: counts[h],
  }));
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-indigo-600 font-bold">{payload[0].value} applications</p>
    </div>
  );
}

export default function OverviewPage() {
  const admin = useAuthStore((state) => state.admin);
  const isSuperAdmin = admin?.type === "super_admin";

  const [selectedDate, setSelectedDate] = useState(todayEST());
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("all");

  // Load all bidder users for the selector
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users", "bidder"],
    queryFn: () => userService.getAll("bidder"),
    staleTime: 10 * 60 * 1000,
  });

  // Load all profiles for the selector
  const { data: allProfiles = [] } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: () => profileService.getAll(),
    staleTime: 10 * 60 * 1000,
  });

  // When user changes, reset profile selection
  const handleUserChange = (uid: string) => {
    setSelectedUserId(uid);
    setSelectedProfileId("all");
  };

  // Load records from IndexedDB for the selected date
  const [records, setRecords] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    logCache
      .getCachedRecords(toStartOfDayEST(selectedDate), toEndOfDayEST(selectedDate))
      .then(setRecords)
      .finally(() => setLoading(false));
  }, [selectedDate]);

  // Filter by user and/or profile
  const filtered = useMemo(() => {
    let result = records;
    if (selectedUserId !== "all") result = result.filter((r) => r.user_id === selectedUserId);
    if (selectedProfileId !== "all") result = result.filter((r) => r.profile_id === selectedProfileId);
    return result;
  }, [records, selectedUserId, selectedProfileId]);

  // Profiles available in the current user-filtered records (for scoped dropdown)
  const availableProfiles = useMemo(() => {
    const userFiltered = selectedUserId === "all" ? records : records.filter((r) => r.user_id === selectedUserId);
    const ids = new Set(userFiltered.map((r) => r.profile_id));
    return allProfiles.filter((p) => ids.has(p.id));
  }, [records, selectedUserId, allProfiles]);

  // Build hourly data for chart
  const chartData = useMemo(() => buildHourlyData(filtered), [filtered]);

  // Summary stats
  const totalApplications = filtered.length;
  const peakHour = useMemo(() => {
    let max = 0, peakH = -1;
    chartData.forEach(({ count }, i) => { if (count > max) { max = count; peakH = i; } });
    return peakH >= 0 && max > 0 ? chartData[peakH].hour : null;
  }, [chartData]);

  const activeHours = chartData.filter((d) => d.count > 0).length;

  // Current EST hour for reference line
  const currentHour = toZonedTime(new Date(), EST).getHours();
  const isToday = selectedDate === todayEST();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Hourly application activity per user and date</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={selectedDate}
            max={todayEST()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            <Users className="inline w-3 h-3 mr-1" />
            User
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => handleUserChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[180px]"
          >
            <option value="all">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            <LayoutList className="inline w-3 h-3 mr-1" />
            Profile
          </label>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            disabled={availableProfiles.length === 0}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">All Profiles</option>
            {availableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Applications</p>
          <p className="text-2xl font-bold text-gray-900">{totalApplications}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Peak Hour</p>
          <p className="text-2xl font-bold text-indigo-600">{peakHour ?? "—"}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Active Hours</p>
          <p className="text-2xl font-bold text-gray-900">{activeHours} / 24</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-900">
            Applications by Hour
            <span className="ml-2 text-sm font-normal text-gray-400">({selectedDate})</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            Loading…
          </div>
        ) : totalApplications === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <BarChart2 className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No applications found for this date / user</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                interval={1}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                width={32}
              />
              <Tooltip content={<CustomTooltip />} />
              {isToday && (
                <ReferenceLine
                  x={chartData[currentHour]?.hour}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  label={{ value: "Now", position: "top", fontSize: 10, fill: "#f59e0b" }}
                />
              )}
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.count === 0) return <g key={props.key} />;
                  return (
                    <circle key={props.key} cx={cx} cy={cy} r={4} fill="#6366f1" stroke="#fff" strokeWidth={1.5} />
                  );
                }}
                activeDot={{ r: 6, fill: "#4f46e5" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
