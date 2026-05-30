#!/bin/bash
set -euo pipefail

SERVICE_NAME="adnexus"

echo "--- Stopping Adnexus Service using systemctl ---"

sudo systemctl stop "$SERVICE_NAME"

if [ $? -eq 0 ]; then
  echo "Adnexus service stopped successfully."
else
  echo "ERROR: Failed to stop Adnexus service."
  exit 1
fi

exit 0
