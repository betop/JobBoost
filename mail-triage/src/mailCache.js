/**
 * mailCache.js — IndexedDB-backed cache of processed Gmail message IDs.
 *
 * Stores the IDs + stage of every message that has already been triaged so that
 * future runs can skip them but still count them toward summary counters.
 */

const DB_NAME    = "mail_triage_cache";
const DB_VERSION = 2;
const STORE      = "processed_ids";

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
  return _dbPromise;
}

/**
 * Returns a Set of all already-processed message IDs.
 */
export async function getProcessedIds() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req   = store.getAllKeys();
    req.onsuccess = () => resolve(new Set(req.result.map(String)));
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Returns an array of {id, stage, is_job} for all cached messages.
 */
export async function getProcessedWithStages() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Marks an array of {id, stage, is_job} entries as processed.
 * Accepts plain IDs (string) for backward compatibility — stored with stage="other".
 */
export async function markProcessed(entries) {
  if (!entries || entries.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const entry of entries) {
      if (typeof entry === "string") {
        store.put({ id: entry, stage: "other", is_job: false });
      } else {
        store.put({ id: String(entry.id), stage: entry.stage || "other", is_job: !!entry.is_job });
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * Clears all stored processed IDs (e.g. for a full re-run).
 */
export async function clearProcessedIds() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}
