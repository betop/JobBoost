import api from "./api";

export interface Bidder {
  id: string;
  full_name: string;
  email: string;
  profile_ids?: string[];
  profile_names?: string[];
  is_active: boolean;
  created_at: string;
}

export interface CreateBidderInput {
  full_name: string;
  email: string;
  profile_ids?: string[];
  is_active: boolean;
}

export const bidderService = {
  getAll: async (): Promise<Bidder[]> => {
    const response = await api.get("/bidders");
    return response.data;
  },

  getById: async (id: string): Promise<Bidder> => {
    const response = await api.get(`/bidders/${id}`);
    return response.data;
  },

  create: async (bidder: CreateBidderInput): Promise<Bidder> => {
    const response = await api.post("/bidders", bidder);
    return response.data;
  },

  update: async (id: string, bidder: Partial<CreateBidderInput>): Promise<Bidder> => {
    const response = await api.put(`/bidders/${id}`, bidder);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/bidders/${id}`);
  },

  deactivate: async (id: string): Promise<void> => {
    await api.patch(`/bidders/${id}/deactivate`);
  },
};
