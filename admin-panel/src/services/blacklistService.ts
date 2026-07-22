import api from "./api";

export interface BlacklistEntry {
  id: string;
  name: string;
  created_at: string;
}

export interface AddBlacklistResult {
  added: string[];
  skipped: string[];
}

export const blacklistService = {
  getAll: async (): Promise<BlacklistEntry[]> => {
    const response = await api.get("/blacklist");
    return response.data;
  },

  addMany: async (names: string[]): Promise<AddBlacklistResult> => {
    const response = await api.post("/blacklist", { names });
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/blacklist/${id}`);
  },
};
