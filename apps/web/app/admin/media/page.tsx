import { prisma } from "@vaart/database";
import { AdminMediaStudio } from "@/components/admin-media-studio";
import { getAppSettings } from "@/lib/app-settings";

export default async function AdminMediaPage() {
  const [media, campaigns, settings] = await Promise.all([
    prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        originalName: true,
        type: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.campaign.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
      },
    }),
    getAppSettings(),
  ]);

  return (
    <AdminMediaStudio
      media={media.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
      campaigns={campaigns}
      defaultImageDuration={settings.defaultImageDuration}
    />
  );
}
