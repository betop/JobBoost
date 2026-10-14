#!/usr/bin/env bash
# Push the local .xs files to a Xano branch of workspace 1 (git is the source of truth).
#
#   scripts/xano-deploy.sh staging|production [--yes]
#
# staging     -> Xano branch "staging"     (safe to run any time; logic only)
# production  -> Xano branch "production"  (the LIVE branch). Refuses to run unless the current git
#                branch is "main" with a clean tree, shows a dry-run first, and asks for confirmation.
# workflow_test/ is always excluded (the plan allows 10 workflow tests).
# NOTE: tables/data are shared by all Xano branches; schema changes affect production immediately.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
TARGET="${1:-}"; YES="${2:-}"
case "$TARGET" in staging|production) ;; *) echo "Usage: $0 staging|production [--yes]" >&2; exit 2 ;; esac
command -v xano >/dev/null || { echo "xano CLI not found (npm i -g @xano/cli)" >&2; exit 1; }
WS=1
COMMON=(-w "$WS" -b "$TARGET" -e "workflow_test/**")

if [ "$TARGET" = "production" ]; then
  BR="$(git rev-parse --abbrev-ref HEAD)"
  [ "$BR" = "main" ] || { echo "Refusing: production deploys come from git branch main (you are on $BR)." >&2; exit 1; }
  [ -z "$(git status --porcelain)" ] || { echo "Refusing: working tree is not clean." >&2; exit 1; }
fi

echo "== Dry run: push to Xano branch '$TARGET' =="
xano workspace push "${COMMON[@]}" --dry-run
if [ "$TARGET" = "production" ] && [ "$YES" != "--yes" ]; then
  read -r -p "Push to the LIVE production branch? Type 'production' to confirm: " ANS
  [ "$ANS" = "production" ] || { echo "Aborted."; exit 1; }
fi
xano workspace push "${COMMON[@]}" --force
echo "Done: pushed to Xano branch '$TARGET'."
