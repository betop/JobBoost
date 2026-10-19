import api from "./api";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

type LogsPeriod = "today" | "week" | "month" | "custom";

const EST = "America/New_York";

/**
 * Returns an ISO string representing 00:00:00 EST on the given YYYY-MM-DD date.
 */
export function toStartOfDayEST(dateString: string): string {
  return fromZonedTime(`${dateString}T00:00:00`, EST).toISOString();
}

/**
 * Returns an ISO string representing 23:59:59.999 EST on the given YYYY-MM-DD date.
 */
export function toEndOfDayEST(dateString: string): string {
  return fromZonedTime(`${dateString}T23:59:59.999`, EST).toISOString();
}

/** Returns today's date as YYYY-MM-DD in EST. */
function todayEST(): string {
  const est = toZonedTime(new Date(), EST);
  const year = est.getFullYear();
  const month = `${est.getMonth() + 1}`.padStart(2, "0");
  const day = `${est.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Returns YYYY-MM-DD in EST for the given Date object. */
function formatESTDate(date: Date): string {
  const est = toZonedTime(date, EST);
  const year = est.getFullYear();
  const month = `${est.getMonth() + 1}`.padStart(2, "0");
  const day = `${est.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRangeForPeriod(period?: LogsPeriod): { dateFrom?: string; dateTo?: string } {
  if (!period || period === "custom") {
    return {};
  }

  const today = todayEST();
  const nowEST = toZonedTime(new Date(), EST);

  if (period === "today") {
    return { dateFrom: today, dateTo: today };
  }

  if (period === "week") {
    // Week = Sunday 00:00 EST – Saturday 23:59 EST
    const dayOfWeek = nowEST.getDay(); // 0=Sun
    const weekStart = new Date(nowEST);
    weekStart.setDate(nowEST.getDate() - dayOfWeek); // back to Sunday
    return { dateFrom: formatESTDate(weekStart), dateTo: today };
  }

  if (period === "month") {
    // Month = 1st of current month 00:00 EST – today 23:59 EST
    const monthStart = new Date(nowEST.getFullYear(), nowEST.getMonth(), 1);
    return { dateFrom: formatESTDate(monthStart), dateTo: today };
  }

  return {};
}

export interface GenerationLog {
  id: string;
  created_at: string;
  updated_at: string;
  profile_id: string;
  profile_name: string;
  user_id: string;
  user_name: string;
  user_deleted?: boolean;
  job_url: string;
  job_description_snippet: string;
  job_description: string;
  has_job_description?: boolean;
  ai_provider: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  // Billing fields — returned to super_admin only. est_cost_usd = raw provider cost x price rate,
  // computed server-side with the same logic as billing (model prices, 1h cache write, rate).
  ai_model?: string | null;
  usage_rate?: number | string | null;
  charged_amount?: number | string | null;
  billing_admin_id?: string | null;
  raw_cost_usd?: number | string | null;
  usage_rate_applied?: number | string | null;
  est_cost_usd?: number | string | null;
  resume_filename: string;
  cover_letter_filename: string;
  position_title: string;
  company_name: string;
  is_regenerated: number;  // 0=original, 1=regenerated
  original_log_id: string;
  is_matched: number | null;  // 1=matched, 0=mismatched, 2=skipped(not-remote), 3=not_job_description, 4=duplicate_url, 5=reposted, 6=error, null=unknown
  match_reason: string;
  is_applied: boolean;
  seniority: string | null;
  tech_scope: string | null;
  content_id: string | null;
}

export interface LogsListResponse {
  items: GenerationLog[];
  /** Logs matching the query across all pages */
  total: number;
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
  duplicated_count: number;
  not_jd_count: number;
  reposted_count: number;
  error_count: number;
  applied_count: number;
  all_time_total: number;
  all_time_input_tokens: number;
  all_time_output_tokens: number;
}

export interface LogsFilters {
  profile_id?: string[];
  user_id?: string[];
  date_from?: string;
  date_to?: string;
  period?: LogsPeriod;
  is_matched?: ("1" | "0" | "2" | "3" | "4" | "5" | "6")[];
  is_regenerated?: ("0" | "1")[];
  /** Claude model id the generation used (client-side filter) */
  ai_model?: string[];
}

export interface RegenerateResponse {
  match_status: number;
  error_msg: string;
  resume_text: string;
  resume_filename: string;
}

export interface LogsQuery {
  date_from?: string;
  date_to?: string;
  search?: string;
  sort_field?: string;
  sort_dir?: "asc" | "desc";
  offset?: number;
  limit?: number;
  profile_ids?: string[];
  user_ids?: string[];
  matched?: string[];
  regenerated?: string[];
  ai_models?: string[];
}

export interface LogsSummaryResponse {
  total: number;
  by_status: Record<string, number>;
  applied: number;
  claude_count: number;
  openai_count: number;
  input_tokens: number;
  output_tokens: number;
  cache_write_tokens: number;
  cache_read_tokens: number;
  raw_cost_usd: number | null;
  est_cost_usd: number | null;
}

/** Query string for logs endpoints. Arrays are sent as `name[]=a&name[]=b` (repeated plain keys keep only the last value). */
export function buildLogsQuery(q: LogsQuery): string {
  const p = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== null && value !== "") p.set(key, String(value));
  };
  const list = (key: string, values?: string[]) => {
    values?.forEach((v) => p.append(`${key}[]`, v));
  };
  set("date_from", q.date_from);
  set("date_to", q.date_to);
  set("search", q.search?.trim());
  set("sort_field", q.sort_field);
  set("sort_dir", q.sort_dir);
  set("offset", q.offset);
  set("limit", q.limit);
  list("profile_ids", q.profile_ids);
  list("user_ids", q.user_ids);
  list("matched", q.matched);
  list("regenerated", q.regenerated);
  list("ai_models", q.ai_models);
  return p.toString();
}

