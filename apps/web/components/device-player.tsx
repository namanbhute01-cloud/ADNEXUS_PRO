"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Pusher from "pusher-js";

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

const DUCKED_AMBIENT_VOLUME = 0.2;

export function DevicePlayer() {
  const params = useSearchParams();
  const serial = params.get("serial");
  const subSerial = params.get("sub");
  const apiBase = params.get("api") || "";
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [status, setStatus] = useState("Waiting for device credentials");
  const [currentPrimary, setCurrentPrimary] = useState<PlaylistItem | null>(null);
  const [currentAmbient, setCurrentAmbient] = useState<PlaylistItem | null>(null);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const ambientMediaRef = useRef<HTMLMediaElement | null>(null);

  const channelName = useMemo(
    () => (serial && subSerial ? `tv-${serial}-${subSerial}` : null),
    [serial, subSerial],
  );

  const baseUrl = apiBase || (typeof window !== "undefined" ? window.location.origin : "");

  useEffect(() => {
    if (!serial || !subSerial) return;
    const serialValue = serial;
    const subSerialValue = subSerial;

    let cancelled = false;

    async function fetchContent() {
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
          setPlaylist(data.playlist ?? []);
          setStatus(`Connected · ${subSerialValue}`);
        }
      } catch {
        if (!cancelled) setStatus("Connection failed");
      }
    }

    fetchContent();
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
      clearInterval(heartbeat);
    };
  }, [baseUrl, serial, subSerial]);

  useEffect(() => {
    if (!channelName) return;

    const key = (process.env.NEXT_PUBLIC_PUSHER_KEY || "").trim();
    const cluster = (process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1").trim();

    if (!key) {
      setStatus("Missing realtime key");
      return;
    }

    const pusher = new Pusher(key, { cluster });
    const channel = pusher.subscribe(channelName);

    channel.bind("content-update", (data: { playlist: PlaylistItem[] }) => {
      setPlaylist(data.playlist ?? []);
      setStatus(`Live update · ${subSerial}`);
    });

    channel.bind("clear-content", () => {
      setPlaylist([]);
      setStatus("Playlist cleared");
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
    const ambient =
      playlist.filter((item) => item.playbackLayer === "AMBIENT").sort((a, b) => a.order - b.order)[0] ?? null;

    const primaryItems = playlist
      .filter((item) => item.playbackLayer === "PRIMARY")
      .sort((a, b) => a.order - b.order);

    setCurrentAmbient(ambient);
    setPrimaryIndex(0);
    setCurrentPrimary(primaryItems[0] ?? null);
  }, [playlist]);

  function advancePrimary() {
    const primaryItems = playlist
      .filter((item) => item.playbackLayer === "PRIMARY")
      .sort((a, b) => a.order - b.order);

    if (!primaryItems.length) {
      setCurrentPrimary(null);
      return;
    }

    const nextIndex = (primaryIndex + 1) % primaryItems.length;
    setPrimaryIndex(nextIndex);
    setCurrentPrimary(primaryItems[nextIndex]);
  }

  function applyAmbientVolume(item: PlaylistItem | null, ducked: boolean) {
    const element = ambientMediaRef.current;
    if (!element || !item) return;
    const baseVolume = Math.max(0, Math.min(1, item.volumePercent / 100));
    element.volume = ducked ? baseVolume * DUCKED_AMBIENT_VOLUME : baseVolume;
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
            }
          }}
          className="absolute inset-0 h-full w-full object-cover opacity-35"
          src={currentAmbient.url}
          autoPlay
          loop
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
            }
          }}
          src={currentAmbient.url}
          autoPlay
          loop
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
            loop={currentPrimary.loopPlayback}
            playsInline
            ref={(element) => {
              if (element) {
                element.volume = currentPrimary.volumePercent / 100;
              }
            }}
            onEnded={advancePrimary}
            onError={advancePrimary}
          />
        ) : currentPrimary.type === "AUDIO" ? (
          <audio
            key={currentPrimary.id}
            src={currentPrimary.url}
            autoPlay
            loop={currentPrimary.loopPlayback}
            ref={(element) => {
              if (element) {
                element.volume = currentPrimary.volumePercent / 100;
              }
            }}
            onEnded={advancePrimary}
            onError={advancePrimary}
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
  useEffect(() => {
    const timer = window.setTimeout(onDone, (item.duration || 10) * 1000);
    return () => window.clearTimeout(timer);
  }, [item.duration, onDone]);

  return (
    <img
      key={item.id}
      src={item.url}
      alt={item.originalName}
      className="h-full w-full object-cover"
      onError={onDone}
    />
  );
}
