import api from "./api";

export interface TemplateVisibility {
  admin_visible_template_ids: number[];
}

export const templateVisibilityService = {
  get: async (): Promise<TemplateVisibility> => {
    const response = await api.get("/dashboard/template-visibility");
    return response.data;
  },

  update: async (admin_visible_template_ids: number[]): Promise<TemplateVisibility> => {
    const response = await api.patch("/dashboard/template-visibility", { admin_visible_template_ids });
    return response.data;
  },
};
