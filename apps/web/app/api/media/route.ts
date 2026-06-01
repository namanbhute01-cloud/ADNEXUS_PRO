import { auth } from "@/auth";
import { prisma } from "@vaart/database";
import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { broadcastCampaignUpdate } from "@/lib/realtime";

function serializeMedia<T extends { sizeBytes: bigint }>(media: T) {
  return {
    ...media,
    sizeBytes: media.sizeBytes.toString(),
  };
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key, filename, originalName, type, sizeBytes } = await req.json();
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  const isLocalUpload = typeof key === "string" && key.startsWith("uploads/");

  const media = await prisma.media.create({
    data: {
      userId: user.id,
      r2Key: key,
      filename,
      originalName,
      type,
      sizeBytes: BigInt(Math.trunc(sizeBytes)),
      status: "READY",
      url: isLocalUpload
        ? `/${key}`
        : publicBase && publicBase !== "dummy"
          ? `${publicBase}/${key}`
          : `https://media.vaarte.in/${key}`,
    }
  });

  return NextResponse.json(serializeMedia(media));
}

export async function DELETE(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const impactedCampaigns = await prisma.campaignMedia.findMany({
    where: { mediaId: id },
    select: { campaignId: true },
  });

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

  await Promise.all(
    [...new Set(impactedCampaigns.map((item) => item.campaignId))].map((campaignId) =>
      broadcastCampaignUpdate(campaignId),
    ),
  );

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const media = await prisma.media.findMany({
    where:
      user.role === "ADMIN"
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
                            some: { userId: user.id },
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
  return NextResponse.json(media.map(serializeMedia));
}
