import { auth } from "@/auth";
import { getAppSettings, normalizeAppSettings, updateAppSettings } from "@/lib/app-settings";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(await getAppSettings());
}

export async function PATCH(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const current = await getAppSettings();
  const incoming = await req.json();
  const settings = normalizeAppSettings({ ...current, ...incoming });
  await updateAppSettings(settings);
  return NextResponse.json(settings);
}
