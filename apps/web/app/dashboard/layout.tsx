import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PortalShell } from "@/components/portal-shell";

export const dynamic = "force-dynamic";

const navLinks = [
  { href: "/dashboard", label: "Overview", icon: "dashboard" },
  { href: "/dashboard/screens", label: "Screens", icon: "screens" },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: "campaigns" },
  { href: "/dashboard/media", label: "Media Vault", icon: "media" },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <PortalShell
      appName="NAART-E"
      title="Campaigner Console"
      subtitle="Read-only portal for assigned campaigns, screen status, and currently displayed content across each EV."
      userName={session.user.name ?? "Campaigner"}
      userRole={session.user.role}
      tone="campaigner"
      navLinks={navLinks}
    >
      {children}
    </PortalShell>
  );
}
