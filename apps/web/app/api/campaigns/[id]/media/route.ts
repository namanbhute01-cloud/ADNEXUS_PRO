import { auth } from "@/auth";
import { prisma } from "@naart/database";
import { NextRequest, NextResponse } from "next/server";
import { updateCampaignMediaSettings, upsertCampaignMediaSettings } from "@/lib/campaign-playlist";

type CampaignRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: CampaignRouteContext) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const { mediaId, order, displayTime, playbackLayer, volumePercent, duckAmbient, loopPlayback } = await req.json();
  const cm = await upsertCampaignMediaSettings({
    campaignId: id,
    mediaId,
    order,
    displayTime,
    playbackLayer,
    volumePercent,
    duckAmbient,
    loopPlayback,
  });
  return NextResponse.json(cm, { status: 201 });
}

export async function DELETE(req: NextRequest, context: CampaignRouteContext) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const { mediaId } = await req.json();

  if (!mediaId) {
    return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
  }

  await prisma.campaignMedia.delete({
    where: { campaignId_mediaId: { campaignId: id, mediaId } }
  });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: NextRequest, context: CampaignRouteContext) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const { mediaId, order, displayTime, playbackLayer, volumePercent, duckAmbient, loopPlayback } = await req.json();

  const updated = await updateCampaignMediaSettings({
    campaignId: id,
    mediaId,
    order,
    displayTime,
    playbackLayer,
    volumePercent,
    duckAmbient,
    loopPlayback,
  });

  return NextResponse.json(updated);
}
