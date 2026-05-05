-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CAMPAIGNER');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'IMAGE');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('CONTINUOUS', 'SINGLE', 'SCHEDULED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CAMPAIGNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EV" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TV" (
    "id" TEXT NOT NULL,
    "evId" TEXT NOT NULL,
    "subSerial" TEXT NOT NULL,
    "screenIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignerEVAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "evId" TEXT NOT NULL,

    CONSTRAINT "CampaignerEVAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "duration" INTEGER,
    "sizeBytes" INTEGER NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMedia" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "displayTime" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "CampaignMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenAssignment" (
    "id" TEXT NOT NULL,
    "tvId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "scheduleType" "ScheduleType" NOT NULL DEFAULT 'CONTINUOUS',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreenAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TVHeartbeat" (
    "id" TEXT NOT NULL,
    "tvId" TEXT NOT NULL,
    "ip" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TVHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EV_serialNumber_key" ON "EV"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TV_subSerial_key" ON "TV"("subSerial");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignerEVAccess_userId_evId_key" ON "CampaignerEVAccess"("userId", "evId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_r2Key_key" ON "Media"("r2Key");

-- CreateIndex
CREATE INDEX "CampaignMedia_campaignId_order_idx" ON "CampaignMedia"("campaignId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMedia_campaignId_mediaId_key" ON "CampaignMedia"("campaignId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- AddForeignKey
ALTER TABLE "TV" ADD CONSTRAINT "TV_evId_fkey" FOREIGN KEY ("evId") REFERENCES "EV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignerEVAccess" ADD CONSTRAINT "CampaignerEVAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignerEVAccess" ADD CONSTRAINT "CampaignerEVAccess_evId_fkey" FOREIGN KEY ("evId") REFERENCES "EV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMedia" ADD CONSTRAINT "CampaignMedia_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMedia" ADD CONSTRAINT "CampaignMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenAssignment" ADD CONSTRAINT "ScreenAssignment_tvId_fkey" FOREIGN KEY ("tvId") REFERENCES "TV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenAssignment" ADD CONSTRAINT "ScreenAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TVHeartbeat" ADD CONSTRAINT "TVHeartbeat_tvId_fkey" FOREIGN KEY ("tvId") REFERENCES "TV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
