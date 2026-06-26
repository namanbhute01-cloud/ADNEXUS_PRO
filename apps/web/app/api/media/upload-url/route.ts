import { auth } from "@/auth"
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { NextResponse } from "next/server"
import { v4 as uuid } from "uuid"
import { getAppSettings } from "@/lib/app-settings"
import { ALLOWED_UPLOAD_TYPES, formatUploadLimit, isAllowedUploadType } from "@/lib/media-upload"

// Constants for chunking
const PART_SIZE = 5 * 1024 * 1024; // 5MB minimum for S3

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
  const user = session?.user
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { filename, contentType, sizeBytes } = await req.json()

  if (typeof filename !== "string" || typeof contentType !== "string" || !Number.isFinite(sizeBytes)) {
    return NextResponse.json({ error: "Invalid upload metadata" }, { status: 400 })
  }

  const settings = await getAppSettings()
  const maxUploadBytes = settings.uploadMaxBytes

  if (!isAllowedUploadType(contentType)) {
    return NextResponse.json({ error: `File type not allowed. Allowed: ${ALLOWED_UPLOAD_TYPES.join(", ")}` }, { status: 400 })
  }
  if (sizeBytes <= 0 || sizeBytes > maxUploadBytes) {
    return NextResponse.json({ error: `File too large (max ${formatUploadLimit(maxUploadBytes)})` }, { status: 400 })
  }

  // NOTE: For simplicity, we assume R2/S3 is configured for multipart uploads.
  // Local upload fallback would require a complex implementation of range-based merging.
  if (!hasR2Config()) {
    return NextResponse.json({ error: "R2 storage not configured" }, { status: 503 })
  }

  const key = `media/${user.id}/${uuid()}-${safeFilename(filename)}`
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  // Initiate multipart upload
  const createCommand = new CreateMultipartUploadCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
    Metadata: { uploadedBy: user.id },
  })
  
  const { UploadId } = await r2.send(createCommand)

  // Generate URLs for parts
  const partCount = Math.ceil(sizeBytes / PART_SIZE);
  const partUrls = [];
  
  for (let i = 1; i <= partCount; i++) {
    const command = new UploadPartCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        UploadId,
        PartNumber: i,
    });
    const url = await getSignedUrl(r2, command, { expiresIn: 3600 });
    partUrls.push({ partNumber: i, url });
  }

  return NextResponse.json({ uploadId: UploadId, key, partUrls })
}

export async function PATCH(req: Request) {
  const session = await auth()
  const user = session?.user
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { key, uploadId, parts } = await req.json()
  
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  const command = new CompleteMultipartUploadCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  })

  await r2.send(command)
  return NextResponse.json({ ok: true })
}
