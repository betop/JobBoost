const DEFAULTS = {
  provider: "openai", // openai | gemini
  model: "gpt-4o-mini",
  openaiApiKey: "",
  geminiApiKey: "",
  maxEmailsPerRun: 20
};

export async function getSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return {
    ...DEFAULTS,
    ...stored
  };
}

export async function setSettings(patch) {
  await chrome.storage.local.set(patch);
}
