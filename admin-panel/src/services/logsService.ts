import api from "./api";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import * as logCache from "./logCache";

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
  seniority: string | null;
  tech_scope: string | null;
  content_id: string | null;
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
  user_id?: string[];
  date_from?: string;
  date_to?: string;
  period?: LogsPeriod;
  is_matched?: ("1" | "0" | "2" | "3" | "4" | "5" | "6")[];
  is_regenerated?: ("0" | "1")[];
}

export interface RegenerateResponse {
  match_status: number;
  error_msg: string;
  resume_text: string;
  resume_filename: string;
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
   * Fetch ALL logs in parallel batches of up to CONCURRENT_PAGES requests at a time.
   * 1. First fetches the total record count.
   * 2. Computes all page offsets.
   * 3. Fires up to CONCURRENT_PAGES requests concurrently; each saves to IndexedDB as
   *    soon as it resolves (no waiting for the rest of the batch).
   * 4. A page that fails (e.g. 502 from a flaky upstream) is retried with backoff;
   *    if it still fails, it's skipped and reported — it never aborts the other pages.
   * 5. Repeats for the next group of pages until all are done.
   * 6. Saves lastSyncAt after all pages have been attempted.
   * `onBatch` is called after each page is persisted (for UI flush).
   * Returns the list of offsets that failed even after retries, so the caller can warn the user.
   */
  listAllPages: async (
    onBatch?: () => Promise<void>,
    pageSize = 500,
  ): Promise<{ failedOffsets: number[] }> => {
    const CONCURRENT_PAGES = 10;
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 1000;
    const syncStart = new Date().toISOString();

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchPage = async (offset: number): Promise<void> => {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(offset));
      const response = await api.get<LogsListResponse>(`/logs/list?${params.toString()}`);
      const items = response.data.items;
      if (items.length > 0) {
        await logCache.mergeRecords(items);
        if (onBatch) await onBatch();
      }
    };

    const fetchPageWithRetry = async (offset: number): Promise<void> => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          await fetchPage(offset);
          return;
        } catch (err) {
          if (attempt === MAX_ATTEMPTS) throw err;
          await sleep(RETRY_DELAY_MS * attempt);
        }
      }
    };

    // Step 1: get total count
    const countRes = await api.get<{ total: number }>(`/logs/list?count_only=true`);
    const total = Number(countRes.data.total) || 0;

    if (total === 0) {
      await logCache.setLastSyncAt(syncStart);
      return { failedOffsets: [] };
    }

    // Step 2: build all offsets
    const offsets: number[] = [];
    for (let off = 0; off < total; off += pageSize) {
      offsets.push(off);
    }

    // Step 3: process in groups of CONCURRENT_PAGES. Promise.allSettled means one
    // page failing (after retries) never stops the remaining groups from fetching.
    const failedOffsets: number[] = [];
    for (let i = 0; i < offsets.length; i += CONCURRENT_PAGES) {
      const group = offsets.slice(i, i + CONCURRENT_PAGES);

      const results = await Promise.allSettled(group.map((offset) => fetchPageWithRetry(offset)));

      results.forEach((result, idx) => {
        if (result.status === "rejected") {
          console.error(`[logsService] page offset=${group[idx]} failed after ${MAX_ATTEMPTS} attempts`, result.reason);
          failedOffsets.push(group[idx]);
        }
      });
    }

    // Step 4: all pages attempted — commit sync timestamp regardless, so successfully
    // fetched pages aren't re-fetched on the next delta sync. Failed offsets are reported
    // so the caller can prompt the user to retry (e.g. via another hard refresh).
    await logCache.setLastSyncAt(syncStart);

    return { failedOffsets };
  },

  /**
   * Delta fetch: returns all records whose updated_at >= updatedSince.
   * Persists results to IndexedDB and updates lastSyncAt.
   */
  listDelta: async (updatedSince: string): Promise<GenerationLog[]> => {
    const syncStart = new Date().toISOString();
    const params = new URLSearchParams();
    params.set("updated_since", updatedSince);

    const response = await api.get<LogsListResponse>(`/logs/list?${params.toString()}`);
    const items = response.data.items;

    if (items.length > 0) {
      await logCache.mergeRecords(items);
    }
    await logCache.setLastSyncAt(syncStart);

    return items;
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
