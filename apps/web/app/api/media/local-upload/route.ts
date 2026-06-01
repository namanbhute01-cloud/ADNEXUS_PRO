import { auth } from "@/auth";
import { mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import { rm } from "fs/promises";
import { Readable } from "stream";
import { finished } from "stream/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/app-settings";
import { formatUploadLimit } from "@/lib/media-upload";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = req.nextUrl.searchParams.get("key") ?? "";
  const expectedPrefix = `uploads/${user.id}/`;
  if (!key.startsWith(expectedPrefix) || key.includes("..") || !/^uploads\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(key)) {
    return NextResponse.json({ error: "Invalid upload key" }, { status: 400 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  const settings = await getAppSettings();
  if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > settings.uploadMaxBytes) {
    return NextResponse.json({ error: `File too large (max ${formatUploadLimit(settings.uploadMaxBytes)})` }, { status: 400 });
  }

  if (!req.body) {
    return NextResponse.json({ error: "Missing upload body" }, { status: 400 });
  }

  const publicDir = path.join(process.cwd(), "public");
  const targetPath = path.join(publicDir, key);
  const relativeTarget = path.relative(publicDir, targetPath);
  if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
    return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
  }

  const uploadStream = Readable.fromWeb(req.body as import("stream/web").ReadableStream<Uint8Array>);
  await mkdir(path.dirname(targetPath), { recursive: true });

  try {
    await finished(uploadStream.pipe(createWriteStream(targetPath, { flags: "wx" })));
  } catch (error) {
    await rm(targetPath, { force: true }).catch(() => undefined);
    throw error;
  }

  return NextResponse.json({ ok: true, key });
}
