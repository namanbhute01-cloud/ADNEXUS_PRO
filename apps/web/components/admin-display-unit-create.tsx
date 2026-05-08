"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MonitorUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminDisplayUnitCreate() {
  const router = useRouter();
  const [serialNumber, setSerialNumber] = useState("");
  const [locationName, setLocationName] = useState("");
  const [screenCount, setScreenCount] = useState(1);
  const [isPending, startTransition] = useTransition();

  async function createDisplayUnit() {
    const response = await fetch("/api/admin/display-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serialNumber, locationName, screenCount }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Create failed" }));
      toast.error(payload.error ?? "Create failed");
      return;
    }

    setSerialNumber("");
    setLocationName("");
    setScreenCount(1);
    toast.success("Display unit created");
    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_160px_auto] lg:items-end">
        <div className="space-y-2">
          <Label htmlFor="serial-number">Unit serial</Label>
          <Input
            id="serial-number"
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value)}
            placeholder="MALL-A-ENTRY"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-name">Location/name</Label>
          <Input
            id="location-name"
            value={locationName}
            onChange={(event) => setLocationName(event.target.value)}
            placeholder="Main lobby projector wall"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="screen-count">Screens/devices</Label>
          <Input
            id="screen-count"
            type="number"
            min={1}
            max={50}
            value={screenCount}
            onChange={(event) => setScreenCount(Number(event.target.value))}
            className="h-10"
          />
        </div>

        <Button className="h-10" disabled={isPending} onClick={createDisplayUnit}>
          <MonitorUp className="h-4 w-4" />
          Add unit
        </Button>
      </div>
    </section>
  );
}
