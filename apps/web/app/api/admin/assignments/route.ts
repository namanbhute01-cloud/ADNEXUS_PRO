import { auth } from "@/auth";
import { prisma } from "@vaart/database";
import { NextResponse } from "next/server";
import Pusher from "pusher";
import { getPlaylistForCampaign } from "@/lib/campaign-playlist";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
})

function hasPusherConfig() {
  return [process.env.PUSHER_APP_ID, process.env.PUSHER_KEY, process.env.PUSHER_SECRET, process.env.PUSHER_CLUSTER].every(
    (value) => value && value.trim() && value !== "dummy",
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
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
  if (hasPusherConfig()) {
    await pusher.trigger(
      `tv-${tv.ev.serialNumber}-${tv.subSerial}`,
      "content-update",
      {
        campaignId: assignment.campaign.id,
        playlist: await getPlaylistForCampaign(assignment.campaign.id),
      }
    );
  }

  return NextResponse.json(assignment, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
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
    if (hasPusherConfig()) {
      await pusher.trigger(
        `tv-${assignment.tv.ev.serialNumber}-${assignment.tv.subSerial}`,
        "content-update",
        {
          campaignId: null,
          playlist: [],
        }
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const assignments = await prisma.screenAssignment.findMany({ where: { isActive: true } });
  return NextResponse.json(assignments);
}
