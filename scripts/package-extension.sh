#!/usr/bin/env bash
# Build a CLEAN, runtime-only zip of a browser extension.
#
#   scripts/package-extension.sh swiftcv|mail-triage|all [--out dist]
#
# Output: <out>/<name>-v<manifest version>.zip with ONE top-level folder <name>-v<version>/.
# Contents come from the explicit allowlist scripts/package-manifests/<name>.txt (no minification;
# readable source is less likely to trip Safe Browsing / antivirus heuristics than mangled code).
# The only transformations: EXTENSION_ENV "staging" -> "prod" (as scripts/build-minified-extensions.mjs
# does) and, for lines marked "@slim-lato", keeping only the Lato fonts in resume_fonts.js.
# After staging, a verifier checks that every file referenced by manifest/HTML/imports exists and that
# no dev leftovers (*.backup, test*, *.pdf, *.md, .DS_Store, node_modules, .git*, token.json, *.ttf) slipped in.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/dist"
TARGET=""

usage() { echo "Usage: $0 swiftcv|mail-triage|all [--out dir]" >&2; exit 2; }

while [ $# -gt 0 ]; do
  case "$1" in
    --out) [ $# -ge 2 ] || usage; OUT="$2"; shift 2 ;;
    swiftcv|mail-triage|all) TARGET="$1"; shift ;;
    *) usage ;;
  esac
done
[ -n "$TARGET" ] || usage
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
mkdir -p "$OUT"

command -v zip >/dev/null || { echo "zip not found" >&2; exit 1; }
command -v node >/dev/null || { echo "node not found (needed for verification)" >&2; exit 1; }

