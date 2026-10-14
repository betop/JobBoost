// Single source of truth for where the admin panel talks to Xano.
//
// Environment variables (server-side; set per Vercel environment):
//   XANO_HOST          Xano instance origin. Default: https://api.shsws-solutions.com
//   XANO_BRANCH        Xano branch label to call, e.g. "staging". Empty/unset = the live (production) branch.
//   XANO_DATA_SOURCE   Xano data source to use, e.g. "test". Empty/unset = "live".
//
// A non-live branch is reached by appending ":<branch>" to the API group canonical id
// (https://<host>/api:<canonical>:<branch>/...). Branches only copy logic: tables/data are SHARED
// with the live branch unless XANO_DATA_SOURCE points at a separate data source.
//
// Safety net: a Vercel deployment of the git branch "staging" defaults to the Xano "staging" branch even
// if XANO_BRANCH was forgotten, so a staging deploy can never silently hit the live API.

const onStagingGitBranch = process.env.VERCEL_GIT_COMMIT_REF === "staging";

export const XANO_HOST = (process.env.XANO_HOST || "https://api.shsws-solutions.com").replace(/\/+$/, "");
export const XANO_BRANCH = (process.env.XANO_BRANCH || (onStagingGitBranch ? "staging" : "")).trim();
export const XANO_DATA_SOURCE = (process.env.XANO_DATA_SOURCE || "").trim();

export const XANO_CANONICALS: Record<string, string> = {
  auth: "Vbfe5lun",
  profiles: "YZl-BhQi",
  users: "I8ZiQ9Me",
  rules: "99AB050c",
  tokens: "KWCAt72v",
  "access-control": "Ucs3etMr",
  dashboard: "5kArnPy5",
  logs: "fMYNj_1_",
  resume: "caf8Eo15",
  public: "W5ffWHW-",
  "extension-versions": "eqIK8vAt",
  // Override with XANO_EXTENSION_MGMT_CANONICAL if the extension_mgmt API group has a different canonical id
  extensions: process.env.XANO_EXTENSION_MGMT_CANONICAL || "eqIK8vAt",
  mail_triage_allowlist: "weyKu-kg",
  blacklist: "YZl-BhQi",
};

/** Base URL of an API group on the configured branch, e.g. https://host/api:caf8Eo15:staging */
export function xanoGroupBase(group: string): string | undefined {
  const canonical = XANO_CANONICALS[group];
  if (!canonical) return undefined;
  return `${XANO_HOST}/api:${canonical}${XANO_BRANCH ? `:${XANO_BRANCH}` : ""}`;
}

/** Extra headers every server-side Xano call must carry (data source selection). */
export function xanoExtraHeaders(): Record<string, string> {
  return XANO_DATA_SOURCE ? { "X-Data-Source": XANO_DATA_SOURCE } : {};
}

/** Human-readable label for the active Xano target, e.g. "staging" or "production". */
export const XANO_TARGET_LABEL = XANO_BRANCH ? `${XANO_BRANCH}${XANO_DATA_SOURCE ? ` / ${XANO_DATA_SOURCE} data` : ""}` : "production";
