// Single build pipeline for the browser extensions (swiftcv, mail-triage).
//
//   node scripts/build-minified-extensions.mjs [swiftcv|mail-triage|all] [options]
//
// Options
//   --minify        Minify JS/HTML/CSS/JSON (OPT-IN). Default ships readable source, which is less
//                   likely to trigger antivirus / Chrome Web Store suspicion than mangled code.
//   --out <dir>     Zip output dir (default build/zips). Unpacked files go to <build>/extensions
//                   unless --out is given, in which case to <out>/unpacked.
//   --plain-zip     Emit only <name>-v<ver>.zip (one top-level folder). Used by package-extension.sh.
//
// What ships is decided ONLY by the allowlists in scripts/package-manifests/<name>.txt
// (the same files package-extension.sh uses). Lines:
//   path                 copy as-is
//   @slim-lato path      resume_fonts.js reduced to the Lato regular+bold entries
//                        (swiftcv/pdfGenerator.js hard-codes `const chosen = "Lato"`)
// Transformations: EXTENSION_ENV "staging" -> "prod" (always), slim fonts, optional minify.
// Guards: manifest/HTML/import references must exist, no dev leftovers, size limits.
import { promises as fs, createWriteStream } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const manifestsDir = path.join(__dirname, "package-manifests");
const ALL_TARGETS = ["swiftcv", "mail-triage"];
const MAX_ZIP_BYTES = { swiftcv: 2 * 1024 * 1024, "mail-triage": 2 * 1024 * 1024 };
const FORBIDDEN =
  /(^|\/)(test[^/]*|\.DS_Store|node_modules|\.git[^/]*|token\.json|[^/]*\.backup|[^/]*\.pdf|[^/]*\.md|[^/]*\.ttf|[^/]*\.map)(\/|$)/i;

// ---------- CLI ----------
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const MINIFY = flag("--minify");
const PLAIN_ZIP = flag("--plain-zip");
const outOpt = opt("--out");
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
const wanted = positional[0] || "all";
if (wanted !== "all" && !ALL_TARGETS.includes(wanted)) {
  console.error(`Unknown target "${wanted}". Use swiftcv|mail-triage|all`);
  process.exit(2);
}
const targets = wanted === "all" ? ALL_TARGETS : [wanted];
const zipRoot = outOpt ? path.resolve(outOpt) : path.join(root, "build", "zips");
const distRoot = PLAIN_ZIP
  ? path.join(os.tmpdir(), `ext-stage-${process.pid}`)
  : outOpt
    ? path.join(zipRoot, "unpacked")
    : path.join(root, "build", "extensions");

// ---------- helpers ----------
const rmrf = (p) => fs.rm(p, { recursive: true, force: true });
const fmtMB = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

async function readAllowlist(name) {
  const text = await fs.readFile(path.join(manifestsDir, `${name}.txt`), "utf8");
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => (l.startsWith("@slim-lato ") ? { file: l.slice(11).trim(), slimLato: true } : { file: l }));
}

// Keep only the Lato regular+bold entries of resume_fonts.js (same shape as the full file).
function slimLatoFonts(src, label) {
  const lines = src.split(/\r?\n/);
  const entries = lines.filter((l) => /^\s*ctx\.lato(Regular|Bold)Font = /.test(l));
  if (entries.length !== 2) throw new Error(`expected 2 Lato entries in ${label}, found ${entries.length}`);
  return [
    "// Lato Regular + Bold only (SIL OFL 1.1), extracted from the full font bundle",
    lines[1],
    lines[2],
    ...entries,
    "})();",
    "",
  ].join("\n");
}

async function minifyContent(file, content) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
    const { minify } = await import("terser");
    const r = await minify(content, { compress: true, mangle: true, format: { comments: false } });
    return r.code ?? content;
  }
  if (ext === ".html") {
    const { minify } = await import("html-minifier-terser");
    return minify(content, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true,
    });
  }
  if (ext === ".css") {
    const { default: CleanCSS } = await import("clean-css");
    const out = new CleanCSS({ level: 2 }).minify(content);
    if (out.errors?.length) throw new Error(out.errors.join("; "));
    return out.styles || content;
  }
  if (ext === ".json") return JSON.stringify(JSON.parse(content));
  return content;
}

