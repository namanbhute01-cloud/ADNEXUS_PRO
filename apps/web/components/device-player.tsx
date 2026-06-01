"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Pusher from "pusher-js";
import { PlaybackEngine } from "@/components/playback-engine";

type PlaylistItem = {
  id: string;
  url: string;
  type: "VIDEO" | "IMAGE" | "AUDIO";
  order: number;
  duration: number | null;
  playbackLayer: "PRIMARY" | "AMBIENT";
  volumePercent: number;
  duckAmbient: boolean;
  loopPlayback: boolean;
  originalName: string;
};

type PlayerBootstrap = {
  playlist: PlaylistItem[];
  refreshSeconds: number;
};

const DUCKED_AMBIENT_VOLUME = 0.2;

export function DevicePlayer() {
  const params = useSearchParams();
  const serial = params.get("serial");
  const subSerial = params.get("sub");
  const apiBase = params.get("api") || "";
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const playlistSignatureRef = useRef("");
  const [refreshSeconds, setRefreshSeconds] = useState(15);
  const [status, setStatus] = useState("Waiting for device credentials");
  const [currentPrimary, setCurrentPrimary] = useState<PlaylistItem | null>(null);
  const ambientMediaRef = useRef<HTMLMediaElement | null>(null);
  const primaryMediaRef = useRef<HTMLMediaElement | null>(null);
  const engineRef = useRef<PlaybackEngine<PlaylistItem> | null>(null);

  const channelName = useMemo(
    () => (serial && subSerial ? `tv-${serial}-${subSerial}` : null),
    [serial, subSerial],
  );

  const baseUrl = apiBase || (typeof window !== "undefined" ? window.location.origin : "");

  const currentAmbient =
    useMemo(
      () => playlist.filter((item) => item.playbackLayer === "AMBIENT").sort((a, b) => a.order - b.order)[0] ?? null,
      [playlist],
    );

  const primaryItems = useMemo(
    () => playlist.filter((item) => item.playbackLayer === "PRIMARY").sort((a, b) => a.order - b.order),
    [playlist],
  );

  function signatureFor(items: PlaylistItem[]) {
    return items
      .map((item) => [
        item.id,
        item.url,
        item.order,
        item.duration ?? "",
        item.playbackLayer,
        item.volumePercent,
        item.duckAmbient ? "1" : "0",
        item.loopPlayback ? "1" : "0",
      ].join(":"))
      .join("|");
  }

  function applyPlaylist(items: PlaylistItem[], nextStatus: string) {
    const nextSignature = signatureFor(items);
    if (playlistSignatureRef.current !== nextSignature) {
      playlistSignatureRef.current = nextSignature;
      setPlaylist(items);
    }
    setStatus(nextStatus);
  }

  useEffect(() => {
    if (!serial || !subSerial) return;
    const serialValue = serial;
    const subSerialValue = subSerial;

    let cancelled = false;

    async function fetchContent(reason = "Connected") {
      try {
        const response = await fetch(`${baseUrl}/api/display/content`, {
          headers: {
            "X-Serial": serialValue,
            "X-SubSerial": subSerialValue,
          },
        });

        if (!response.ok) {
          setStatus("Unauthorized or not assigned");
          return;
        }

        const data = await response.json();
        if (!cancelled) {
          const payload = data as PlayerBootstrap;
          applyPlaylist(payload.playlist ?? [], `${reason} · ${subSerialValue}`);
          setRefreshSeconds(Math.max(5, Number(payload.refreshSeconds) || 15));
        }
      } catch {
        if (!cancelled) setStatus("Connection failed");
      }
    }

    void fetchContent();
    const syncInterval = setInterval(() => {
      void fetchContent("Sync online");
    }, refreshSeconds * 1000);

    const refreshNow = () => void fetchContent("Resynced");
    window.addEventListener("focus", refreshNow);
    window.addEventListener("online", refreshNow);
    document.addEventListener("visibilitychange", refreshNow);

    const heartbeat = setInterval(() => {
      fetch(`${baseUrl}/api/display/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Serial": serialValue,
          "X-SubSerial": subSerialValue,
        },
        body: JSON.stringify({ timestamp: Date.now() }),
      }).catch(() => undefined);
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(syncInterval);
      clearInterval(heartbeat);
      window.removeEventListener("focus", refreshNow);
      window.removeEventListener("online", refreshNow);
      document.removeEventListener("visibilitychange", refreshNow);
    };
  }, [baseUrl, refreshSeconds, serial, subSerial]);

  useEffect(() => {
    if (!channelName) return;

    const key = (process.env.NEXT_PUBLIC_PUSHER_KEY || "").trim();
    const cluster = (process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1").trim();

    if (!key) {
      return;
    }

    const pusher = new Pusher(key, { cluster });
    const channel = pusher.subscribe(channelName);

    channel.bind("content-update", (data: { playlist: PlaylistItem[] }) => {
      applyPlaylist(data.playlist ?? [], `Live update · ${subSerial}`);
    });

    channel.bind("clear-content", () => {
      applyPlaylist([], "Playlist cleared");
    });

    pusher.connection.bind("connected", () => setStatus(`Realtime online · ${subSerial}`));
    pusher.connection.bind("disconnected", () => setStatus("Realtime reconnecting"));

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [channelName, subSerial]);

  useEffect(() => {
    const engine = new PlaybackEngine<PlaylistItem>({
      playlist: [],
      onItemChange: (item) => setCurrentPrimary(item),
    });
    engineRef.current = engine;

    return () => {
      if (!engineRef.current) return;
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.updatePlaylist(primaryItems);
  }, [primaryItems]);

  function advancePrimary() {
    engineRef.current?.next();
  }

  function applyAmbientVolume(item: PlaylistItem | null, ducked: boolean) {
    const element = ambientMediaRef.current;
    if (!element || !item) return;
    const baseVolume = Math.max(0, Math.min(1, item.volumePercent / 100));
    element.volume = ducked ? baseVolume * DUCKED_AMBIENT_VOLUME : baseVolume;
  }

  async function tryStartMedia(
    element: HTMLMediaElement | null,
    kind: "ambient" | "primary",
    options: { allowMutedFallback?: boolean } = {},
  ) {
    if (!element) return;
    const { allowMutedFallback = true } = options;

    try {
      await element.play();
    } catch {
      if (allowMutedFallback) {
        try {
          element.muted = true;
          await element.play();
          return;
        } catch {
          // Fall through to blocked UI state.
        }
      }

      setStatus(`${kind === "ambient" ? "Ambient" : "Primary"} playback degraded`);
    }
  }

  useEffect(() => {
    if (!currentAmbient) return;
    applyAmbientVolume(currentAmbient, false);
  }, [currentAmbient]);

  useEffect(() => {
    if (!currentPrimary || !currentAmbient) return;
    const shouldDuck =
      currentPrimary.duckAmbient &&
      (currentPrimary.type === "VIDEO" || currentPrimary.type === "AUDIO");
    applyAmbientVolume(currentAmbient, shouldDuck);
    return () => applyAmbientVolume(currentAmbient, false);
  }, [currentAmbient, currentPrimary]);

  useEffect(() => {
    void tryStartMedia(ambientMediaRef.current, "ambient");
  }, [currentAmbient?.id]);

  useEffect(() => {
    void tryStartMedia(primaryMediaRef.current, "primary");
  }, [currentPrimary?.id]);

  if (!serial || !subSerial) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-8 text-white">
        <div className="max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Universal player</p>
          <h1 className="mt-4 text-4xl font-semibold">Open on any browser device.</h1>
          <p className="mt-4 text-sm text-slate-300">
            TVs, projectors, tablets, phones, kiosks, mini PCs. Use query string:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/50 p-4 text-sm text-orange-200">
{`/player?serial=NRT-EV-001&sub=NRT-EV-001-TV1`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
      {currentAmbient?.type === "VIDEO" ? (
        <video
          key={currentAmbient.id}
          ref={(element) => {
            ambientMediaRef.current = element;
            if (element) {
              element.volume = currentAmbient.volumePercent / 100;
              element.muted = false;
              element.defaultMuted = false;
            }
          }}
          className="absolute inset-0 h-full w-full object-cover opacity-35"
          src={currentAmbient.url}
          autoPlay
          loop
          preload="auto"
          muted={false}
          playsInline
        />
      ) : null}

      {currentAmbient?.type === "AUDIO" ? (
        <audio
          key={currentAmbient.id}
          ref={(element) => {
            ambientMediaRef.current = element;
              if (element) {
                element.volume = currentAmbient.volumePercent / 100;
                element.muted = false;
                element.defaultMuted = false;
              }
            }}
            src={currentAmbient.url}
            autoPlay
            loop
          preload="auto"
        />
      ) : null}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%)]" />

      <div className="relative z-10 flex h-full w-full items-center justify-center">
        {!currentPrimary ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/5 px-8 py-6 text-center backdrop-blur">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Idle</p>
            <h2 className="mt-3 text-3xl font-semibold">No primary content assigned</h2>
          </div>
        ) : currentPrimary.type === "VIDEO" ? (
          <video
            key={currentPrimary.id}
            className="h-full w-full object-cover"
            src={currentPrimary.url}
            autoPlay
            loop={false}
            playsInline
            ref={(element) => {
              primaryMediaRef.current = element;
              if (element) {
                element.volume = currentPrimary.volumePercent / 100;
                element.muted = false;
                element.defaultMuted = false;
              }
            }}
            onEnded={advancePrimary}
            onError={advancePrimary}
            onStalled={() => void tryStartMedia(primaryMediaRef.current, "primary")}
            onWaiting={() => void tryStartMedia(primaryMediaRef.current, "primary")}
            preload="auto"
          />
        ) : currentPrimary.type === "AUDIO" ? (
          <audio
            key={currentPrimary.id}
            src={currentPrimary.url}
            autoPlay
            loop={false}
            ref={(element) => {
              primaryMediaRef.current = element;
              if (element) {
                element.volume = currentPrimary.volumePercent / 100;
                element.muted = false;
                element.defaultMuted = false;
              }
            }}
            preload="auto"
            onEnded={advancePrimary}
            onError={advancePrimary}
            onStalled={() => void tryStartMedia(primaryMediaRef.current, "primary")}
            onWaiting={() => void tryStartMedia(primaryMediaRef.current, "primary")}
          />
        ) : (
          <ImageFrame item={currentPrimary} onDone={advancePrimary} />
        )}
      </div>

      <div className="absolute bottom-4 right-4 z-20 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs tracking-[0.2em] text-slate-200 backdrop-blur">
        {status}
      </div>
    </div>
  );
}

function ImageFrame({
  item,
  onDone,
}: {
  item: PlaylistItem;
  onDone: () => void;
}) {
  return (
    <Image
      key={item.id}
      src={item.url}
      alt={item.originalName}
      fill
      unoptimized
      className="object-cover"
      onError={onDone}
    />
  );
}
