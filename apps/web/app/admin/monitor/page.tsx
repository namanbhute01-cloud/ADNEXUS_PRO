import { prisma } from "@vaart/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppSettings } from "@/lib/app-settings";

export default async function MonitorPage() {
  const [tvs, settings] = await Promise.all([
    prisma.tV.findMany({
      include: {
        ev: true,
        heartbeats: { orderBy: { timestamp: "desc" }, take: 1 },
        assignments: { where: { isActive: true }, include: { campaign: true } },
      },
    }),
    getAppSettings(),
  ]);
  const offlineMs = settings.heartbeatOfflineSeconds * 1000;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-orange-600">Live monitor</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Playback heartbeat view</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tvs.map((tv) => {
          const lastHeartbeat = tv.heartbeats[0]?.timestamp;
          const isOnline = lastHeartbeat && new Date().getTime() - lastHeartbeat.getTime() < offlineMs;
          return (
            <Card key={tv.id} className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-mono">{tv.subSerial}</CardTitle>
                <Badge variant={isOnline ? "default" : "destructive"}>
                  {isOnline ? "Online" : "Offline"}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500">{tv.ev.serialNumber}</p>
                <p className="mt-2 text-sm font-medium">{tv.assignments[0]?.campaign.name || "No content"}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Last heartbeat: {lastHeartbeat ? lastHeartbeat.toLocaleString() : "Never"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
