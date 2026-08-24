#!/usr/bin/env bash
# Launch a local preview of Universal BlackBook.
# Runs the dev server in the foreground — press Ctrl-C to stop.
#
#   Usage:  ./scripts/preview.sh [port]      (default 5202)
#
# 5202 is this app's port in the registry (Docs_UNI_SIM/dev-preview.md).
# --strictPort means a port clash fails loudly instead of silently serving
# this app on another app's port.
#
# NOTE — the book itself is entirely local (IndexedDB); nothing here needs the
# internet. The optional "save online" feature talks to the LIVE platform
# Supabase in dev too, so signing in and turning it on writes a real vault
# against your real Universal ID.
set -euo pipefail
cd "$(dirname "$0")/.."

port="${1:-5202}"

if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run)..."
  npm install
fi

echo "Universal BlackBook -> http://localhost:$port"
npm run dev -- --port "$port" --strictPort
