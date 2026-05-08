"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { AppSettings } from "@/lib/app-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminSettingsForm({ settings }: { settings: AppSettings }) {
  const [form, setForm] = useState(settings);
  const [isPending, startTransition] = useTransition();

  function patch<T extends keyof AppSettings>(key: T, value: AppSettings[T]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings() {
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Settings save failed" }));
      toast.error(payload.error ?? "Settings save failed");
      return;
    }

    const saved = await response.json();
    setForm(saved);
    toast.success("Settings saved");
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="player-base-url">Player base URL</Label>
          <Input
            id="player-base-url"
            value={form.playerBaseUrl}
            onChange={(event) => patch("playerBaseUrl", event.target.value)}
            placeholder="http://192.168.29.79:3000"
            className="h-10"
          />
          <p className="text-xs text-slate-500">Projectors/tablets use this URL host for generated player links.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="heartbeat-offline-seconds">Offline after seconds</Label>
          <Input
            id="heartbeat-offline-seconds"
            type="number"
            min={15}
            max={3600}
            value={form.heartbeatOfflineSeconds}
            onChange={(event) => patch("heartbeatOfflineSeconds", Number(event.target.value))}
            className="h-10"
          />
          <p className="text-xs text-slate-500">Live monitor marks display offline after this gap.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-image-duration">Default image seconds</Label>
          <Input
            id="default-image-duration"
            type="number"
            min={1}
            max={600}
            value={form.defaultImageDuration}
            onChange={(event) => patch("defaultImageDuration", Number(event.target.value))}
            className="h-10"
          />
          <p className="text-xs text-slate-500">Fallback duration for image playback.</p>
        </div>

        <label className="flex min-h-24 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={form.allowLocalUploads}
            onChange={(event) => patch("allowLocalUploads", event.target.checked)}
            className="h-4 w-4"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">Allow local dev uploads</span>
            <span className="mt-1 block text-xs text-slate-500">Use local storage when R2 credentials missing.</span>
          </span>
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <Button disabled={isPending} onClick={() => startTransition(() => void saveSettings())}>
          <Save className="h-4 w-4" />
          Save settings
        </Button>
      </div>
    </section>
  );
}
