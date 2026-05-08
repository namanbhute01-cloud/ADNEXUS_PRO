import { auth } from "@/auth";
import { getAppSettings, normalizeAppSettings, updateAppSettings } from "@/lib/app-settings";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(await getAppSettings());
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = normalizeAppSettings(await req.json());
  await updateAppSettings(settings);
  return NextResponse.json(settings);
}
