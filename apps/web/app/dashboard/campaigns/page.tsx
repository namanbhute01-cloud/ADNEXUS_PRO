import { auth } from "@/auth";
import { prisma } from "@vaart/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CampaignsPage() {
  const session = await auth();
  if (!session) return null;
  const campaigns = await prisma.campaign.findMany({
    where: {
      assignments: {
        some: {
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
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-700">Campaigns</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your campaign pipeline</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Read-only campaign feed for content already routed to EV screens you can access.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {campaigns.map((c) => (
          <Card key={c.id} className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Campaign</p>
                  <CardTitle className="mt-2 text-xl">{c.name}</CardTitle>
                </div>
                <Badge variant="secondary">{c.status.replaceAll("_", " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Media</p>
                <p className="mt-2 text-2xl font-semibold">{c._count.media}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Assignments</p>
                <p className="mt-2 text-2xl font-semibold">{c._count.assignments}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Updated</p>
                <p className="mt-2 text-base font-semibold">{c.updatedAt.toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
