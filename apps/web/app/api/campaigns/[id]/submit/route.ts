import { auth } from "@/auth";
import { prisma } from "@vaart/database";
import { NextResponse } from "next/server";

type CampaignSubmitContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: CampaignSubmitContext) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    include: { media: { include: { media: true } } }
  });

  if (!campaign || campaign.media.length === 0 || campaign.media.some((m) => m.media.status !== "READY")) {
    return NextResponse.json({ error: "Invalid campaign" }, { status: 400 });
  }

  await prisma.campaign.update({
    where: { id },
    data: { status: "PENDING_REVIEW" }
  });

  return NextResponse.json({ success: true });
}
