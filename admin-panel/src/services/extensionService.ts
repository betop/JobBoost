export type ExtensionStatus = "draft" | "live" | "archived";

export interface ExtensionVersion {
  id: number | string;
  extension_name: string;
  version: string;
  release_date: string | null;
  created_at: string | number | null;
  released_at: string | number | null;
  released_by_name: string | null;
  status: ExtensionStatus;
  is_current: boolean;
  changelog: string | null;
  min_extension_version: string | null;
  file_name: string | null;
  file_size: number | null;
  file_url: string | null;
}

export interface PublicDownload {
  extension_name: string;
  display_name: string;
  version: string;
  release_date: string | null;
  released_at: string | number | null;
  changelog: string | null;
  file_name: string | null;
  file_size: number | null;
  download_url: string | null;
}

export interface VersionInput {
  extension_name?: string;
  version?: string;
  changelog?: string;
  min_extension_version?: string;
  file?: File | null;
}

export const EXTENSIONS = [
  { key: "swiftcv", label: "SwiftCV" },
  { key: "mail-triage", label: "Mail Triage" },
] as const;

export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const VERSION_REGEX = /^\d+(\.\d+){1,2}$/;

const BASE = "/api/extensions";

function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function errorFrom(status: number, text: string): Error {
  let msg = "";
  try {
    const j = JSON.parse(text);
    msg = j?.message || j?.error || "";
  } catch {
    /* not json */
  }
  return new Error(msg || `Request failed (${status})`);
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { ...(auth ? authHeader() : {}) };
  if (init.body && typeof init.body === "string") headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw errorFrom(res.status, text);
  return (text ? JSON.parse(text) : null) as T;
}

function sendMultipart<T>(
  method: "POST" | "PATCH",
  path: string,
  input: VersionInput,
  onProgress?: (pct: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    if (input.extension_name !== undefined) fd.append("extension_name", input.extension_name);
    if (input.version !== undefined) fd.append("version", input.version);
    if (input.changelog !== undefined) fd.append("changelog", input.changelog);
    if (input.min_extension_version) fd.append("min_extension_version", input.min_extension_version);
    if (input.file) fd.append("file", input.file);

    const xhr = new XMLHttpRequest();
    xhr.open(method, `${BASE}${path}`);
    const h = authHeader();
    if (h.Authorization) xhr.setRequestHeader("Authorization", h.Authorization);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          resolve(null as T);
        }
      } else {
        reject(errorFrom(xhr.status, xhr.responseText));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(fd);
  });
}

export const extensionService = {
  listVersions: () => request<ExtensionVersion[]>("/versions"),
  createVersion: (input: VersionInput, onProgress?: (pct: number) => void) =>
    sendMultipart<ExtensionVersion>("POST", "/versions", input, onProgress),
  updateVersion: (id: number | string, input: VersionInput, onProgress?: (pct: number) => void) =>
    sendMultipart<ExtensionVersion>("PATCH", `/versions/${id}`, input, onProgress),
  release: (id: number | string) =>
    request<ExtensionVersion>(`/versions/${id}/set-current`, { method: "PATCH" }),
  deleteVersion: (id: number | string) => request<unknown>(`/versions/${id}`, { method: "DELETE" }),
  // Public endpoint: no auth header, no 401 redirect handling
  listPublicDownloads: () => request<PublicDownload[]>("/public-downloads", {}, false),
};

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function versionSortKey(v: ExtensionVersion): number {
  const t = new Date(v.created_at ?? v.release_date ?? 0).getTime();
  return isNaN(t) ? 0 : t;
}
