import api from "./api";

export interface DashboardStats {
  total_profiles: number;
  total_bidders: number;
  active_tokens: number;
  active_rules: number;
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get("/dashboard/stats");
    return response.data;
  },
};
