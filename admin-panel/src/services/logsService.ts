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
  is_matched: number | null;  // 1=matched, 0=mismatched, 2=skipped(not-remote), 3=not_job_description, 4=duplicate_url, 5=reposted, 6=error, null=unknown
  match_reason: string;
  is_applied: boolean;
}

export interface LogsListResponse {
  items: GenerationLog[];
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
  bidder_id?: string[];
  date_from?: string;
  date_to?: string;
  period?: LogsPeriod;
  is_matched?: ("1" | "0" | "2" | "3" | "4" | "5" | "6")[];
  is_regenerated?: ("0" | "1")[];
}

export interface RegenerateResponse {
  skipped: boolean;
  log_id?: string;
  is_matched: number;
  match_reason: string;
  resume_text: string;
  cover_letter_text?: string;
  resume_filename: string;
  cover_letter_filename?: string;
  is_admin?: boolean;
}

export const logsService = {
  /** Fetch logs for a date range — no bidder/profile/status filtering (done client-side) */
  list: async (filters: LogsFilters = {}): Promise<LogsListResponse> => {
    const params = new URLSearchParams();
    const periodRange = getDateRangeForPeriod(filters.period);
    const effectiveDateFrom = filters.date_from ?? periodRange.dateFrom;
    const effectiveDateTo = filters.date_to ?? periodRange.dateTo;

    if (effectiveDateFrom) params.set("date_from", toStartOfDayEST(effectiveDateFrom));
    if (effectiveDateTo) params.set("date_to", toEndOfDayEST(effectiveDateTo));
    const response = await api.get(`/logs/list?${params.toString()}`);
    return response.data;
  },

  /**
   * Fetch ALL logs for a given date range in a single request.
   * Used for full initial loads (especially "all time").
   */
  listAllPages: async (dateFrom?: string, dateTo?: string): Promise<GenerationLog[]> => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", toStartOfDayEST(dateFrom));
    if (dateTo)   params.set("date_to",   toEndOfDayEST(dateTo));

    const response = await api.get<LogsListResponse>(`/logs/list?${params.toString()}`);
    return response.data.items;
  },

  /**
   * Delta fetch: returns all records whose created_at OR updated_at >= updatedSince.
   */
  listDelta: async (updatedSince: string): Promise<GenerationLog[]> => {
    const params = new URLSearchParams();
    params.set("updated_since", updatedSince);

    const response = await api.get<LogsListResponse>(`/logs/list?${params.toString()}`);
    return response.data.items;
  },

  stats: async (
    period: LogsPeriod = "month",
    profile_id?: string,
    bidder_id?: string,
    date_from?: string,
    date_to?: string,
  ): Promise<LogsStatsResponse> => {
    const params = new URLSearchParams({ period });
    const periodRange = getDateRangeForPeriod(period);
    const effectiveDateFrom = date_from ?? periodRange.dateFrom;
    const effectiveDateTo = date_to ?? periodRange.dateTo;

    if (profile_id) params.set("profile_id", profile_id);
    if (bidder_id) params.set("bidder_id", bidder_id);
    if (effectiveDateFrom) params.set("date_from", toStartOfDayEST(effectiveDateFrom));
    if (effectiveDateTo) params.set("date_to", toEndOfDayEST(effectiveDateTo));
    const response = await api.get(`/logs/stats?${params.toString()}`);
    return response.data;
  },

  regenerate: async (logId: string, forceGenerate = false): Promise<RegenerateResponse> => {
    const response = await api.post(`/resume/regenerate`, {
      log_id: logId,
      force_generate: forceGenerate || undefined,
    });
    return response.data;
  },
};
