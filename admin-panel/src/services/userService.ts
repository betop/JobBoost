import api from "./api";

export type UserType = "bidder" | "admin" | "super_admin";

export interface User {
  id: string;
  full_name: string;
  email: string;
  type: UserType;
  profile_ids?: string[];
  profile_names?: string[];
  is_active: boolean;
  created_at: string;
}

export interface CreateUserInput {
  full_name: string;
  email: string;
  type: UserType;
  password?: string;
  profile_ids?: string[];
  is_active: boolean;
}

export const userService = {
  getAll: async (type?: UserType): Promise<User[]> => {
    const params = type ? { type } : {};
    const response = await api.get("/users", { params });
    return response.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (input: CreateUserInput): Promise<User> => {
    const response = await api.post("/users", input);
    return response.data;
  },

  update: async (id: string, input: Partial<CreateUserInput>): Promise<User> => {
    const response = await api.put(`/users/${id}`, input);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  deactivate: async (id: string): Promise<void> => {
    await api.put(`/users/${id}`, { is_active: false });
  },
};