VERIFIER="$(mktemp -t pkgverify.XXXXXX)"
trap 'rm -f "$VERIFIER"' EXIT
cat > "$VERIFIER" <<'NODE'
const fs = require("fs"), path = require("path");
const dir = process.argv[2];
const errors = [];
const exists = (rel, from) => fs.existsSync(path.join(dir, rel));
const isLocal = (p) => p && !/^(https?:|data:|chrome|#|mailto:|\/\/)/.test(p) && !/[*?]/.test(p);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(dir).map((f) => path.relative(dir, f));

// 1. forbidden leftovers
const bad = /(^|\/)(test[^/]*|\.DS_Store|node_modules|\.git[^/]*|token\.json|[^/]*\.backup|[^/]*\.pdf|[^/]*\.md|[^/]*\.ttf|[^/]*\.map)(\/|$)/i;
files.forEach((f) => { if (bad.test(f)) errors.push("forbidden file in package: " + f); });

// 2. manifest references
const m = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const refs = new Set();
const add = (p) => { if (isLocal(p)) refs.add(p); };
if (m.background && m.background.service_worker) add(m.background.service_worker);
(m.content_scripts || []).forEach((c) => [...(c.js || []), ...(c.css || [])].forEach(add));
if (m.action) { add(m.action.default_popup); Object.values(m.action.default_icon || {}).forEach(add); }
Object.values(m.icons || {}).forEach(add);
add(m.options_page); if (m.options_ui) add(m.options_ui.page); add(m.side_panel && m.side_panel.default_path);
(m.web_accessible_resources || []).forEach((w) => (w.resources || []).forEach(add));
const globs = [];
(m.web_accessible_resources || []).forEach((w) => (w.resources || []).forEach((r) => { if (/[*?]/.test(r)) globs.push(r); }));

// 3. HTML references, module imports, getURL / url: literals
for (const f of files) {
  const txt = fs.readFileSync(path.join(dir, f), "utf8");
  const base = path.dirname(f);
  const rel = (p) => path.posix.normalize(path.posix.join(base === "." ? "" : base, p.split(/[?#]/)[0]));
  if (f.endsWith(".html")) {
    for (const x of txt.matchAll(/<(?:script|img|source)\b[^>]*\bsrc=["']([^"']+)["']/gi)) if (isLocal(x[1])) refs.add(rel(x[1]));
    for (const x of txt.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi)) if (isLocal(x[1])) refs.add(rel(x[1]));
  } else if (f.endsWith(".js")) {
    for (const x of txt.matchAll(/(?:^|\n)\s*import\s[^;'"]*?from\s*["'](\.[^"']+)["']/g)) refs.add(rel(x[1]));
    for (const x of txt.matchAll(/importScripts\(\s*["']([^"']+)["']/g)) if (isLocal(x[1])) refs.add(rel(x[1]));
    for (const x of txt.matchAll(/getURL\(\s*["']([^"']+)["']/g)) if (isLocal(x[1])) refs.add(x[1].replace(/^\//, ""));
    for (const x of txt.matchAll(/\burl:\s*["']([\w\-./]+\.(?:html|js))["']/g)) refs.add(rel(x[1]));
  }
  // 4. env switch must be prod
  if (/const EXTENSION_ENV\s*=\s*"staging"/.test(txt)) errors.push("EXTENSION_ENV still staging in " + f);
}
for (const r of [...refs].sort()) if (!exists(r)) errors.push("referenced but missing: " + r);
if (errors.length) { console.error("VERIFY FAILED:\n  " + errors.join("\n  ")); process.exit(1); }
console.log(`verify ok: ${refs.size} referenced paths present, ${files.length} files, no forbidden files` +
  (globs.length ? `; glob(s) not checked (match nothing/optional): ${globs.join(", ")}` : ""));
NODE

package_one() {
  local name="$1" src="$ROOT/$1" list="$ROOT/scripts/package-manifests/$1.txt"
  [ -d "$src" ] || { echo "missing $src" >&2; exit 1; }
  [ -f "$list" ] || { echo "missing $list" >&2; exit 1; }
  local version
  version="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).version)' "$src/manifest.json")"
  local folder="$name-v$version"
  local stage; stage="$(mktemp -d -t pkgstage.XXXXXX)"
  local dest="$stage/$folder"
  mkdir -p "$dest"

  local line file
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|'#'*) continue ;; esac
    if [[ "$line" == "@slim-lato "* ]]; then
      file="${line#@slim-lato }"
      [ -f "$src/$file" ] || { echo "allowlist file missing: $name/$file" >&2; exit 1; }
      mkdir -p "$dest/$(dirname "$file")"
      { echo "// Lato Regular + Bold only (SIL OFL 1.1), extracted from the full font bundle"
        sed -n '2,3p' "$src/$file"
        grep -E '^[[:space:]]*ctx\.lato(Regular|Bold)Font = ' "$src/$file"
        echo "})();"; } > "$dest/$file"
      [ "$(grep -c 'ctx\.lato' "$dest/$file")" -eq 2 ] || { echo "expected 2 Lato entries in $file" >&2; exit 1; }
    else
      file="$line"
      [ -f "$src/$file" ] || { echo "allowlist file missing: $name/$file" >&2; exit 1; }
      mkdir -p "$dest/$(dirname "$file")"
      cp "$src/$file" "$dest/$file"
    fi
    case "$file" in *.js) sed -i.bak -E 's/const EXTENSION_ENV[[:space:]]*=[[:space:]]*"staging"/const EXTENSION_ENV = "prod"/' "$dest/$file"; rm -f "$dest/$file.bak" ;; esac
  done < "$list"

  node "$VERIFIER" "$dest"

  local zipfile="$OUT/$folder.zip"
  rm -f "$zipfile"
  ( cd "$stage" && find "$folder" -type f | LC_ALL=C sort | zip -X -9 -q "$zipfile" -@ )

  local count size
  count="$(unzip -Z1 "$zipfile" | grep -vc '/$' || true)"
  size="$(stat -f%z "$zipfile" 2>/dev/null || stat -c%s "$zipfile")"
  echo "built $zipfile : $count files, $size bytes"
  rm -rf "$stage"
}

if [ "$TARGET" = all ]; then
  package_one swiftcv
  package_one mail-triage
else
  package_one "$TARGET"
fi
