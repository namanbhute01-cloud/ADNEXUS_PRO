import { auth } from "@/auth";
import { prisma } from "@naart/database";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaigns = await prisma.campaign.findMany({
    where:
      session.user.role === "ADMIN"
        ? undefined
        : { assignments: { some: { tv: { ev: { campaignerAccess: { some: { userId: session.user.id } } } } } } },
    include: {
      _count: { select: { media: true, assignments: true } },
      user: { select: { name: true, email: true } },
    }
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name } = await req.json();
  const campaign = await prisma.campaign.create({
    data: { name, userId: session.user.id }
  });
  return NextResponse.json(campaign, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, name, status } = await req.json();

  const result = await prisma.campaign.updateMany({
    where: { id, userId: session.user.id },
    data: { name, status },
  });

  if (!result.count) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  return NextResponse.json(campaign);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();

  const result = await prisma.campaign.deleteMany({
    where: { id, userId: session.user.id, status: "DRAFT" },
  });

  if (!result.count) {
    return NextResponse.json({ error: "Draft campaign not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
