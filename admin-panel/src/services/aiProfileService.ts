import api from "./api";
import type { CreateProfileInput } from "./profileService";

export const aiProfileService = {
  parseResumeText: async (text: string): Promise<CreateProfileInput> => {
    const response = await api.post("/ai/parse-profile", { text });
    return response.data;
  },
};
