import api from "./api";

export interface Rule {
  id: string;
  sentence: string;
  target_section: "summary" | "work_experience" | "education" | "skills" | "global";
  is_active: boolean;
  created_at: string;
}

export interface CreateRuleInput {
  sentence: string;
  target_section: "summary" | "work_experience" | "education" | "skills" | "global";
  is_active: boolean;
}

export const ruleService = {
  getAll: async (): Promise<Rule[]> => {
    const response = await api.get("/rules");
    return response.data;
  },

  getById: async (id: string): Promise<Rule> => {
    const response = await api.get(`/rules/${id}`);
    return response.data;
  },

  create: async (rule: CreateRuleInput): Promise<Rule> => {
    const response = await api.post("/rules", rule);
    return response.data;
  },

  update: async (id: string, rule: Partial<CreateRuleInput>): Promise<Rule> => {
    const response = await api.put(`/rules/${id}`, rule);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/rules/${id}`);
  },
};
