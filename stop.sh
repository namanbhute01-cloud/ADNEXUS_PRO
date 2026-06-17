#!/bin/bash
set -euo pipefail

echo "--- Stopping AdNexus via systemd ---"
sudo systemctl stop adnexus

if ! systemctl is-active --quiet adnexus; then
    echo "AdNexus stopped successfully."
else
    echo "ERROR: Failed to stop AdNexus."
    exit 1
fi
