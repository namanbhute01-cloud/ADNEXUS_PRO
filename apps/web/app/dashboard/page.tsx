import { auth } from "@/auth";
import { prisma } from "@vaart/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) return null;

  const [campaigns, media, evs] = await Promise.all([
    prisma.campaign.findMany({
      where: {
        assignments: {
          some: {
            isActive: true,
            tv: {
              ev: {
                campaignerAccess: {
                  some: { userId: session.user.id },
                },
              },
            },
          },
        },
      },
      include: { _count: { select: { media: true, assignments: true } } },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.media.count({
      where: {
        campaignMedia: {
          some: {
            campaign: {
              assignments: {
                some: {
                  isActive: true,
                  tv: {
                    ev: {
                      campaignerAccess: {
                        some: { userId: session.user.id },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.eV.findMany({
      where: { campaignerAccess: { some: { userId: session.user.id } } },
      include: {
        tvs: {
          include: {
            assignments: {
              where: { isActive: true },
              include: { campaign: true },
            },
          },
        },
      },
    }),
  ]);

  const activeAssignments = evs.reduce(
    (total, ev) => total + ev.tvs.filter((tv) => tv.assignments.length > 0).length,
    0,
  );
  const stats = [
    { label: "Display units", value: evs.length },
    { label: "Active displays", value: activeAssignments },
    { label: "Campaigns", value: campaigns.length },
    { label: "Media assets", value: media },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(135deg,#fff7ed,white_45%,#ecfeff)] p-6 shadow-sm md:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-700">Overview</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          Welcome back, {session.user.name ?? "Campaigner"}.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          View assigned displays, active campaigns, and approved content. Content editing stays admin-only.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle>Recent campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                No campaigns yet. Start in Campaigns, then upload media in Media Vault.
              </div>
            ) : (
              campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div>
                    <p className="font-medium text-slate-900">{campaign.name}</p>
                    <p className="text-sm text-slate-500">
                      {campaign._count.media} assets • {campaign._count.assignments} assignments
                    </p>
                  </div>
                  <Badge variant="secondary">{campaign.status.replaceAll("_", " ")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle>Assigned display units</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {evs.map((ev) => (
              <div key={ev.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{ev.locationName}</p>
                    <p className="text-sm text-slate-500">{ev.serialNumber}</p>
                  </div>
                  <Badge variant={ev.isActive ? "default" : "secondary"}>
                    {ev.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
                  {ev.tvs
                    .sort((a, b) => a.screenIndex - b.screenIndex)
                    .map((tv) => (
                      <div key={tv.id} className="rounded-2xl bg-slate-50 p-3 text-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Display {tv.screenIndex}</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {tv.assignments[0]?.campaign.name ?? "Empty"}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
