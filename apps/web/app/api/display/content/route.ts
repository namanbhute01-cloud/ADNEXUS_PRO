import { prisma } from "@naart/database";
import { NextResponse } from "next/server";
import { getPlaylistForCampaign } from "@/lib/campaign-playlist";

export async function GET(req: Request) {
  const serial = req.headers.get("X-Serial");
  const subSerial = req.headers.get("X-SubSerial");

  if (!serial || !subSerial) return NextResponse.json({ error: "Missing headers" }, { status: 400 });

  const tv = await prisma.tV.findUnique({
    where: { subSerial },
    include: { ev: true }
  });

  if (!tv || tv.ev.serialNumber !== serial) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignment = await prisma.screenAssignment.findFirst({
    where: { tvId: tv.id, isActive: true },
    include: { campaign: { include: { media: { include: { media: true }, orderBy: { order: "asc" } } } } }
  });

  if (!assignment) return NextResponse.json({ playlist: [] });

  return NextResponse.json({
    playlist: await getPlaylistForCampaign(assignment.campaign.id),
    target: {
      serialNumber: tv.ev.serialNumber,
      subSerial: tv.subSerial,
      screenIndex: tv.screenIndex,
      deviceClass: "browser",
    },
  });
}
