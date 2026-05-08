"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MonitorUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type CampaignOption = {
  id: string;
  name: string;
  status: string;
};

type TVOption = {
  id: string;
  subSerial: string;
  screenIndex: number;
  assignment: {
    id: string;
    campaignId: string;
    campaignName: string;
  } | null;
};

type EVOption = {
  id: string;
  serialNumber: string;
  locationName: string;
  isActive: boolean;
  tvs: TVOption[];
};

export function AdminAssignmentManager({
  evs,
  campaigns,
}: {
  evs: EVOption[];
  campaigns: CampaignOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCampaignByTv, setSelectedCampaignByTv] = useState<Record<string, string>>(() => {
    return Object.fromEntries(
      evs.flatMap((ev) => ev.tvs.map((tv) => [tv.id, tv.assignment?.campaignId ?? campaigns[0]?.id ?? ""])),
    );
  });

  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => ["DRAFT", "PENDING_REVIEW", "ACTIVE"].includes(campaign.status)),
    [campaigns],
  );

  async function assign(tv: TVOption) {
    const campaignId = selectedCampaignByTv[tv.id];
    if (!campaignId) {
      toast.error("Select campaign");
      return;
    }

    const response = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tvId: tv.id, campaignId, scheduleType: "CONTINUOUS" }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Assignment failed" }));
      toast.error(payload.error ?? "Assignment failed");
      return;
    }

    toast.success(`Assigned ${tv.subSerial}`);
    startTransition(() => router.refresh());
  }

  async function unassign(tv: TVOption) {
    if (!tv.assignment) return;

    const response = await fetch("/api/admin/assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tv.assignment.id }),
    });

    if (!response.ok) {
      toast.error("Unassign failed");
      return;
    }

    toast.success(`Unassigned ${tv.subSerial}`);
    startTransition(() => router.refresh());
  }

  if (!campaigns.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        No campaigns yet. Create campaign first, then upload and link media.
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {evs.map((ev) => (
        <section key={ev.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Display unit</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">{ev.serialNumber}</h2>
              <p className="mt-1 text-sm text-slate-500">{ev.locationName}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {ev.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {ev.tvs.map((tv) => (
              <div key={tv.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Display {tv.screenIndex}</p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-900">{tv.subSerial}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Current: {tv.assignment?.campaignName ?? "Empty"}
                    </p>
                  </div>

                  <select
                    className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm lg:w-56"
                    value={selectedCampaignByTv[tv.id] ?? ""}
                    onChange={(event) =>
                      setSelectedCampaignByTv((current) => ({ ...current, [tv.id]: event.target.value }))
                    }
                  >
                    <option value="">Select campaign</option>
                    {activeCampaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name} ({campaign.status})
                      </option>
                    ))}
                  </select>

                  <Button className="h-10 shrink-0" disabled={isPending} onClick={() => assign(tv)}>
                    <MonitorUp className="h-4 w-4" />
                    Assign
                  </Button>
                  {tv.assignment && (
                    <Button
                      variant="secondary"
                      className="h-10 shrink-0"
                      disabled={isPending}
                      onClick={() => unassign(tv)}
                    >
                      Unassign
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
