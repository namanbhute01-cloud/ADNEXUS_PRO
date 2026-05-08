import { auth } from "@/auth";
import { mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = req.nextUrl.searchParams.get("key") ?? "";
  const expectedPrefix = `uploads/${session.user.id}/`;
  if (!key.startsWith(expectedPrefix) || key.includes("..") || !/^uploads\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(key)) {
    return NextResponse.json({ error: "Invalid upload key" }, { status: 400 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (!contentLength || contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large (max 500MB)" }, { status: 400 });
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
  await finished(uploadStream.pipe(createWriteStream(targetPath, { flags: "wx" })));

  return NextResponse.json({ ok: true, key });
}
