import { prisma } from "@naart/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    where: { role: "CAMPAIGNER" },
    include: { 
      evAccess: true,
      campaigns: true
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-orange-600">Users</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Campaigner accounts</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {users.map((user) => (
          <Card key={user.id} className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Campaigner</p>
                  <CardTitle className="mt-2 text-xl">{user.name}</CardTitle>
                  <p className="mt-2 text-sm text-slate-500">{user.email}</p>
                </div>
                <Badge variant="secondary">Created {user.createdAt.toLocaleDateString()}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">EV access</p>
                <p className="mt-2 text-2xl font-semibold">{user.evAccess.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Campaigns</p>
                <p className="mt-2 text-2xl font-semibold">{user.campaigns.length}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
