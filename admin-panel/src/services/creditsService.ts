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
}

export interface DepositResponse {
  deposit_id: string;
  provider?: string;
  payment_url: string;
  currency: string;
  amount_usd: number;
  status: string;
}

export const creditsService = {
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
