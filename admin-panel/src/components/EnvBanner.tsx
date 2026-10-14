import { XANO_BRANCH, XANO_DATA_SOURCE } from "@/config/xano";

// Shown on every page (login included) whenever the app targets a non-live Xano branch, so a staging
// deployment can never be mistaken for production. Renders nothing in production.
// Colour carries the data risk: amber = own test data, red = staging logic running on PRODUCTION data.
export default function EnvBanner() {
  if (!XANO_BRANCH) return null;

  const sharesProdData = !XANO_DATA_SOURCE;
  const dataLabel = sharesProdData ? "shares PRODUCTION data" : `${XANO_DATA_SOURCE} data`;
  const stripe = sharesProdData ? "bg-red-600" : "bg-amber-500";
  const pill = sharesProdData ? "bg-red-600 text-white" : "bg-amber-400 text-amber-950";

  return (
    <>
      <div aria-hidden className={`fixed top-0 left-0 right-0 h-1 z-[60] pointer-events-none ${stripe}`} />
      <div
        role="status"
        title={`This is the STAGING environment. API: Xano branch "${XANO_BRANCH}", ${dataLabel}.`}
        className={`fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] pointer-events-none select-none rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg ring-1 ring-black/10 ${pill}`}
      >
        <span className="tracking-wider">STAGING</span>
        <span className="mx-2 opacity-60">·</span>
        <span>Xano branch: {XANO_BRANCH}</span>
        <span className="mx-2 opacity-60">·</span>
        <span>{sharesProdData ? "⚠ " : ""}{dataLabel}</span>
      </div>
    </>
  );
}
