#!/bin/bash
set -euo pipefail

# Vars
SERVICE_NAME="adnexus"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_NAME="$(whoami)"

echo "--- Setting up Systemd Service for AdNexus ---"

# Check sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)"
  exit 1
fi

# Create service file
cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=AdNexus CMS
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=$SCRIPT_DIR/apps/web
Environment=NODE_ENV=production
ExecStart=$SCRIPT_DIR/start.sh
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

# Reload and enable
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo "Service created and started."
systemctl status "$SERVICE_NAME" --no-pager
