import api from "./api";

export interface Token {
  id: string;
  token: string;
  bidder_id: string;
  bidder_name: string;
  issued_date: string;
  expiration_date?: string;
  is_used: boolean;
  is_active: boolean;
  is_admin: boolean;
}

export interface GenerateTokenInput {
  bidder_id: string;
  expiration_date?: string;
  is_admin?: boolean;
}

export const tokenService = {
  getAll: async (): Promise<Token[]> => {
    const response = await api.get("/tokens");
    return response.data;
  },

  generate: async (input: GenerateTokenInput): Promise<Token> => {
    const payload: Partial<GenerateTokenInput> = { bidder_id: input.bidder_id };
    if (input.expiration_date) payload.expiration_date = input.expiration_date;
    if (input.is_admin) payload.is_admin = true;
    const response = await api.post("/tokens/generate", payload);
    return response.data;
  },

  revoke: async (id: string): Promise<void> => {
    await api.patch(`/tokens/${id}/revoke`);
  },

  extend: async (id: string, expiration_date?: string): Promise<void> => {
    await api.patch(`/tokens/${id}/extend`, { expiration_date: expiration_date || null });
  },

  toggleAdmin: async (id: string, is_admin: boolean): Promise<void> => {
    await api.patch(`/tokens/${id}/toggle-admin`, { is_admin });
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tokens/${id}`);
  },
};
