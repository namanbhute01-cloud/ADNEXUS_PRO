export type PlaylistItem = {
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

export function buildPlaylist<T extends PlaylistItem>(items: T[]): PlaylistItem[] {
  return items.map((item) => ({ ...item }));
}
