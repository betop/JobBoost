#!/usr/bin/env bash
# Build a CLEAN, runtime-only zip of a browser extension into dist/ (thin wrapper).
#
#   scripts/package-extension.sh swiftcv|mail-triage|all [--out dist] [--minify]
#
# All logic (allowlist scripts/package-manifests/<name>.txt, Lato-only font slimming,
# EXTENSION_ENV staging->prod, reference verification, size/forbidden-file guards) lives in
# scripts/build-minified-extensions.mjs so `npm run build:extensions` and this script cannot diverge.
# Output: <out>/<name>-v<manifest version>.zip with ONE top-level folder <name>-v<version>/.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/dist"
TARGET=""
EXTRA=()
usage() { echo "Usage: $0 swiftcv|mail-triage|all [--out dir] [--minify]" >&2; exit 2; }
while [ $# -gt 0 ]; do
  case "$1" in
    --out) [ $# -ge 2 ] || usage; OUT="$2"; shift 2 ;;
    --minify) EXTRA+=(--minify); shift ;;
    swiftcv|mail-triage|all) TARGET="$1"; shift ;;
    *) usage ;;
  esac
done
[ -n "$TARGET" ] || usage
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
command -v node >/dev/null || { echo "node not found" >&2; exit 1; }
exec node "$ROOT/scripts/build-minified-extensions.mjs" "$TARGET" --plain-zip --out "$OUT" ${EXTRA[@]+"${EXTRA[@]}"}
