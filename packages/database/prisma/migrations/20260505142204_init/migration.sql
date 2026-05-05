-- CreateEnum
CREATE TYPE "PlaybackLayer" AS ENUM ('PRIMARY', 'AMBIENT');

-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'AUDIO';

-- AlterTable
ALTER TABLE "CampaignMedia" ADD COLUMN     "duckAmbient" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "loopPlayback" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "playbackLayer" "PlaybackLayer" NOT NULL DEFAULT 'PRIMARY',
ADD COLUMN     "volumePercent" INTEGER NOT NULL DEFAULT 100;
