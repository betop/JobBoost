import { format, parseISO } from "date-fns";

export function formatDate(date: string | Date): string {
  if (typeof date === "string") {
    // Handle YYYY-MM (month-only) format
    if (/^\d{4}-\d{2}$/.test(date)) {
      return format(parseISO(`${date}-01`), "MMM yyyy");
    }
    // Handle YYYY-MM-DD format - convert to YYYY-MM for display
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const yearMonth = date.slice(0, 7);
      return format(parseISO(`${yearMonth}-01`), "MMM yyyy");
    }
    return format(parseISO(date), "MMM dd, yyyy");
  }
  return format(date, "MMM dd, yyyy");
}

export function formatDateTime(date: string | Date): string {
  if (typeof date === "string") {
    return format(parseISO(date), "MMM dd, yyyy HH:mm");
  }
  return format(date, "MMM dd, yyyy HH:mm");
}
