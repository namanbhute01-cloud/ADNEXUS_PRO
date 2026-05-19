#!/bin/bash
set -euo pipefail

echo "--- Starting Vaart-E Database Setup ---"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$ROOT_DIR/packages/database"
DB_ENV_FILE="$DB_DIR/.env"
DB_PRISMA_BIN="$DB_DIR/node_modules/.bin/prisma"

if [ ! -f "$DB_ENV_FILE" ]; then
  echo "ERROR: Missing $DB_ENV_FILE"
  echo "Create it first with a valid DATABASE_URL."
  exit 1
fi

DATABASE_URL_LINE="$(grep '^[[:space:]]*DATABASE_URL=' "$DB_ENV_FILE" || true)"
if [ -z "$DATABASE_URL_LINE" ]; then
  echo "ERROR: DATABASE_URL not found in $DB_ENV_FILE"
  exit 1
fi

if [[ "$DATABASE_URL_LINE" != *"://"*":"*"@"* ]]; then
  echo "ERROR: DATABASE_URL does not appear to include database password."
  echo "Expected format:"
  echo 'postgresql://postgres:YOUR_PASSWORD@localhost:5432/vaarte?schema=public'
  exit 1
fi

if [ ! -x "$DB_PRISMA_BIN" ]; then
  echo "Dependencies missing. Installing once..."
  npm install
else
  echo "Dependencies already present. Skipping install."
fi

echo "Applying database migrations..."
cd "$DB_DIR"
"$DB_PRISMA_BIN" migrate dev --name init --skip-seed

echo "Seeding initial admin and sample data..."
"$DB_PRISMA_BIN" db seed

echo "--- Setup Complete ---"
echo "Admin login: admin@vaart.com / Admin@123"
echo "Campaigner login: client@example.com / Client@123"
