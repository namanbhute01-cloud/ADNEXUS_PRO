import { auth } from "@/auth"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { NextResponse } from "next/server"
import { v4 as uuid } from "uuid"
import { getAppSettings } from "@/lib/app-settings"

function isConfigured(value: string | undefined) {
  return Boolean(value && value.trim() && value !== "dummy")
}

function hasR2Config() {
  return (
    isConfigured(process.env.R2_ACCOUNT_ID) &&
    isConfigured(process.env.R2_ACCESS_KEY_ID) &&
    isConfigured(process.env.R2_SECRET_ACCESS_KEY) &&
    isConfigured(process.env.R2_BUCKET_NAME)
  )
}

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 140) || "upload"
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { filename, contentType, sizeBytes } = await req.json()

  const allowedTypes = ["video/mp4", "video/webm", "image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"]
  if (!allowedTypes.includes(contentType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
  }
  if (sizeBytes > 500 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 500MB)" }, { status: 400 })
  }

  const settings = await getAppSettings()

  if (!hasR2Config() && settings.allowLocalUploads) {
    const key = `uploads/${session.user.id}/${uuid()}-${safeFilename(filename)}`
    return NextResponse.json({
      uploadUrl: `/api/media/local-upload?key=${encodeURIComponent(key)}`,
      key,
      storage: "local-dev",
    })
  }

  if (!hasR2Config()) {
    return NextResponse.json({ error: "R2 storage not configured and local uploads disabled" }, { status: 503 })
  }

  const key = `media/${session.user.id}/${uuid()}-${safeFilename(filename)}`

  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
    ContentLength: sizeBytes,
    Metadata: { uploadedBy: session.user.id },
  })

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 })

  return NextResponse.json({ uploadUrl, key })
}
