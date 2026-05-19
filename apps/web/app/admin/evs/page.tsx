import { prisma } from "@vaart/database";
import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDisplayUnitCreate } from "@/components/admin-display-unit-create";
import { getAppSettings, playerUrl, resolvePlayerBaseUrl } from "@/lib/app-settings";
import { DeleteEVButton } from "@/components/delete-ev-button";

export default async function EVsPage() {
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const requestOrigin = host ? `${forwardedProto ?? "http"}://${host}` : null;
  const [evs, settings] = await Promise.all([
    prisma.eV.findMany({
      include: {
        tvs: {
          include: { assignments: { where: { isActive: true } } },
          orderBy: { screenIndex: "asc" },
        },
        _count: { select: { tvs: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getAppSettings(),
  ]);
  const runtimePlayerSettings = {
    ...settings,
    playerBaseUrl: resolvePlayerBaseUrl(settings, requestOrigin),
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-orange-600">Display units</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Open screen inventory</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Register any browser display: TV, projector, tablet, kiosk, mini PC, or mobile screen.
        </p>
      </div>

      <AdminDisplayUnitCreate />

      <div className="grid gap-5 xl:grid-cols-2">
        {evs.map((ev) => (
          <Card key={ev.id} className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Serial number</p>
                  <CardTitle className="mt-2 text-xl">{ev.serialNumber}</CardTitle>
                  <p className="mt-2 text-sm text-slate-500">{ev.locationName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ev.isActive ? "default" : "secondary"}>
                    {ev.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <DeleteEVButton id={ev.id} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
                {ev.tvs.map((tv) => (
                  <div key={tv.id} className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Display {tv.screenIndex}</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{tv.subSerial}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {tv.assignments.length ? "Assigned" : "Idle"}
                    </p>
                    <p className="mt-3 break-all rounded-xl bg-white px-3 py-2 text-[11px] text-slate-500">
                      {playerUrl(runtimePlayerSettings, ev.serialNumber, tv.subSerial)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{ev._count.tvs} displays configured</span>
                <span>Created {ev.createdAt.toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
