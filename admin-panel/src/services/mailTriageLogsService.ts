import api from "./api";
import { toStartOfDayEST, toEndOfDayEST } from "./logsService";

export interface MailTriageLog {
  id: string;
  created_at: string;
  gmail_email: string | null;
  profile_id: string | null;
  profile_name: string | null;
  input_tokens: number;
  output_tokens: number;
  email_count: number;
}

export interface MailTriageLogsResponse {
  items: MailTriageLog[];
}

// Claude pricing per 1M tokens (USD) — same as generation logs
const PRICING = { input: 1.0, output: 5.0 };

export function calcMailTriageCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * PRICING.input + outputTokens * PRICING.output) / 1_000_000;
}

export const mailTriageLogsService = {
  list: async (dateFrom?: string, dateTo?: string): Promise<MailTriageLogsResponse> => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", toStartOfDayEST(dateFrom));
    if (dateTo) params.set("date_to", toEndOfDayEST(dateTo));
    const response = await api.get(`/logs/mail-triage-logs?${params.toString()}`);
    return response.data;
  },
};
