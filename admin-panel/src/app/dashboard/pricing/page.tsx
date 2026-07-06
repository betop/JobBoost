'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { profileService, type Profile } from '@/services/profileService';
import { userService, type User } from '@/services/userService';
import { toStartOfDayEST, toEndOfDayEST } from '@/services/logsService';
import api from '@/services/api';
import Button from '@/components/Button';
import { useAuthStore } from '@/store/authStore';

interface PricingData {
  generation: {
    log_count: number;
    input_tokens: number;
    output_tokens: number;
    cost: number;
  };
  chat: {
    log_count: number;
    input_tokens: number;
    output_tokens: number;
    cost: number;
  };
  mail_triage: {
    log_count: number;
    input_tokens: number;
    output_tokens: number;
    cost: number;
  };
  summary: {
    total_cost: number;
    total_logs: number;
  };
}

export default function PricingPage() {
  const router = useRouter();
  const admin = useAuthStore((state) => state.admin);
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (admin && admin.type !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [admin, router]);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return format(d, 'yyyy-MM-dd');
  });

  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [profileId, setProfileId] = useState('');
  const [userId, setUserId] = useState('');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bidders, setBidders] = useState<User[]>([]);

  useEffect(() => {
    loadProfilesAndBidders();
  }, []);

  const loadProfilesAndBidders = async () => {
    try {
      const profs = await profileService.getAll();
      setProfiles(profs);

      const all = await userService.getAll(undefined);
      const bidderList = all.filter((u) => u.type === 'bidder');
      setBidders(bidderList);
    } catch (err) {
      console.error('Error loading profiles/bidders:', err);
    }
    fetchPricing();
  };

  const fetchPricing = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        date_from: dateFrom ? toStartOfDayEST(dateFrom) : null,
        date_to: dateTo ? toEndOfDayEST(dateTo) : null,
        profile_id: profileId || null,
        user_id: userId || null,
      };

      const response = await api.post('/dashboard/usage-pricing', params);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch pricing data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatTokens = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const setLast7Days = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    setDateFrom(format(from, 'yyyy-MM-dd'));
    setDateTo(format(to, 'yyyy-MM-dd'));
  };

  const setLast30Days = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    setDateFrom(format(from, 'yyyy-MM-dd'));
    setDateTo(format(to, 'yyyy-MM-dd'));
  };

  const setLast90Days = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 90);
    setDateFrom(format(from, 'yyyy-MM-dd'));
    setDateTo(format(to, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Costs</h1>
        <p className="text-gray-600 mt-2">
          View AI token usage costs across resume generation, assistant, and mail triage services
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* Profile Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Profile</label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Profiles</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Bidder Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bidder</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Bidders</option>
              {bidders.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Date Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={setLast7Days}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Last 7 days
          </button>
          <button
            onClick={setLast30Days}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Last 30 days
          </button>
          <button
            onClick={setLast90Days}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Last 90 days
          </button>
          <Button
            onClick={fetchPricing}
            disabled={loading}
            className="ml-auto"
          >
            {loading ? 'Loading...' : 'Calculate'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Resume Generation */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-1">Resume Generation</h3>
            <p className="text-sm text-gray-600 mb-4">{data.generation.log_count} generations</p>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Input Tokens</p>
                <p className="text-lg font-semibold">{formatTokens(data.generation.input_tokens)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Output Tokens</p>
                <p className="text-lg font-semibold">{formatTokens(data.generation.output_tokens)}</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-600">Cost</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data.generation.cost)}
                </p>
              </div>
            </div>
          </div>

          {/* Resume Assistant */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-1">Resume Assistant</h3>
            <p className="text-sm text-gray-600 mb-4">{data.chat.log_count} interactions</p>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Input Tokens</p>
                <p className="text-lg font-semibold">{formatTokens(data.chat.input_tokens)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Output Tokens</p>
                <p className="text-lg font-semibold">{formatTokens(data.chat.output_tokens)}</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-600">Cost</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(data.chat.cost)}
                </p>
              </div>
            </div>
          </div>

          {/* Mail Triage */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-1">Mail Triage</h3>
            <p className="text-sm text-gray-600 mb-4">{data.mail_triage.log_count} emails processed</p>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Input Tokens</p>
                <p className="text-lg font-semibold">{formatTokens(data.mail_triage.input_tokens)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Output Tokens</p>
                <p className="text-lg font-semibold">{formatTokens(data.mail_triage.output_tokens)}</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-600">Cost</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.mail_triage.cost)}
                </p>
              </div>
            </div>
          </div>

          {/* Total Summary */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-1">Total</h3>
            <p className="text-sm opacity-75 mb-4">
              {data.summary.total_logs} total operations
            </p>
            <div>
              <p className="text-sm opacity-75">Total Cost</p>
              <p className="text-4xl font-bold">
                {formatCurrency(data.summary.total_cost)}
              </p>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">
            Select filters and click "Calculate" to view AI spend data
          </p>
        </div>
      )}
    </div>
  );
}
