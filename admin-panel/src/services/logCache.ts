/**
 * logCache.ts — IndexedDB-backed cache for generation logs.
 *
 * Persists across page refreshes and browser restarts.
 * Each admin uses their own browser, so one DB per browser is sufficient.
 *
 * Stores:
 *   "logs"  — all GenerationLog records, keyed by id
 *             indexes: created_at, updated_at
 *   "meta"  — key/value pairs: { key: "lastSyncAt", value: ISO string }
 *                               { key: "initialLoadDone", value: "1" }
 *
 * Delta sync: on every fetch we record `lastSyncAt = now` BEFORE the request.
 * The server returns records where MAX(created_at, updated_at) >= lastSyncAt,
 * so we catch new records from any user AND edits (is_applied, is_matched).
 */

import type { GenerationLog } from "./logsService";

const DB_NAME    = "jobboost_logs";
const DB_VERSION = 1;
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

      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        const logsStore = db.createObjectStore(STORE_LOGS, { keyPath: "id" });
        logsStore.createIndex("created_at", "created_at", { unique: false });
        logsStore.createIndex("updated_at", "updated_at", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
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
 * Sorted newest-first by created_at.
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

/**
 * Records the current timestamp as the new lastSyncAt.
 * Call this BEFORE starting a fetch so any records created/updated
 * during the in-flight request are caught in the next delta.
 * Returns the recorded timestamp.
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
