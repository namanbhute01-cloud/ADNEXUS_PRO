"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Music4, RefreshCcw, UploadCloud, Video, Waves } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type MediaItem = {
  id: string;
  originalName: string;
  type: "VIDEO" | "IMAGE" | "AUDIO";
  status: string;
  createdAt: string;
};

type CampaignOption = {
  id: string;
  name: string;
  status: string;
};

type AdminMediaStudioProps = {
  media: MediaItem[];
  campaigns: CampaignOption[];
};

type LinkState = {
  campaignId: string;
  order: number;
  displayTime: number;
  playbackLayer: "PRIMARY" | "AMBIENT";
  volumePercent: number;
  duckAmbient: boolean;
  loopPlayback: boolean;
};

const initialLinkState: LinkState = {
  campaignId: "",
  order: 1,
  displayTime: 10,
  playbackLayer: "PRIMARY",
  volumePercent: 100,
  duckAmbient: true,
  loopPlayback: false,
};

export function AdminMediaStudio({ media, campaigns }: AdminMediaStudioProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [selectedMediaId, setSelectedMediaId] = useState<string>(media[0]?.id ?? "");
  const [linkState, setLinkState] = useState<LinkState>({
    ...initialLinkState,
    campaignId: campaigns[0]?.id ?? "",
  });
  const [isPending, startTransition] = useTransition();

  const selectedMedia = useMemo(
    () => media.find((item) => item.id === selectedMediaId) ?? null,
    [media, selectedMediaId],
  );

  async function onDrop(acceptedFiles: File[]) {
    const file = acceptedFiles[0];
    if (!file) return;

    const uploadMetaResponse = await fetch("/api/media/upload-url", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      }),
    });

    if (!uploadMetaResponse.ok) {
      const payload = await uploadMetaResponse.json();
      toast.error(payload.error ?? "Upload URL failed");
      return;
    }

    const { uploadUrl, key } = await uploadMetaResponse.json();
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = async () => {
      const type = file.type.startsWith("video")
        ? "VIDEO"
        : file.type.startsWith("audio")
          ? "AUDIO"
          : "IMAGE";

      const registerResponse = await fetch("/api/media", {
        method: "POST",
        body: JSON.stringify({
          key,
          filename: file.name,
          originalName: file.name,
          type,
          sizeBytes: file.size,
        }),
      });

      if (!registerResponse.ok) {
        toast.error("Upload saved but registration failed");
        return;
      }

      toast.success("Media uploaded");
      setProgress(0);
      startTransition(() => router.refresh());
    };

    xhr.onerror = () => {
      setProgress(0);
      toast.error("Upload failed");
    };

    xhr.send(file);
  }

  async function attachToCampaign() {
    if (!selectedMedia || !linkState.campaignId) {
      toast.error("Select media and campaign");
      return;
    }

    const response = await fetch(`/api/campaigns/${linkState.campaignId}/media`, {
      method: "POST",
      body: JSON.stringify({
        mediaId: selectedMedia.id,
        order: linkState.order,
        displayTime: linkState.displayTime,
        playbackLayer: linkState.playbackLayer,
        volumePercent: linkState.volumePercent,
        duckAmbient: linkState.duckAmbient,
        loopPlayback: linkState.loopPlayback,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Link failed" }));
      toast.error(payload.error ?? "Link failed");
      return;
    }

    toast.success("Asset linked to campaign");
    startTransition(() => router.refresh());
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(135deg,#fff7ed,white_48%,#f0fdfa)] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-orange-600">Admin media</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ambient + primary playback studio</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Upload audio, video, image. Route background music as <strong>ambient</strong>. Primary video or audio can duck ambient volume automatically.
              </p>
            </div>
            <Button variant="outline" className="rounded-2xl" onClick={() => startTransition(() => router.refresh())}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </section>

        <section
          {...getRootProps()}
          className={`cursor-pointer rounded-[1.75rem] border-2 border-dashed p-8 text-center transition ${
            isDragActive ? "border-orange-500 bg-orange-50" : "border-slate-300 bg-white"
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-lg font-semibold text-slate-900">Drop assets for admin-controlled library</p>
          <p className="mt-2 text-sm text-slate-500">
            Supports image, video, audio. Campaigners no upload. View-only only.
          </p>
        </section>

        {progress > 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm font-medium text-slate-700">Upload progress</p>
            <Progress value={progress} />
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {media.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedMediaId(item.id)}
              className={`rounded-[1.5rem] border p-5 text-left transition ${
                selectedMediaId === item.id
                  ? "border-orange-400 bg-orange-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {item.type === "AUDIO" ? (
                <Music4 className="h-5 w-5 text-cyan-600" />
              ) : item.type === "VIDEO" ? (
                <Video className="h-5 w-5 text-orange-600" />
              ) : (
                <Waves className="h-5 w-5 text-slate-500" />
              )}
              <p className="mt-4 line-clamp-2 font-medium text-slate-900">{item.originalName}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{item.type}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
            </button>
          ))}
        </section>
      </div>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-700">Playlist linker</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Attach asset to campaign</h2>
        <p className="mt-2 text-sm text-slate-600">
          Ambient layer = looping background track. Primary layer = main display item. Duck ambient lowers background when primary item audio should lead.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Campaign
            <select
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4"
              value={linkState.campaignId}
              onChange={(event) => setLinkState((current) => ({ ...current, campaignId: event.target.value }))}
            >
              <option value="">Select campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} ({campaign.status})
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Order
              <input
                type="number"
                min={1}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4"
                value={linkState.order}
                onChange={(event) => setLinkState((current) => ({ ...current, order: Number(event.target.value) || 1 }))}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Layer
              <select
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4"
                value={linkState.playbackLayer}
                onChange={(event) =>
                  setLinkState((current) => ({
                    ...current,
                    playbackLayer: event.target.value as "PRIMARY" | "AMBIENT",
                  }))
                }
              >
                <option value="PRIMARY">Primary</option>
                <option value="AMBIENT">Ambient</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Image seconds
              <input
                type="number"
                min={1}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4"
                value={linkState.displayTime}
                onChange={(event) => setLinkState((current) => ({ ...current, displayTime: Number(event.target.value) || 10 }))}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Volume %
              <input
                type="number"
                min={0}
                max={100}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4"
                value={linkState.volumePercent}
                onChange={(event) => setLinkState((current) => ({ ...current, volumePercent: Number(event.target.value) || 0 }))}
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={linkState.duckAmbient}
              onChange={(event) => setLinkState((current) => ({ ...current, duckAmbient: event.target.checked }))}
            />
            Duck ambient when primary media with foreground audio plays
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={linkState.loopPlayback}
              onChange={(event) => setLinkState((current) => ({ ...current, loopPlayback: event.target.checked }))}
            />
            Loop playback for ambient beds or long-running background content
          </label>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Selected asset:
            <span className="ml-2 font-medium text-slate-900">
              {selectedMedia ? `${selectedMedia.originalName} · ${selectedMedia.type}` : "None"}
            </span>
          </div>

          <Button className="h-12 w-full rounded-2xl" disabled={isPending} onClick={attachToCampaign}>
            Link asset to campaign
          </Button>
        </div>
      </section>
    </div>
  );
}
