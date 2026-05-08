import { auth } from "@/auth";
import { prisma } from "@naart/database";
import { NextResponse } from "next/server";

function cleanSerial(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const serialNumber = cleanSerial(body.serialNumber);
  const locationName = String(body.locationName ?? "").trim().slice(0, 120);
  const parsedScreenCount = Number(body.screenCount ?? 1);
  const screenCount = Math.min(50, Math.max(1, Number.isFinite(parsedScreenCount) ? parsedScreenCount : 1));

  if (!serialNumber) {
    return NextResponse.json({ error: "Serial number required" }, { status: 400 });
  }

  if (!locationName) {
    return NextResponse.json({ error: "Location/name required" }, { status: 400 });
  }

  try {
    const displayUnit = await prisma.eV.create({
      data: {
        serialNumber,
        locationName,
        tvs: {
          create: Array.from({ length: screenCount }, (_, index) => ({
            subSerial: `${serialNumber}-SCREEN-${index + 1}`,
            screenIndex: index + 1,
          })),
        },
      },
      include: { tvs: { orderBy: { screenIndex: "asc" } } },
    });

    return NextResponse.json(displayUnit, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Serial already exists" }, { status: 409 });
    }

    return NextResponse.json({ error: "Display unit create failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // Get all TV IDs for this EV to clean up related data
  const tvs = await prisma.tV.findMany({ where: { evId: id } });
  const tvIds = tvs.map((tv) => tv.id);

  // Manual cleanup for relations without Cascade
  await prisma.tVHeartbeat.deleteMany({ where: { tvId: { in: tvIds } } });
  await prisma.screenAssignment.deleteMany({ where: { tvId: { in: tvIds } } });
  await prisma.tV.deleteMany({ where: { evId: id } });
  await prisma.campaignerEVAccess.deleteMany({ where: { evId: id } });
  await prisma.eV.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
