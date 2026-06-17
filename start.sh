#!/bin/bash
set -euo pipefail

# Ensure service is running via systemctl
echo "--- Starting AdNexus via systemd ---"
sudo systemctl start adnexus

echo "Waiting for service to come up..."
sleep 2

if systemctl is-active --quiet adnexus; then
    echo "AdNexus started successfully."
    systemctl status adnexus --no-pager
else
    echo "ERROR: Service failed to start."
    exit 1
fi
