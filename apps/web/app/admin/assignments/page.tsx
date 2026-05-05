import { prisma } from "@naart/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AssignmentsPage() {
  const evs = await prisma.eV.findMany({
    include: {
      tvs: {
        include: { assignments: { where: { isActive: true }, include: { campaign: true } } },
        orderBy: { screenIndex: "asc" },
      },
    },
    orderBy: { locationName: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-orange-600">Assignments</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">3-screen assignment matrix</h1>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {evs.map((ev) => (
          <Card key={ev.id} className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">EV unit</p>
                  <CardTitle className="mt-2 text-xl">{ev.serialNumber}</CardTitle>
                </div>
                <Badge variant={ev.isActive ? "default" : "secondary"}>
                  {ev.locationName}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((index) => {
                const tv = ev.tvs.find((item) => item.screenIndex === index);
                const assignment = tv?.assignments[0];
                return (
                  <div key={index} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Screen {index}</p>
                    <p className="mt-3 text-sm font-medium text-slate-900">
                      {assignment ? assignment.campaign.name : "Empty"}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{tv?.subSerial ?? "Not configured"}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
