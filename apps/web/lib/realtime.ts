import Pusher from "pusher";
import { prisma } from "@vaart/database";
import { getPlaylistForCampaign } from "@/lib/campaign-playlist";

function isConfigured(value: string | undefined) {
  return Boolean(value && value.trim() && value !== "dummy");
}

export function hasPusherConfig() {
  return [
    process.env.PUSHER_APP_ID,
    process.env.PUSHER_KEY,
    process.env.PUSHER_SECRET,
    process.env.PUSHER_CLUSTER,
  ].every(isConfigured);
}

function getPusherClient() {
  if (!hasPusherConfig()) return null;

  return new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
  });
}

export async function broadcastCampaignUpdate(campaignId: string) {
  // Sync with Master Clock (Port 3001)
  try { await fetch('http://localhost:3001/admin/force-refresh'); } catch(e) {}

  const pusher = getPusherClient();
  if (!pusher) return;

  const [playlist, assignments] = await Promise.all([
    getPlaylistForCampaign(campaignId),
    prisma.screenAssignment.findMany({
      where: { campaignId, isActive: true },
      include: { tv: { include: { ev: true } } },
    }),
  ]);

  await Promise.all(
    assignments.map((assignment) =>
      pusher.trigger(
        `tv-${assignment.tv.ev.serialNumber}-${assignment.tv.subSerial}`,
        "content-update",
        {
          campaignId,
          playlist,
        },
      ),
    ),
  );
}

export async function broadcastTvClear(serialNumber: string, subSerial: string) {
  const pusher = getPusherClient();
  if (!pusher) return;

  await pusher.trigger(`tv-${serialNumber}-${subSerial}`, "content-update", {
    campaignId: null,
    playlist: [],
  });
}
