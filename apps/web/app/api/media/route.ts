import { auth } from "@/auth";
import { prisma } from "@naart/database";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key, filename, originalName, type, sizeBytes } = await req.json();

  const media = await prisma.media.create({
    data: {
      userId: session.user.id,
      r2Key: key,
      filename,
      originalName,
      type,
      sizeBytes,
      url: `https://media.naarte.in/${key}`,
    }
  });

  return NextResponse.json(media);
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
