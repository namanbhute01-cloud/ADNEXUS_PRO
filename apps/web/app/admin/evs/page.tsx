import { prisma } from "@naart/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EVsPage() {
  const evs = await prisma.eV.findMany({
    include: {
      tvs: {
        include: { assignments: { where: { isActive: true } } },
        orderBy: { screenIndex: "asc" },
      },
      _count: { select: { tvs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-orange-600">Display units</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">EV fleet inventory</h1>
      </div>

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
                <Badge variant={ev.isActive ? "default" : "secondary"}>
                  {ev.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {ev.tvs.map((tv) => (
                  <div key={tv.id} className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Screen {tv.screenIndex}</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{tv.subSerial}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {tv.assignments.length ? "Assigned" : "Idle"}
                    </p>
                    <p className="mt-3 break-all rounded-xl bg-white px-3 py-2 text-[11px] text-slate-500">
                      /player?serial={ev.serialNumber}&sub={tv.subSerial}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{ev._count.tvs} TVs configured</span>
                <span>Created {ev.createdAt.toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
