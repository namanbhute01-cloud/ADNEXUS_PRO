#!/bin/bash
set -euo pipefail

SERVICE_NAME="adnexus"

get_lan_ip() {
  local ip
  ip="$(hostname -I 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i !~ /^127\./) { print $i; exit }}')"
  if [ -n "${ip:-}" ]; then
    printf '%s' "$ip"
    return
  fi

  printf '127.0.0.1'
}

echo "--- AdNexus Service Status ---"
systemctl status "$SERVICE_NAME" --no-pager --lines=12 || true
echo
echo "--- Recent Logs ---"
journalctl -u "$SERVICE_NAME" -n 25 --no-pager || true
echo
echo "Open CMS:"
echo "  http://$(get_lan_ip):3000"
echo "  http://$(get_lan_ip):3000/login"
