import api from "./api";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  job_category?: string;
  resume_template?: number;
  created_at: string;
  is_approved: boolean;
  include_key_projects: boolean;
  include_certifications: boolean;
  include_achievements: boolean;
  education: Education[];
  work_experience: WorkExperience[];
}

export interface Education {
  id?: string;
  university?: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date?: string;
  location?: string;
}

export interface WorkExperience {
  id?: string;
  job_title: string;
  company?: string;
  employment_type?: string;
  location?: string;
  start_date: string;
  end_date?: string;
  is_current?: boolean;
}

export interface CreateProfileInput {
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  job_category?: string;
  resume_template?: number;
  education: Omit<Education, "id">[];
  work_experience: Omit<WorkExperience, "id">[];
  include_key_projects?: boolean;
  include_certifications?: boolean;
  include_achievements?: boolean;
}

export const profileService = {
  getAll: async (): Promise<Profile[]> => {
    const response = await api.get("/profiles");
    return response.data;
  },

  getById: async (id: string): Promise<Profile> => {
    const response = await api.get(`/profiles/${id}`);
    return response.data;
  },

  create: async (profile: CreateProfileInput): Promise<Profile> => {
    const response = await api.post("/profiles", profile);
    return response.data;
  },

  update: async (id: string, profile: Partial<CreateProfileInput>): Promise<Profile> => {
    const response = await api.put(`/profiles/${id}`, profile);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/profiles/${id}`);
  },

  approve: async (id: string, is_approved: boolean): Promise<Profile> => {
    const response = await api.patch(`/profiles/${id}/approve`, { is_approved });
    return response.data;
  },
};
