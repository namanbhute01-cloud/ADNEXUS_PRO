#!/bin/bash
set -euo pipefail

SERVICE_NAME="adnexus"

echo "--- Stopping Adnexus Service using systemctl ---"

sudo systemctl stop "$SERVICE_NAME"

if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "ERROR: Failed to stop Adnexus service."
  sudo systemctl status "$SERVICE_NAME" --no-pager --lines=20 || true
  exit 1
fi

echo "Adnexus service stopped successfully."
exit 0
