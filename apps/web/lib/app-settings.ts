import { prisma } from "@vaart/database";

export type AppSettings = {
  heartbeatOfflineSeconds: number;
  playerBaseUrl: string;
  defaultImageDuration: number;
  allowLocalUploads: boolean;
};

const defaults: AppSettings = {
  heartbeatOfflineSeconds: 120,
  playerBaseUrl:
    process.env.NEXT_PUBLIC_PLAYER_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000",
  defaultImageDuration: 10,
  allowLocalUploads: true,
};

const settingKeys = Object.keys(defaults) as (keyof AppSettings)[];

async function ensureSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AppSetting" (
      "key" TEXT PRIMARY KEY,
      "value" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function serializeSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  if (typeof defaults[key] === "boolean") return value ? "true" : "false";
  return String(value);
}

function parseSetting<K extends keyof AppSettings>(key: K, value: string | null | undefined): AppSettings[K] {
  const fallback = defaults[key];
  if (value == null || value === "") return fallback;
  if (typeof fallback === "boolean") return (value === "true") as AppSettings[K];
  if (typeof fallback === "number") {
    const parsed = Number(value);
    return (Number.isFinite(parsed) ? parsed : fallback) as AppSettings[K];
  }
  return value as AppSettings[K];
}

export async function getAppSettings(): Promise<AppSettings> {
  await ensureSettingsTable();
  const rows = await prisma.$queryRawUnsafe<{ key: keyof AppSettings; value: string }[]>(
    `SELECT "key", "value" FROM "AppSetting"`,
  );

  const values = new Map(rows.filter((row) => settingKeys.includes(row.key)).map((row) => [row.key, row.value]));
  return {
    heartbeatOfflineSeconds: parseSetting("heartbeatOfflineSeconds", values.get("heartbeatOfflineSeconds")),
    playerBaseUrl: parseSetting("playerBaseUrl", values.get("playerBaseUrl")),
    defaultImageDuration: parseSetting("defaultImageDuration", values.get("defaultImageDuration")),
    allowLocalUploads: parseSetting("allowLocalUploads", values.get("allowLocalUploads")),
  };
}

export function normalizeAppSettings(input: Partial<AppSettings>): AppSettings {
  const heartbeatOfflineSeconds = Math.min(3600, Math.max(15, Number(input.heartbeatOfflineSeconds ?? defaults.heartbeatOfflineSeconds)));
  const defaultImageDuration = Math.min(600, Math.max(1, Number(input.defaultImageDuration ?? defaults.defaultImageDuration)));
  const playerBaseUrl = String(input.playerBaseUrl ?? defaults.playerBaseUrl).trim().replace(/\/$/, "");

  return {
    heartbeatOfflineSeconds,
    playerBaseUrl: playerBaseUrl || defaults.playerBaseUrl,
    defaultImageDuration,
    allowLocalUploads: Boolean(input.allowLocalUploads),
  };
}

export async function updateAppSettings(settings: AppSettings) {
  await ensureSettingsTable();
  await prisma.$transaction(
    settingKeys.map((key) =>
      prisma.$executeRawUnsafe(
        `
          INSERT INTO "AppSetting" ("key", "value", "updatedAt")
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT ("key")
          DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP
        `,
        key,
        serializeSetting(key, settings[key]),
      ),
    ),
  );
}

export function resolvePlayerBaseUrl(
  settings: AppSettings,
  fallbackOrigin?: string | null,
) {
  const configured = String(settings.playerBaseUrl || "").trim().replace(/\/$/, "");
  const fallback = String(fallbackOrigin || "").trim().replace(/\/$/, "");

  if (!configured) {
    return fallback || defaults.playerBaseUrl;
  }

  try {
    const configuredUrl = new URL(configured);
    const configuredHost = configuredUrl.hostname.toLowerCase();
    const fallbackUrl = fallback ? new URL(fallback) : null;
    const fallbackHost = fallbackUrl?.hostname.toLowerCase() ?? "";

    if (
      fallbackUrl &&
      (configuredHost === "localhost" ||
        configuredHost === "127.0.0.1" ||
        configuredHost === "0.0.0.0") &&
      fallbackHost &&
      fallbackHost !== "localhost" &&
      fallbackHost !== "127.0.0.1" &&
      fallbackHost !== "0.0.0.0"
    ) {
      configuredUrl.protocol = fallbackUrl.protocol;
      configuredUrl.hostname = fallbackUrl.hostname;
      configuredUrl.port = fallbackUrl.port;
      return configuredUrl.toString().replace(/\/$/, "");
    }
  } catch {
    return fallback || configured;
  }

  return configured;
}

export function playerUrl(settings: AppSettings, serial: string, subSerial: string) {
  return `${settings.playerBaseUrl}/player?serial=${encodeURIComponent(serial)}&sub=${encodeURIComponent(subSerial)}`;
}
