/**
 * Version Check Utility
 * Validates that the extension is running the current/approved version
 * Prevents operation if not on the current version
 * In staging mode, all checks are bypassed
 */

// Extension environment: "staging" (no version checks) or "prod" (version checks enforced)
// The build script will replace "staging" with "prod" for production builds
const EXTENSION_ENV = "staging";

const XANO_API_BASE = "https://x8ki-letl-twmt.n7.xano.io/api:W5ffWHW-:v1";
const VERSION_CHECK_INTERVAL = 3600000; // 1 hour in ms

/**
 * Get the extension's current version from manifest
 */
function getLocalVersion() {
  const manifest = chrome.runtime.getManifest();
  return manifest.version;
}

/**
 * Fetch the current approved version from Xano
 */
async function getCurrentVersionFromXano(extensionName) {
  try {
    const response = await fetch(
      `${XANO_API_BASE}/public/current-version?extension_name=${encodeURIComponent(extensionName)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn(`Version check failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.version;
  } catch (error) {
    console.error("Error fetching current version from Xano:", error);
    return null;
  }
}

/**
 * Check if extension is on the current version
 * Returns { isCurrentVersion: boolean, currentVersion?: string, localVersion: string }
 */
async function checkVersion(extensionName) {
  const localVersion = getLocalVersion();

  // In staging, always report version as current
  if (EXTENSION_ENV === "staging") {
    return { isCurrentVersion: true, localVersion };
  }

  try {
    const currentVersion = await getCurrentVersionFromXano(extensionName);

    if (!currentVersion) {
      // If we can't reach Xano, assume we're okay (fail-open)
      return {
        isCurrentVersion: true,
        localVersion,
      };
    }

    const isCurrentVersion = localVersion === currentVersion;

    return {
      isCurrentVersion,
      currentVersion,
      localVersion,
    };
  } catch (error) {
    console.error("Version check error:", error);
    // Fail-open: allow operation if version check fails
    return {
      isCurrentVersion: true,
      localVersion,
    };
  }
}

/**
 * Initialize version checking on extension load
 * Sets up periodic checks and warns user if not on current version
 */
function initializeVersionCheck(extensionName) {
  // Check immediately on load
  checkVersion(extensionName).then((result) => {
    if (!result.isCurrentVersion) {
      console.warn(
        `⚠️ Extension version mismatch: local=${result.localVersion}, current=${result.currentVersion}`
      );
      // Notify the user (optional - can be UI toast or similar)
      chrome.storage.local.set({
        versionMismatch: {
          timestamp: Date.now(),
          localVersion: result.localVersion,
          currentVersion: result.currentVersion,
        },
      });
    }
  });

  // Check periodically
  setInterval(() => {
    checkVersion(extensionName);
  }, VERSION_CHECK_INTERVAL);
}

/**
 * Check if extension should operate based on version
 * Can be called before critical operations
 */
async function canOperate(extensionName) {
  const result = await checkVersion(extensionName);
  return result.isCurrentVersion;
}

// Export for use in background scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getLocalVersion,
    getCurrentVersionFromXano,
    checkVersion,
    initializeVersionCheck,
    canOperate,
  };
}
