import { auth } from "@/auth";
import { prisma } from "@naart/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CampaignerDashboardPage() {
  const session = await auth();
  if (!session) return null;

  const evs = await prisma.eV.findMany({
    where: { campaignerAccess: { some: { userId: session.user.id } } },
    include: { tvs: { include: { assignments: { where: { isActive: true }, include: { campaign: true } } } } },
    orderBy: { locationName: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-700">Screens</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Assigned display inventory</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Each unit can have any number of browser displays. Verify which campaign is routed to each playback surface.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {evs.map((ev) => (
          <Card key={ev.id} className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Display unit</p>
                  <CardTitle className="mt-2 text-xl">{ev.locationName}</CardTitle>
                </div>
                <Badge variant={ev.isActive ? "default" : "secondary"}>
                  {ev.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-slate-500">Serial: {ev.serialNumber}</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
                {ev.tvs
                  .sort((a, b) => a.screenIndex - b.screenIndex)
                  .map((tv) => (
                  <div key={tv.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
                      Display {tv.screenIndex}
                    </p>
                    <p className="mt-3 text-sm font-medium text-slate-950">{tv.subSerial}</p>
                    <Badge className="mt-4" variant={tv.assignments.length ? "default" : "secondary"}>
                      {tv.assignments.length ? tv.assignments[0].campaign.name : "No campaign"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
