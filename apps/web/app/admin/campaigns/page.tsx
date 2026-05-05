import { prisma } from "@naart/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: { 
      user: { select: { name: true } },
      media: { include: { media: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-orange-600">Campaigns</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Review queue and active inventory</h1>
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Campaign</p>
                  <CardTitle className="mt-2 text-xl">{campaign.name}</CardTitle>
                  <p className="mt-2 text-sm text-slate-500">
                    {campaign.user.name} • {campaign.media.length} assets
                  </p>
                </div>
                <Badge variant="secondary">{campaign.status.replaceAll("_", " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {campaign.media.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{item.media.originalName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{item.media.type}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
