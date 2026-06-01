import { auth } from "@/auth";
import { prisma } from "@vaart/database";
import { NextResponse } from "next/server";
import { broadcastCampaignUpdate, broadcastTvClear } from "@/lib/realtime";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tvId, campaignId, scheduleType, startTime, endTime } = await req.json();

  // Deactivate existing assignment for this TV
  await prisma.screenAssignment.updateMany({
    where: { tvId, isActive: true },
    data: { isActive: false },
  });

  // Create new assignment
  const assignment = await prisma.screenAssignment.create({
    data: { tvId, campaignId, scheduleType, startTime: startTime ? new Date(startTime) : null, endTime: endTime ? new Date(endTime) : null, isActive: true },
    include: {
      tv: { include: { ev: true } },
      campaign: { include: { media: { include: { media: true }, orderBy: { order: "asc" } } } }
    }
  });

  // Push real-time update to the TV
  const tv = assignment.tv;
  await broadcastCampaignUpdate(assignment.campaign.id);

  return NextResponse.json(assignment, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const assignment = await prisma.screenAssignment.findUnique({
    where: { id },
    include: { tv: { include: { ev: true } } }
  });

  if (assignment) {
    await prisma.screenAssignment.delete({ where: { id } });

    // Notify TV that it's unassigned
    await broadcastTvClear(assignment.tv.ev.serialNumber, assignment.tv.subSerial);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const assignments = await prisma.screenAssignment.findMany({ where: { isActive: true } });
  return NextResponse.json(assignments);
}
