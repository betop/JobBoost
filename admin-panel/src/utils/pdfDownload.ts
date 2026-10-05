/**
 * Client-side PDF generation for the admin panel.
 *
 * Uses the browser extension's own generator (swiftcv/pdfGenerator.js + jsPDF + Lato font),
 * vendored into public/swiftcv/ (see scripts/sync-swiftcv-generator.sh), so a resume
 * downloaded here is byte-for-byte produced by the same code path and templates (1-20)
 * as the one the extension generates. The scripts are classic (non-module) browser scripts
 * that touch `window`, so they are injected lazily on first use and never run during SSR.
 *
 * Data handling mirrors swiftcv/offscreen.js: the raw API payload (object, or string that
 * may contain fenced JSON) is handed straight to PDFGenerator.generateResumePDF, which does
 * the `_extractJSON` parsing, `resume` envelope unwrapping and header->root merge itself.
 */

interface SwiftcvGenerator {
  init(): Promise<void>;
  _parseInput(input: unknown): Record<string, unknown> | null;
  generateResumePDF(input: unknown, filename: string, templateId: number): { dataUri: string; filename: string };
}

type SwiftcvGeneratorCtor = new () => SwiftcvGenerator;

const SWIFTCV_BASE = "/swiftcv";
// Order matters: jsPDF first, fonts next, then the generator.
const SWIFTCV_SCRIPTS = ["jspdf.umd.min.js", "lato-fonts.js", "pdfGenerator.js"];

let loadPromise: Promise<SwiftcvGeneratorCtor> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

function loadSwiftcvGenerator(): Promise<SwiftcvGeneratorCtor> {
  if (typeof window === "undefined") return Promise.reject(new Error("PDF generation is client-side only"));
  if (!loadPromise) {
    loadPromise = (async () => {
      for (const file of SWIFTCV_SCRIPTS) await loadScript(`${SWIFTCV_BASE}/${file}`);
      const ctor = (window as unknown as { PDFGenerator?: SwiftcvGeneratorCtor }).PDFGenerator;
      if (!ctor) throw new Error("swiftcv PDFGenerator did not load");
      return ctor;
    })().catch((err) => {
      loadPromise = null; // allow retry
      throw err;
    });
  }
  return loadPromise;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function dataUriToBlob(dataUri: string): Blob {
  const [header, base64] = dataUri.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "application/pdf";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ─── Legacy raw-HTML responses (not JSON): no swiftcv equivalent, use print dialog ──

function isLikelyHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

function printHtmlAsPDF(html: string, filename: string): void {
  const pdfName = filename.endsWith(".pdf") ? filename : filename + ".pdf";
  const win = window.open("", "_blank");
  if (!win) {
    triggerDownload(new Blob([html], { type: "text/html" }), pdfName.replace(/\.pdf$/i, ".html"));
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>${pdfName}</title>
    <style>
      @media print { @page { margin: 0.5in; size: letter; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  </head><body>${html}</body></html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function downloadResumePDF(resumeText: string | object, filename: string, templateId = 11): Promise<void> {
  if (!resumeText) {
    console.error("[pdfDownload] resumeText is empty");
    return;
  }

  // Load swiftcv first so the guard below uses its own _extractJSON (incl. truncation recovery).
  let generator: SwiftcvGenerator | null = null;
  try {
    const PDFGenerator = await loadSwiftcvGenerator();
    generator = new PDFGenerator();
    await generator.init();
  } catch (err) {
    if (!(typeof resumeText === "string" && isLikelyHtml(resumeText))) throw err;
  }

  // Guard only: swiftcv renders a debug page when there is no name/summary, so refuse early.
  const parsed = generator?._parseInput(resumeText) as { resume?: Record<string, unknown>; header?: Record<string, unknown>; name?: string; summary?: string } | null | undefined;
  const body = (parsed?.resume && typeof parsed.resume === "object" ? parsed.resume : parsed) as
    { header?: { name?: string; summary?: string }; name?: string; summary?: string } | null | undefined;
  if (!generator || !body || !(body.name || body.summary || body.header?.name || body.header?.summary)) {
    if (typeof resumeText === "string" && isLikelyHtml(resumeText)) {
      printHtmlAsPDF(resumeText.trim(), filename);
      return;
    }
    console.error("[pdfDownload] no valid resume data found", resumeText);
    throw new Error("No valid resume data found");
  }

  const tpl = Math.max(1, Math.min(20, Math.round(Number(templateId)) || 11));
  const pdfName = filename.toLowerCase().endsWith(".pdf") ? filename : filename + ".pdf";
  // Same call the extension's offscreen page makes; the generator does _extractJSON / unwrap / header merge.
  const { dataUri, filename: outName } = generator.generateResumePDF(resumeText, pdfName, tpl);
  triggerDownload(dataUriToBlob(dataUri), outName);
}
