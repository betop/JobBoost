#!/usr/bin/env bash
# Refresh the vendored copy of the swiftcv PDF generator used by the Generation Logs
# page so admin-panel PDFs stay identical to the browser extension's output.
#
#   admin-panel/scripts/sync-swiftcv-generator.sh
#
# Copies from ../swiftcv into admin-panel/public/swiftcv/ :
#   pdfGenerator.js      (+ a `window.PDFGenerator = PDFGenerator;` export, since it is a classic script)
#   jspdf.umd.min.js     (jsPDF 2.5.1, MIT)
#   lato-fonts.js        (only the Lato regular/bold entries of resume_fonts.js; the generator
#                         hard-codes Lato and the full file is ~5 MB. Lato is SIL OFL 1.1.)
# If swiftcv/pdfGenerator.js ever starts using another font, widen the grep below.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="$ROOT/swiftcv"
DEST="$ROOT/admin-panel/public/swiftcv"
mkdir -p "$DEST"

BANNER="// VENDORED from swiftcv/ -- DO NOT EDIT HERE. Refresh with admin-panel/scripts/sync-swiftcv-generator.sh"

{ echo "$BANNER"; cat "$SRC/pdfGenerator.js"; printf '\n// Added by sync script: expose the class (classic-script class declarations are not window properties)\nif (typeof window !== "undefined") window.PDFGenerator = PDFGenerator;\n'; } > "$DEST/pdfGenerator.js"

{ echo "$BANNER"; cat "$SRC/jspdf.umd.min.js"; } > "$DEST/jspdf.umd.min.js"

{
  echo "$BANNER"
  echo "// Lato Regular + Bold only (SIL OFL 1.1), extracted from swiftcv/resume_fonts.js"
  sed -n '2,3p' "$SRC/resume_fonts.js"
  grep -E '^\s*ctx\.lato(Regular|Bold)Font = ' "$SRC/resume_fonts.js"
  echo "})();"
} > "$DEST/lato-fonts.js"

if [ "$(grep -c 'ctx\.lato' "$DEST/lato-fonts.js")" -ne 2 ]; then
  echo "ERROR: expected 2 Lato font entries in resume_fonts.js" >&2; exit 1
fi
echo "Synced swiftcv generator -> $DEST"
ls -l "$DEST"