export const logsService = {
  /** One page of logs. Search, sort, filters and paging are all server-side. */
  listPage: async (query: LogsQuery): Promise<LogsListResponse> => {
    const response = await api.get(`/logs/list?${buildLogsQuery(query)}`);
    return response.data;
  },

  /** Totals for the stat cards over every log matching the query (not just one page). */
  summary: async (query: LogsQuery): Promise<LogsSummaryResponse> => {
    const response = await api.get(`/logs/summary?${buildLogsQuery(query)}`);
    return response.data;
  },

  stats: async (
    period: LogsPeriod = "month",
    profile_id?: string,
    user_id?: string,
    date_from?: string,
    date_to?: string,
  ): Promise<LogsStatsResponse> => {
    const params = new URLSearchParams({ period });
    const periodRange = getDateRangeForPeriod(period);
    const effectiveDateFrom = date_from ?? periodRange.dateFrom;
    const effectiveDateTo = date_to ?? periodRange.dateTo;

    if (profile_id) params.set("profile_id", profile_id);
    if (user_id) params.set("user_id", user_id);
    if (effectiveDateFrom) params.set("date_from", toStartOfDayEST(effectiveDateFrom));
    if (effectiveDateTo) params.set("date_to", toEndOfDayEST(effectiveDateTo));
    const response = await api.get(`/logs/stats?${params.toString()}`);
    return response.data;
  },

  /** Fetch the heavy job_description of one log on demand (list omits it). */
  getJobDescription: async (logId: string): Promise<string> => {
    const response = await api.get<{ id: string; job_description: string | null }>(`/logs/jd?log_id=${logId}`);
    return response.data.job_description ?? "";
  },

  regenerate: async (logId: string, forceGenerate = false): Promise<RegenerateResponse> => {
    const response = await api.post(`/resume/regenerate`, {
      log_id: logId,
      force_generate: forceGenerate || undefined,
    });
    return response.data;
  },

  /** Fetch the saved AI raw_response for a given content_id */
  getContent: async (contentId: string): Promise<{ id: string; raw_response: string }> => {
    const response = await api.get(`/resume/get_content?content_id=${contentId}`);
    return response.data;
  },

  /** One-time recovery: populate null user_id fields by mapping profile_id → user */
  recoverUserIds: async (): Promise<{ success: boolean; total_logs: number; updated_count: number; skipped_count: number }> => {
    const response = await api.post("/logs/recover-user-ids");
    return response.data;
  },
};
