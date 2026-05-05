import { auth } from "@/auth";
import { prisma } from "@naart/database";
import { Music4, ImageIcon, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function MediaPage() {
  const session = await auth();
  if (!session) return null;

  const media = await prisma.media.findMany({
    where: {
      campaignMedia: {
        some: {
          campaign: {
            assignments: {
              some: {
                isActive: true,
                tv: {
                  ev: {
                    campaignerAccess: {
                      some: { userId: session.user.id },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    include: {
      campaignMedia: {
        include: {
          campaign: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-700">Media vault</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Assigned content view</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Campaigner role now read-only. Admin owns upload, edit, playlist, ducking, background audio, everything content-control.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {media.map((item) => (
          <div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            {(item.type as string) === "AUDIO" ? (
              <Music4 className="h-5 w-5 text-cyan-600" />
            ) : item.type === "VIDEO" ? (
              <Video className="h-5 w-5 text-orange-600" />
            ) : (
              <ImageIcon className="h-5 w-5 text-slate-500" />
            )}
            <p className="mt-4 line-clamp-2 text-lg font-semibold text-slate-900">{item.originalName}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{item.type}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.campaignMedia.slice(0, 3).map((playlistItem) => (
                <Badge key={playlistItem.id} variant="secondary">
                  {playlistItem.campaign.name}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
