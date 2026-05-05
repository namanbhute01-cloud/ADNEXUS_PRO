import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const items = [
  "R2 bucket, upload limits, and allowed media types",
  "Pusher credentials for live screen refresh",
  "Display heartbeat thresholds and offline alerts",
  "Admin seed data, role access, and EV onboarding",
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-orange-600">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Platform controls</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Core integration areas for storage, real-time updates, and fleet rules. Wire these to editable forms when backend settings models land.
        </p>
      </div>

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
