import api from "./api";

export interface CreditTransaction {
  id: string;
  created_at: string;
  admin_id: string;
  type: "deposit" | "usage" | "adjustment";
  amount: number;
  balance_after: number;
  related_log_table?: string | null;
  related_log_id?: string | null;
  related_deposit_id?: string | null;
  note?: string | null;
}

export interface CreditBalanceResponse {
  admin_id: string;
  credit_balance: number;
  free_generations_remaining?: number;
  recent_transactions: CreditTransaction[];
}

export interface CreditTransactionsResponse {
  items: CreditTransaction[];
}

export interface AdminCreditSummary {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  is_approved: boolean;
  credit_balance: number;
  free_generations_remaining?: number;
}

export interface DepositResponse {
  deposit_id: string;
  provider?: string;
  payment_url: string;
  currency: string;
  amount_usd: number;
  status: string;
}

export interface CreditSettings {
  usage_rate: number;
  low_balance_threshold: number;
}

export type UsageAppKey = "resume_generation" | "assistant" | "mail_triage" | "other";

export interface UsageTokens {
  input: number;
  output: number;
  cache_write: number;
  cache_read: number;
}

export interface UsageByProfile {
  profile_id: string | null;
  profile_name: string;
  count: number;
  total_tokens: number;
  tracked_amount: number;
  amount: number;
}

export interface UsageByApp {
  by_profile?: UsageByProfile[];
  key: UsageAppKey;
  label: string;
  amount: number;
  count: number;
  tokens?: UsageTokens;
  tracked_count?: number;
  total_tokens?: number;
  tracked_amount?: number;
  untracked_count?: number;
}

export interface UsageSummaryResponse {
  date_from: string;
  date_to: string;
  admin_id?: string | null;
  total_spent: number;
  total_count: number;
  by_app: UsageByApp[];
  tokens?: UsageTokens;
  tracked_count?: number;
  total_tokens?: number;
  tracked_amount?: number;
  untracked_count?: number;
}

export const creditsService = {
  getUsageSummary: async (params: {
    date_from: string;
    date_to: string;
    admin_id?: string;
  }): Promise<UsageSummaryResponse> => {
    const query: Record<string, string> = {
      date_from: params.date_from,
      date_to: params.date_to,
    };
    if (params.admin_id) query.admin_id = params.admin_id;
    const response = await api.get("/dashboard/credits/usage-summary", { params: query });
    return response.data;
  },

  getSettings: async (): Promise<CreditSettings> => {
    const response = await api.get("/dashboard/credits/settings");
    return response.data;
  },

  // super_admin only
  updateSettings: async (usageRate: number): Promise<CreditSettings> => {
    const response = await api.put("/dashboard/credits/settings", {
      usage_rate: usageRate,
    });
    return response.data;
  },

  getBalance: async (adminId?: string): Promise<CreditBalanceResponse> => {
    const params = adminId ? { admin_id: adminId } : {};
    const response = await api.get("/dashboard/credits/balance", { params });
    return response.data;
  },

  getTransactions: async (params?: {
    admin_id?: string;
    type?: "deposit" | "usage" | "adjustment";
    page?: number;
    per_page?: number;
  }): Promise<CreditTransactionsResponse> => {
    const response = await api.get("/dashboard/credits/transactions", { params });
    return response.data;
  },

  deposit: async (amountUsd: number): Promise<DepositResponse> => {
    const response = await api.post("/dashboard/credits/deposit", {
      amount_usd: amountUsd,
    });
    return response.data;
  },

  // super_admin only
  listAdmins: async (): Promise<{ items: AdminCreditSummary[] }> => {
    const response = await api.get("/dashboard/credits/admins");
    return response.data;
  },

  // super_admin only
  adjust: async (adminId: string, amount: number, note?: string): Promise<void> => {
    await api.post("/dashboard/credits/adjustment", {
      admin_id: adminId,
      amount,
      note,
    });
  },
};
