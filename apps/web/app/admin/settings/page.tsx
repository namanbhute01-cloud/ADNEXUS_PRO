import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSettingsForm } from "@/components/admin-settings-form";
import { getAppSettings } from "@/lib/app-settings";
import { resolveLanBaseUrl } from "@/lib/network";

const items = [
  "R2 bucket, upload limits, and allowed media types",
  "Pusher credentials for live screen refresh",
  "Display heartbeat thresholds and offline alerts",
  "Admin seed data, role access, and display onboarding",
];

export default async function SettingsPage() {
  const settings = await getAppSettings();
  const detectedLanUrl = resolveLanBaseUrl();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-orange-600">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Platform controls</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Core integration areas for storage, real-time updates, and display rules.
        </p>
      </div>

      <AdminSettingsForm key={JSON.stringify(settings)} settings={settings} />

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle>Detected network host</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>Server can bind `0.0.0.0`, but screens need routable host URL.</p>
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-slate-900">{detectedLanUrl}</p>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle>Configuration areas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
