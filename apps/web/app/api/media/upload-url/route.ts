import { auth } from "@/auth"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { NextResponse } from "next/server"
import { v4 as uuid } from "uuid"

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

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

  const key = `media/${session.user.id}/${uuid()}-${filename}`

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
