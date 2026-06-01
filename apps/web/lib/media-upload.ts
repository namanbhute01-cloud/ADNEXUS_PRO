export const DEFAULT_MAX_UPLOAD_BYTES = 100 * 1024 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES = [
  "video/mp4",
  "video/webm",
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
] as const;

export function isAllowedUploadType(contentType: string) {
  return ALLOWED_UPLOAD_TYPES.includes(contentType as (typeof ALLOWED_UPLOAD_TYPES)[number]);
}

export function formatUploadLimit(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    const value = bytes / (1024 * 1024 * 1024);
    return `${Number.isInteger(value) ? value : value.toFixed(1)}GB`;
  }

  return `${Math.round(bytes / (1024 * 1024))}MB`;
}
