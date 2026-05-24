#!/bin/bash
set -euo pipefail

echo "--- Preparing and Starting ADNEXUS_PRO Network ---"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$ROOT_DIR/apps/web/.env.local" ]; then
  echo "ERROR: Missing $ROOT_DIR/apps/web/.env.local"
  exit 1
fi

# Check for database connectivity (port 5432)
if ! nc -z localhost 5432; then
  echo "ERROR: PostgreSQL is not running on localhost:5432."
  exit 1
fi

echo "--- Launching ADNEXUS_PRO Sync Engine & Dashboard ---"
cd "$ROOT_DIR"

export XDG_CACHE_HOME="${XDG_CACHE_HOME:-/tmp/adnexus-cache}"
export PRISMA_ENGINES_CACHE_DIR="${PRISMA_ENGINES_CACHE_DIR:-$XDG_CACHE_HOME/prisma}"
mkdir -p "$XDG_CACHE_HOME" "$PRISMA_ENGINES_CACHE_DIR"

echo "--- Generating Prisma client ---"
pnpm --filter @vaart/database exec prisma generate

WEB_CMD="pnpm --filter web dev"
LEGACY_SOCKET_CMD="node server.js"

if [ "${ENABLE_LEGACY_SOCKET_SERVER:-0}" = "1" ]; then
  if ! node -e "require.resolve('socket.io')" >/dev/null 2>&1; then
    echo "ERROR: ENABLE_LEGACY_SOCKET_SERVER=1 but 'socket.io' is not installed in workspace."
    echo "Install it first or unset ENABLE_LEGACY_SOCKET_SERVER."
    exit 1
  fi

  echo "--- Starting web app and legacy Socket.IO player server ---"
  echo "NOTE: legacy server must use a different port than Next before both can run together."
  npx concurrently \
    "$LEGACY_SOCKET_CMD" \
    "$WEB_CMD"
else
  echo "--- Starting web app only ---"
  echo "Legacy Socket.IO player server skipped. Set ENABLE_LEGACY_SOCKET_SERVER=1 to opt in."
  exec $WEB_CMD
fi
