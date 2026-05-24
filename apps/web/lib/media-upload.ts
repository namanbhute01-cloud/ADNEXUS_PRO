export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "2GB";

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