// ---------- verification of the staged tree ----------
async function verifyTree(dir) {
  const errors = [];
  const files = (await walk(dir)).map((f) => path.relative(dir, f).split(path.sep).join("/"));
  const isLocal = (p) => p && !/^(https?:|data:|chrome|#|mailto:|\/\/)/.test(p) && !/[*?]/.test(p);
  const refs = new Set();
  const add = (p) => isLocal(p) && refs.add(p);

  for (const f of files) if (FORBIDDEN.test(f)) errors.push(`forbidden file in package: ${f}`);

  const m = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf8"));
  add(m.background?.service_worker);
  (m.content_scripts || []).forEach((c) => [...(c.js || []), ...(c.css || [])].forEach(add));
  if (m.action) {
    add(m.action.default_popup);
    Object.values(m.action.default_icon || {}).forEach(add);
  }
  Object.values(m.icons || {}).forEach(add);
  add(m.options_page);
  add(m.options_ui?.page);
  add(m.side_panel?.default_path);
  (m.web_accessible_resources || []).forEach((w) => (w.resources || []).forEach(add));

  for (const f of files) {
    const base = path.posix.dirname(f);
    const rel = (p) => path.posix.normalize(path.posix.join(base === "." ? "" : base, p.split(/[?#]/)[0]));
    const txt = await fs.readFile(path.join(dir, f), "utf8").catch(() => "");
    if (f.endsWith(".html")) {
      for (const x of txt.matchAll(/<(?:script|img|source)\b[^>]*?\bsrc=["']?([^"'\s>]+)/gi))
        if (isLocal(x[1])) refs.add(rel(x[1]));
      for (const x of txt.matchAll(/<link\b[^>]*?\bhref=["']?([^"'\s>]+)/gi)) if (isLocal(x[1])) refs.add(rel(x[1]));
    } else if (f.endsWith(".js")) {
      // Static imports; minified code has no line starts, so match `import ... from"./x"` anywhere.
      for (const x of txt.matchAll(/\bimport\s*[^;'"()]*?\bfrom\s*["'](\.[^"']+)["']/g)) refs.add(rel(x[1]));
      for (const x of txt.matchAll(/\bimport\s*["'](\.[^"']+)["']/g)) refs.add(rel(x[1]));
      for (const x of txt.matchAll(/importScripts\(\s*["']([^"']+)["']/g)) if (isLocal(x[1])) refs.add(rel(x[1]));
      for (const x of txt.matchAll(/getURL\(\s*["']([^"']+)["']/g)) if (isLocal(x[1])) refs.add(x[1].replace(/^\//, ""));
      for (const x of txt.matchAll(/\burl:\s*["']([\w\-./]+\.(?:html|js))["']/g)) refs.add(rel(x[1]));
    }
    if (/const EXTENSION_ENV\s*=\s*"staging"/.test(txt) || /EXTENSION_ENV\s*=\s*"staging"/.test(txt))
      errors.push(`EXTENSION_ENV still "staging" in ${f}`);
  }
  for (const r of [...refs].sort()) if (!files.includes(r)) errors.push(`referenced but missing: ${r}`);
  if (errors.length) throw new Error(`verification failed for ${dir}:\n  ${errors.join("\n  ")}`);
  return { refs: refs.size, files: files.length };
}

// ---------- build ----------
async function stage(name) {
  const src = path.join(root, name);
  const dest = path.join(distRoot, name);
  await rmrf(dest);
  await fs.mkdir(dest, { recursive: true });

  for (const { file, slimLato } of await readAllowlist(name)) {
    const from = path.join(src, file);
    const to = path.join(dest, file);
    try {
      await fs.access(from);
    } catch {
      throw new Error(`allowlist file missing: ${name}/${file}`);
    }
    await fs.mkdir(path.dirname(to), { recursive: true });

    const ext = path.extname(file).toLowerCase();
    const isText = [".js", ".mjs", ".cjs", ".html", ".css", ".json"].includes(ext);
    if (!isText) {
      await fs.copyFile(from, to);
      continue;
    }
    let text = await fs.readFile(from, "utf8");
    if (slimLato) text = slimLatoFonts(text, `${name}/${file}`);
    if (ext === ".js") text = text.replace(/const EXTENSION_ENV\s*=\s*"staging"/g, 'const EXTENSION_ENV = "prod"');
    if (MINIFY && !file.endsWith(".min.js")) {
      try {
        text = await minifyContent(file, text);
      } catch (e) {
        console.warn(`[warn] minify failed for ${name}/${file}, shipping readable copy: ${e.message}`);
      }
    }
    await fs.writeFile(to, text, "utf8");
  }
  const v = await verifyTree(dest);
  console.log(`[ok] staged ${name} (${MINIFY ? "minified" : "readable"}): ${v.files} files, ${v.refs} references verified`);
  return dest;
}

function makeZip(zipPath, dir, prefix) {
  return new Promise(async (resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);
    const files = (await walk(dir)).map((f) => path.relative(dir, f).split(path.sep).join("/")).sort();
    const fixed = new Date("2020-01-01T00:00:00Z");
    for (const f of files) archive.file(path.join(dir, f), { name: prefix ? `${prefix}/${f}` : f, date: fixed });
    archive.finalize();
  });
}

// Inspect the finished zip (system `unzip -Z1` listing; falls back to the staged tree).
async function guardZip(name, zipPath, dir) {
  const size = (await fs.stat(zipPath)).size;
  let entries;
  try {
    entries = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" }).split("\n").filter((l) => l && !l.endsWith("/"));
  } catch {
    entries = (await walk(dir)).map((f) => path.relative(dir, f).split(path.sep).join("/"));
  }
  const bad = entries.filter((f) => FORBIDDEN.test(f));
  const limit = MAX_ZIP_BYTES[name];
  console.log(`[zip] ${path.relative(root, zipPath)}: ${entries.length} files, ${fmtMB(size)} (${size} bytes)`);
  if (bad.length) throw new Error(`forbidden files in ${zipPath}: ${bad.join(", ")}`);
  if (limit && size > limit) throw new Error(`${path.basename(zipPath)} is ${fmtMB(size)}, exceeds ${fmtMB(limit)} limit`);
}

async function zipTarget(name, dir) {
  const version = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf8")).version || "unknown";
  await fs.mkdir(zipRoot, { recursive: true });
  const folder = `${name}-v${version}`;
  const jobs = PLAIN_ZIP
    ? [[`${folder}.zip`, folder]]
    : [
        // mac: files at the zip root (no wrapping folder); win: wrapped in <name>-v<version>/
        [`${folder}-mac.zip`, false],
        [`${folder}-winx64.zip`, folder],
      ];
  for (const [file, prefix] of jobs) {
    const zipPath = path.join(zipRoot, file);
    await rmrf(zipPath);
    await makeZip(zipPath, dir, prefix);
    await guardZip(name, zipPath, dir);
  }
}

async function main() {
  if (!outOpt) await rmrf(path.join(root, "build"));
  if (PLAIN_ZIP) await rmrf(distRoot);
  await fs.mkdir(distRoot, { recursive: true });
  for (const name of targets) {
    const dir = await stage(name);
    await zipTarget(name, dir);
  }
  if (PLAIN_ZIP) await rmrf(distRoot);
  console.log(`[done] ${MINIFY ? "Minified" : "Readable"} slim builds: zips in ${path.relative(root, zipRoot)}`);
}

main().catch((e) => {
  console.error(`[FAIL] ${e.message}`);
  process.exit(1);
});
