#!/bin/bash
set -euo pipefail

SERVICE_NAME="adnexus"

echo "--- Starting Adnexus Service using systemctl ---"

sudo systemctl start "$SERVICE_NAME"

if [ $? -eq 0 ]; then
  echo "Adnexus service started successfully."
else
  echo "ERROR: Failed to start Adnexus service."
  exit 1
fi

exit 0
