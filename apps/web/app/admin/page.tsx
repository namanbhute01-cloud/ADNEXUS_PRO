import { prisma } from "@naart/database";
import { Film, LayoutDashboard, Monitor, RadioTower, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppSettings } from "@/lib/app-settings";

async function getStats() {
  const [evs, tvs, campaigns, users] = await Promise.all([
    prisma.eV.count({ where: { isActive: true } }),
    prisma.tV.count(),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "CAMPAIGNER" } }),
  ]);
  return { evs, tvs, campaigns, users };
}

async function getLiveTvCount(offlineSeconds: number) {
  const cutoff = new Date(Date.now() - offlineSeconds * 1000);
  return prisma.tV.count({
    where: { heartbeats: { some: { timestamp: { gte: cutoff } } } },
  });
}

export default async function AdminDashboardPage() {
  const settings = await getAppSettings();
  const [stats, recentCampaigns, liveCount] = await Promise.all([
    getStats(),
    prisma.campaign.findMany({
      include: { user: { select: { name: true } }, _count: { select: { media: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    getLiveTvCount(settings.heartbeatOfflineSeconds),
  ]);

  const cards = [
    { title: "Display Units", value: stats.evs, icon: Monitor },
    { title: "Total Displays", value: stats.tvs, icon: LayoutDashboard },
    { title: "Active Campaigns", value: stats.campaigns, icon: Film },
    { title: "Campaigners", value: stats.users, icon: Users },
  ];
  return (
    <div className="space-y-8">
      <section className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(135deg,#fff7ed,white_44%,#ecfeff)] p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-orange-600">Admin overview</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Fleet operations at a glance</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Central control for display boxes, campaign review, screen assignment, and live playback reliability.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live displays</p>
            <div className="mt-2 flex items-center gap-2">
              <RadioTower className="h-5 w-5 text-emerald-500" />
              <span className="text-3xl font-semibold">{liveCount}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold tracking-tight">Recent campaign activity</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {recentCampaigns.map((campaign) => (
            <div key={campaign.id} className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-slate-950">{campaign.name}</p>
                <p className="text-sm text-slate-500">
                  {campaign.user.name} • {campaign._count.media} assets • updated {campaign.updatedAt.toLocaleDateString()}
                </p>
              </div>
              <Badge variant="secondary">{campaign.status.replaceAll("_", " ")}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
