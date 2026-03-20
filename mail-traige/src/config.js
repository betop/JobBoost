let cachedConfig = null;

export async function getConfig() {
  if (cachedConfig) return cachedConfig;

  const url = chrome.runtime.getURL("config.json");
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to load config.json (${res.status}). Make sure config.json exists at the extension root.`
    );
  }

  const data = await res.json();
  cachedConfig = data || {};
  return cachedConfig;
}

export function clearConfigCache() {
  cachedConfig = null;
}
