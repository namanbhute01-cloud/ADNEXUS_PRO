"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminCampaignCreate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  async function createCampaign() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Campaign name required");
      return;
    }

    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Campaign create failed" }));
      toast.error(payload.error ?? "Campaign create failed");
      return;
    }

    setName("");
    toast.success("Campaign created");
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Campaign name"
        className="h-10"
      />
      <Button className="h-10 shrink-0" disabled={isPending} onClick={createCampaign}>
        <Plus className="h-4 w-4" />
        Create campaign
      </Button>
    </div>
  );
}
