import api from "./api";

export interface AccessControl {
  id: string;
  bidder_id: string;
  bidder_name: string;
  profile_id: string;
  profile_name: string;
  granted_by: string;
  granted_date: string;
  expiration_date?: string;
  is_active: boolean;
}

export const accessControlService = {
  getAll: async (): Promise<AccessControl[]> => {
    const response = await api.get("/access-control");
    return response.data;
  },

  revoke: async (id: string): Promise<void> => {
    await api.patch(`/access-control/${id}/revoke`);
  },

  updateExpiration: async (id: string, expiration_date: string): Promise<void> => {
    await api.patch(`/access-control/${id}/expiration`, { expiration_date });
  },
};
