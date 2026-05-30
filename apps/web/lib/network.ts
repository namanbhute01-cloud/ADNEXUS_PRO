import os from "os";

function isPrivateIpv4(address: string) {
  return (
    /^10\./.test(address) ||
    /^192\.168\./.test(address) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

export function getPreferredLanAddress() {
  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];

  for (const adapter of Object.values(interfaces)) {
    for (const entry of adapter ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      candidates.push(entry.address);
    }
  }

  return candidates.find(isPrivateIpv4) ?? candidates[0] ?? "127.0.0.1";
}

export function resolveLanBaseUrl(port = 3000, protocol = "http") {
  return `${protocol}://${getPreferredLanAddress()}:${port}`;
}
