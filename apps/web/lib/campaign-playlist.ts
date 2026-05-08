import { prisma } from "@naart/database";
import { randomUUID } from "crypto";
import type { PlaylistItem } from "@/lib/display-playlist";

type ColumnCheck = { exists: boolean };

async function hasAdvancedPlaybackColumns() {
  const rows = await prisma.$queryRaw<ColumnCheck[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'CampaignMedia'
        AND column_name = 'playbackLayer'
    ) AS "exists"
  `;

  return rows[0]?.exists ?? false;
}

export async function getPlaylistForCampaign(campaignId: string): Promise<PlaylistItem[]> {
  const advanced = await hasAdvancedPlaybackColumns();

  if (advanced) {
    return prisma.$queryRaw<PlaylistItem[]>`
      SELECT
        cm."id" AS "id",
        m."url" AS "url",
        m."type" AS "type",
        cm."order" AS "order",
        CASE WHEN m."type" = 'IMAGE' THEN cm."displayTime" ELSE m."duration" END AS "duration",
        cm."playbackLayer" AS "playbackLayer",
        cm."volumePercent" AS "volumePercent",
        cm."duckAmbient" AS "duckAmbient",
        cm."loopPlayback" AS "loopPlayback",
        m."originalName" AS "originalName"
      FROM "CampaignMedia" cm
      INNER JOIN "Media" m ON m."id" = cm."mediaId"
      WHERE cm."campaignId" = ${campaignId}
      ORDER BY cm."order" ASC
    `;
  }

  return prisma.$queryRaw<PlaylistItem[]>`
    SELECT
      cm."id" AS "id",
      m."url" AS "url",
      m."type" AS "type",
      cm."order" AS "order",
      CASE WHEN m."type" = 'IMAGE' THEN cm."displayTime" ELSE m."duration" END AS "duration",
      'PRIMARY' AS "playbackLayer",
      100 AS "volumePercent",
      true AS "duckAmbient",
      false AS "loopPlayback",
      m."originalName" AS "originalName"
    FROM "CampaignMedia" cm
    INNER JOIN "Media" m ON m."id" = cm."mediaId"
    WHERE cm."campaignId" = ${campaignId}
    ORDER BY cm."order" ASC
  `;
}

export async function upsertCampaignMediaSettings(input: {
  campaignId: string;
  mediaId: string;
  order: number;
  displayTime: number;
  playbackLayer: "PRIMARY" | "AMBIENT";
  volumePercent: number;
  duckAmbient: boolean;
  loopPlayback: boolean;
}) {
  return prisma.campaignMedia.upsert({
    where: {
      campaignId_mediaId: {
        campaignId: input.campaignId,
        mediaId: input.mediaId,
      },
    },
    update: {
      order: input.order,
      displayTime: input.displayTime,
      playbackLayer: input.playbackLayer,
      volumePercent: Math.max(0, Math.min(100, input.volumePercent)),
      duckAmbient: input.duckAmbient,
      loopPlayback: input.loopPlayback,
    },
    create: {
      campaignId: input.campaignId,
      mediaId: input.mediaId,
      order: input.order,
      displayTime: input.displayTime,
      playbackLayer: input.playbackLayer,
      volumePercent: Math.max(0, Math.min(100, input.volumePercent)),
      duckAmbient: input.duckAmbient,
      loopPlayback: input.loopPlayback,
    },
  });
}

export async function updateCampaignMediaSettings(input: {
  campaignId: string;
  mediaId: string;
  order: number;
  displayTime: number;
  playbackLayer: "PRIMARY" | "AMBIENT";
  volumePercent: number;
  duckAmbient: boolean;
  loopPlayback: boolean;
}) {
  const advanced = await hasAdvancedPlaybackColumns();

  if (!advanced) {
    return prisma.campaignMedia.update({
      where: { campaignId_mediaId: { campaignId: input.campaignId, mediaId: input.mediaId } },
      data: {
        order: input.order,
        displayTime: input.displayTime,
      },
    });
  }

  await prisma.$executeRaw`
    UPDATE "CampaignMedia"
    SET
      "order" = ${input.order},
      "displayTime" = ${input.displayTime},
      "playbackLayer" = ${input.playbackLayer}::"PlaybackLayer",
      "volumePercent" = ${Math.max(0, Math.min(100, input.volumePercent))},
      "duckAmbient" = ${input.duckAmbient},
      "loopPlayback" = ${input.loopPlayback}
    WHERE "campaignId" = ${input.campaignId}
      AND "mediaId" = ${input.mediaId}
  `;

  return { ok: true };
}
