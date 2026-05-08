import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PortalShell } from "@/components/portal-shell";

export const dynamic = "force-dynamic";

const navLinks = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/evs", label: "Display Units", icon: "monitor" },
  { href: "/admin/media", label: "Media Studio", icon: "media" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/campaigns", label: "Campaigns", icon: "campaigns" },
  { href: "/admin/assignments", label: "Assignments", icon: "assignments" },
  { href: "/admin/monitor", label: "Live Monitor", icon: "screens" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <PortalShell
      appName="NAART-E"
      title="Operations Control"
      subtitle="Manage display units, approve campaign inventory, assign playlists to browser screens, and monitor playback health in real time."
      userName={session.user.name ?? "Admin"}
      userRole={session.user.role}
      tone="admin"
      navLinks={navLinks}
    >
      {children}
    </PortalShell>
  );
}
