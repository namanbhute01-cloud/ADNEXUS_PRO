#!/bin/bash
set -euo pipefail

echo "--- Preparing and Starting Vaart-E CMS ---"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$ROOT_DIR/apps/web/.env.local" ]; then
  echo "ERROR: Missing $ROOT_DIR/apps/web/.env.local"
  exit 1
fi

# Check for database connectivity (port 5432)
if ! nc -z localhost 5432; then
  echo "ERROR: PostgreSQL is not running on localhost:5432."
  echo "Please start your database server and try again."
  exit 1
fi

echo "--- Launching Development Environment ---"
echo "Web app will bind to 0.0.0.0:3000 for LAN screen access."
cd "$ROOT_DIR"
npx pnpm --filter web dev
