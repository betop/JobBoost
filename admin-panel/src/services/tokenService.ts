import api from "./api";

export interface Token {
  id: string;
  token: string;
  user_id: string;
  user_name: string;
  user_type?: string;
  issued_date: string;
  expiration_date?: string;
  is_used: boolean;
  is_active: boolean;
  assigned_admin_ids?: string[];
  is_assigned?: boolean;
  allowed_ips?: string[];
}

export interface GenerateTokenInput {
  user_id: string;
  expiration_date?: string;
  allowed_ips?: string[];
}

export interface TokenRequest {
  id: string;
  requested_by: string;
  requester_name: string;
  user_id: string;
  user_name: string;
  expiration_date?: string;
  status: "pending" | "approved" | "declined";
  admin_notes?: string;
  review_notes?: string;
  reviewed_by?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  generated_token_id?: string;
  created_at: string;
}

// Response of POST /tokens/request: admin requests are auto-approved and the key is issued immediately
export interface CreatedTokenRequest extends TokenRequest {
  token: string;
  token_id: string;
}

export interface CreateTokenRequestInput {
  user_id: string;
  expiration_date?: string;
  notes?: string;
}

export const tokenService = {
  getAll: async (): Promise<Token[]> => {
    const response = await api.get("/tokens");
    return response.data;
  },

  generate: async (input: GenerateTokenInput): Promise<Token> => {
    const payload: Partial<GenerateTokenInput> = { user_id: input.user_id };
    if (input.expiration_date) payload.expiration_date = input.expiration_date;
    if (input.allowed_ips && input.allowed_ips.length > 0) payload.allowed_ips = input.allowed_ips;
    const response = await api.post("/tokens/generate", payload);
    return response.data;
  },

  revoke: async (id: string): Promise<void> => {
    await api.patch(`/tokens/${id}/revoke`);
  },

  activate: async (id: string): Promise<void> => {
    await api.patch(`/tokens/${id}/extend`);
  },

  extend: async (id: string, expiration_date?: string): Promise<void> => {
    await api.patch(`/tokens/${id}/extend`, { expiration_date: expiration_date || null });
  },

  updateAllowedIps: async (id: string, allowed_ips: string[]): Promise<{ id: string; allowed_ips: string[] }> => {
    const response = await api.patch(`/tokens/${id}/allowed-ips`, { allowed_ips });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tokens/${id}`);
  },

  // Token Request endpoints
  createRequest: async (input: CreateTokenRequestInput): Promise<CreatedTokenRequest> => {
    const response = await api.post("/tokens/request", input);
    return response.data;
  },

  getRequests: async (status?: string): Promise<TokenRequest[]> => {
    const params = status ? { status } : {};
    const response = await api.get("/tokens/requests", { params });
    return response.data;
  },

  approveRequest: async (id: string, review_notes?: string): Promise<{ token: string }> => {
    const response = await api.patch(`/tokens/requests/${id}/approve`, { review_notes });
    return response.data;
  },

  declineRequest: async (id: string, review_notes?: string): Promise<void> => {
    await api.patch(`/tokens/requests/${id}/decline`, { review_notes });
  },

  // Assign admins to a token (super_admin only)
  assignAdmins: async (tokenId: string, adminIds: string[]): Promise<void> => {
    await api.patch(`/tokens/${tokenId}/assign-admins`, { admin_ids: adminIds });
  },
};
