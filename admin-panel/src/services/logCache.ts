/**
 * logCache.ts — IndexedDB-backed cache for generation logs.
 *
 * Persists across page refreshes and browser restarts.
 * Each admin uses their own browser, so one DB per browser is sufficient.
 *
 * Stores:
 *   "logs"  — all GenerationLog records, keyed by id
 *             index: updated_at  (created_at omitted — server sets updated_at = created_at on insert)
 *   "meta"  — key/value pairs: { key: "lastSyncAt", value: ISO string }
 *
 * Delta sync: server returns records where updated_at >= lastSyncAt,
 * covering both new records and edits (is_applied, is_matched).
 */

import type { GenerationLog } from "./logsService";

const DB_NAME    = "jobboost_logs";
const DB_VERSION = 3;          // v3: drop created_at index, use updated_at only
const STORE_LOGS = "logs";
const STORE_META = "meta";

// ── DB open ───────────────────────────────────────────────────────────────────

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      // On upgrade (e.g. v1→v2: bidder_id→user_id), drop and recreate stores
      // so stale cached records with old field names are flushed.
      if (db.objectStoreNames.contains(STORE_LOGS)) {
        db.deleteObjectStore(STORE_LOGS);
      }
      if (db.objectStoreNames.contains(STORE_META)) {
        db.deleteObjectStore(STORE_META);
      }

      const logsStore = db.createObjectStore(STORE_LOGS, { keyPath: "id" });
      logsStore.createIndex("updated_at", "updated_at", { unique: false });

      db.createObjectStore(STORE_META, { keyPath: "key" });
    };

    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = (e) => reject((e.target as IDBOpenDBRequest).error);
  });

  return _dbPromise;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  storeName: string,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  return openDB().then((db) => {
    const tx    = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return fn(store) as Promise<T>;
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Merge an array of records into IndexedDB.
 * New records are added, existing ones are replaced (handles field updates).
 */
export async function mergeRecords(records: GenerationLog[]): Promise<void> {
  if (records.length === 0) return;
  const db  = await openDB();
  const tx  = db.transaction(STORE_LOGS, "readwrite");
  const store = tx.objectStore(STORE_LOGS);
  for (const r of records) {
    store.put(r);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * Returns all cached records, filtered to the given UTC ISO date window.
 * Uses updated_at for filtering and sorting (server sets updated_at = created_at on insert).
 * Sorted newest-first.
 */
export async function getCachedRecords(fromISO?: string, toISO?: string): Promise<GenerationLog[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_LOGS, "readonly");
  const store = tx.objectStore(STORE_LOGS);

  const all = await idbRequest<GenerationLog[]>(store.getAll());
  let records = all;

  if (fromISO || toISO) {
    const from = fromISO ? new Date(fromISO).getTime() : 0;
    const to   = toISO   ? new Date(toISO).getTime()   : Infinity;
    records = records.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= from && t <= to;
    });
  }

  records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return records;
}

/** Total number of records stored in IndexedDB. */
export async function cacheSize(): Promise<number> {
  return withStore<number>("readonly", STORE_LOGS, (store) => store.count());
}

/** Aggregated metrics computed from IndexedDB records within an optional date window. */
export interface CachedStats {
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
}

/**
 * Compute stats from IndexedDB.
 * `fromISO` / `toISO` scope the period metrics; all_time_total always uses the full cache.
 */
export async function computeStats(fromISO?: string, toISO?: string): Promise<CachedStats> {
  const db = await openDB();
  const tx = db.transaction(STORE_LOGS, "readonly");
  const all = await idbRequest<import("./logsService").GenerationLog[]>(tx.objectStore(STORE_LOGS).getAll());

  const all_time_total = all.length;

  let records = all;
  if (fromISO || toISO) {
    const from = fromISO ? new Date(fromISO).getTime() : 0;
    const to   = toISO   ? new Date(toISO).getTime()   : Infinity;
    records = all.filter((r) => {
      const t = new Date(r.updated_at).getTime();
      return t >= from && t <= to;
    });
  }

  let total_input_tokens = 0, total_output_tokens = 0;
  let claude_count = 0, openai_count = 0;
  let matched_count = 0, mismatched_count = 0, skipped_count = 0;
  let duplicated_count = 0, not_jd_count = 0, reposted_count = 0;
  let error_count = 0, applied_count = 0;

  for (const r of records) {
    total_input_tokens  += r.input_tokens  ?? 0;
    total_output_tokens += r.output_tokens ?? 0;
    if (r.ai_provider === "claude") claude_count++; else openai_count++;
    if (r.is_matched === 1) matched_count++;
    else if (r.is_matched === 0) mismatched_count++;
    else if (r.is_matched === 2) skipped_count++;
    else if (r.is_matched === 3) not_jd_count++;
    else if (r.is_matched === 4) duplicated_count++;
    else if (r.is_matched === 5) reposted_count++;
    else if (r.is_matched === 6) error_count++;
    if (r.is_applied || r.is_matched === 1) applied_count++;
  }

  return {
    total_generations: records.length,
    total_input_tokens,
    total_output_tokens,
    claude_count,
    openai_count,
    matched_count,
    mismatched_count,
    skipped_count,
    duplicated_count,
    not_jd_count,
    reposted_count,
    error_count,
    applied_count,
    all_time_total,
  };
}

// ── Meta helpers ──────────────────────────────────────────────────────────────

async function getMeta(key: string): Promise<string | null> {
  const db    = await openDB();
  const tx    = db.transaction(STORE_META, "readonly");
  const store = tx.objectStore(STORE_META);
  const row   = await idbRequest<{ key: string; value: string } | undefined>(store.get(key));
  return row?.value ?? null;
}

async function setMeta(key: string, value: string): Promise<void> {
  const db    = await openDB();
  const tx    = db.transaction(STORE_META, "readwrite");
  const store = tx.objectStore(STORE_META);
  store.put({ key, value });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/** ISO timestamp of the last successful sync, or null if never fetched. */
export function getLastSyncAt(): Promise<string | null> {
  return getMeta("lastSyncAt");
}

/** Persist an explicit timestamp as the new lastSyncAt. */
export function setLastSyncAt(ts: string): Promise<void> {
  return setMeta("lastSyncAt", ts);
}

/**
 * Records the current timestamp as the new lastSyncAt.
 * @deprecated Prefer getLastSyncAt() + setLastSyncAt() so the update
 * happens AFTER a successful fetch rather than before.
 */
export async function markSyncStart(): Promise<string> {
  const ts = new Date().toISOString();
  await setMeta("lastSyncAt", ts);
  return ts;
}

/** Whether the very first full-load has completed. */
export async function isInitialLoadDone(): Promise<boolean> {
  const v = await getMeta("initialLoadDone");
  return v === "1";
}

export async function setInitialLoadDone(done: boolean): Promise<void> {
  await setMeta("initialLoadDone", done ? "1" : "0");
}

/**
 * Wipe all cached records and metadata.
 * Use on logout or when the user explicitly forces a full refresh.
 */
export async function clearCache(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_LOGS, STORE_META], "readwrite");
  tx.objectStore(STORE_LOGS).clear();
  tx.objectStore(STORE_META).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}
