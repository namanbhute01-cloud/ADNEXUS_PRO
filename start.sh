#!/bin/bash
set -euo pipefail

SERVICE_NAME="adnexus"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNIT_SRC="$ROOT_DIR/systemd/adnexus.service"
UNIT_DST="/etc/systemd/system/${SERVICE_NAME}.service"
RUNTIME_ENV_FILE="$ROOT_DIR/apps/web/.env.runtime"

get_lan_ip() {
  local ip
  ip="$(hostname -I 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i !~ /^127\./) { print $i; exit }}')"
  if [ -n "${ip:-}" ]; then
    printf '%s' "$ip"
    return
  fi

  printf '127.0.0.1'
}

install_unit() {
  if [ ! -f "$UNIT_SRC" ]; then
    echo "ERROR: Missing systemd unit source: $UNIT_SRC"
    exit 1
  fi

  if [ ! -f "$UNIT_DST" ] || ! cmp -s "$UNIT_SRC" "$UNIT_DST"; then
    echo "--- Installing/refreshing systemd unit ---"
    sudo install -Dm644 "$UNIT_SRC" "$UNIT_DST"
    sudo systemctl daemon-reload
  fi
}

write_runtime_env() {
  local lan_ip
  lan_ip="$(get_lan_ip)"

  cat > "$RUNTIME_ENV_FILE" <<EOF
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://${lan_ip}:3000
AUTH_URL=http://${lan_ip}:3000
NEXT_PUBLIC_PLAYER_BASE_URL=http://${lan_ip}:3000
R2_PUBLIC_URL=http://${lan_ip}:3000
EOF
}

echo "--- Preparing AdNexus systemd service ---"
install_unit
write_runtime_env

echo "--- Enabling and starting AdNexus service ---"
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

if ! sudo systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "ERROR: Failed to start Adnexus service."
  sudo systemctl status "$SERVICE_NAME" --no-pager --lines=20 || true
  exit 1
fi

echo "Adnexus service started successfully."
echo "Open CMS:"
echo "  http://$(get_lan_ip):3000"
echo "  http://$(get_lan_ip):3000/login"
echo "Status:"
echo "  sudo systemctl status $SERVICE_NAME"
exit 0
