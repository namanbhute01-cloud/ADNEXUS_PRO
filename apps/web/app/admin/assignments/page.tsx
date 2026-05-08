import { prisma } from "@naart/database";
import { AdminAssignmentManager } from "@/components/admin-assignment-manager";

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
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, name: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-orange-600">Assignments</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Display assignment matrix</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Assign campaigns to any registered browser display: projector, TV, tablet, kiosk, or phone.
        </p>
      </div>

      <AdminAssignmentManager
        campaigns={campaigns}
        evs={evs.map((ev) => ({
          id: ev.id,
          serialNumber: ev.serialNumber,
          locationName: ev.locationName,
          isActive: ev.isActive,
          tvs: ev.tvs.map((tv) => ({
            id: tv.id,
            subSerial: tv.subSerial,
            screenIndex: tv.screenIndex,
            assignment: tv.assignments[0]
              ? {
                  id: tv.assignments[0].id,
                  campaignId: tv.assignments[0].campaignId,
                  campaignName: tv.assignments[0].campaign.name,
                }
              : null,
          })),
        }))}
      />
    </div>
  );
}
