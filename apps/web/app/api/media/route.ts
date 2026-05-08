import { auth } from "@/auth";
import { prisma } from "@naart/database";
import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key, filename, originalName, type, sizeBytes } = await req.json();
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  const isLocalUpload = typeof key === "string" && key.startsWith("uploads/");

  const media = await prisma.media.create({
    data: {
      userId: session.user.id,
      r2Key: key,
      filename,
      originalName,
      type,
      sizeBytes,
      status: "READY",
      url: isLocalUpload
        ? `/${key}`
        : publicBase && publicBase !== "dummy"
          ? `${publicBase}/${key}`
          : `https://media.naarte.in/${key}`,
    }
  });

  return NextResponse.json(media);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete related campaignMedia first
  await prisma.campaignMedia.deleteMany({ where: { mediaId: id } });
  
  // Delete from DB
  await prisma.media.delete({ where: { id } });

  // If local upload, delete file
  if (media.r2Key.startsWith("uploads/")) {
    try {
      const filePath = path.join(process.cwd(), "public", media.r2Key);
      await unlink(filePath);
    } catch (e) {
      console.error("Failed to delete local file:", e);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const media = await prisma.media.findMany({
    where:
      session.user.role === "ADMIN"
        ? undefined
        : {
            campaignMedia: {
              some: {
                campaign: {
                  assignments: {
                    some: {
                      isActive: true,
                      tv: {
                        ev: {
                          campaignerAccess: {
                            some: { userId: session.user.id },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(media);
}
