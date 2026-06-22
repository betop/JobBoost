import api from "./api";

export interface AllowlistEntry {
  id: string;
  email: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAllowlistInput {
  email: string;
  notes?: string;
}

export const mailTriageAllowlistService = {
  getAll: async (): Promise<AllowlistEntry[]> => {
    const response = await api.get("/mail_triage_allowlist");
    return response.data;
  },

  create: async (input: CreateAllowlistInput): Promise<AllowlistEntry> => {
    const response = await api.post("/mail_triage_allowlist", input);
    return response.data;
  },

  update: async (id: string, input: Partial<CreateAllowlistInput>): Promise<AllowlistEntry> => {
    const response = await api.put(`/mail_triage_allowlist/${id}`, input);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/mail_triage_allowlist/${id}`);
  },
};
