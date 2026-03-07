import api from "./api";

function toStartOfDayISO(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toISOString();
}

function toEndOfDayISO(dateString: string): string {
  return new Date(`${dateString}T23:59:59.999`).toISOString();
}

export interface GenerationLog {
  id: string;
  created_at: string;
  profile_id: string;
  profile_name: string;
  bidder_id: string;
  bidder_name: string;
  job_url: string;
  job_description_snippet: string;
  job_description: string;
  ai_provider: string;
  input_tokens: number;
  output_tokens: number;
  resume_filename: string;
  cover_letter_filename: string;
  position_title: string;
  company_name: string;
  is_regenerated: number;  // 0=original, 1=regenerated
  original_log_id: string;
  is_matched: number | null;  // 1=matched, 0=mismatched, 2=skipped(not-remote), null=unknown
  match_reason: string;
}

export interface LogsListResponse {
  items: GenerationLog[];
  total: number;
  total_input_tokens: number;
  total_output_tokens: number;
}

export interface LogsStatsResponse {
  period: string;
  total_generations: number;
  total_input_tokens: number;
  total_output_tokens: number;
  claude_count: number;
  openai_count: number;
  matched_count: number;
  mismatched_count: number;
  skipped_count: number;
  all_time_total: number;
  all_time_input_tokens: number;
  all_time_output_tokens: number;
}

export interface LogsFilters {
  profile_id?: string;
  bidder_id?: string;
  date_from?: string;
  date_to?: string;
  period?: "today" | "week" | "month" | "custom";
  is_matched?: "1" | "0" | "2";
  is_regenerated?: "1" | "0";
}

export interface RegenerateResponse {
  skipped: boolean;
  is_matched: number;
  match_reason: string;
  resume_text: string;
  resume_filename: string;
}

export const logsService = {
  list: async (filters: LogsFilters = {}): Promise<LogsListResponse> => {
    const params = new URLSearchParams();
    if (filters.profile_id) params.set("profile_id", filters.profile_id);
    if (filters.bidder_id) params.set("bidder_id", filters.bidder_id);
    if (filters.date_from) params.set("date_from", toStartOfDayISO(filters.date_from));
    if (filters.date_to) params.set("date_to", toEndOfDayISO(filters.date_to));
    if (filters.period && filters.period !== "custom") params.set("period", filters.period);
    if (filters.is_matched !== undefined) params.set("is_matched", filters.is_matched);
    const response = await api.get(`/logs/list?${params.toString()}`);
    return response.data;
  },

  stats: async (period: string = "month", profile_id?: string, bidder_id?: string): Promise<LogsStatsResponse> => {
    const params = new URLSearchParams({ period });
    if (profile_id) params.set("profile_id", profile_id);
    if (bidder_id) params.set("bidder_id", bidder_id);
    const response = await api.get(`/logs/stats?${params.toString()}`);
    return response.data;
  },

  regenerate: async (logId: string): Promise<RegenerateResponse> => {
    const response = await api.post(`/resume/regenerate`, { log_id: logId });
    return response.data;
  },
};
