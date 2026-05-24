type PlaybackEngineOptions<T> = {
  playlist: T[];
  onItemChange: (item: T | null, index: number) => void;
  loop?: boolean;
};

type PlaybackItem = {
  type: "VIDEO" | "IMAGE" | "AUDIO";
  duration: number | null;
};

export class PlaybackEngine<T extends PlaybackItem> {
  private playlist: T[];
  private readonly onItemChange: PlaybackEngineOptions<T>["onItemChange"];
  private readonly loop: boolean;
  private currentIndex = 0;
  private activeTimer: number | null = null;
  private isDestroyed = false;

  constructor({ playlist, onItemChange, loop = true }: PlaybackEngineOptions<T>) {
    this.playlist = Array.isArray(playlist) ? playlist : [];
    this.onItemChange = onItemChange;
    this.loop = loop;
  }

  start() {
    if (this.playlist.length === 0 || this.isDestroyed) {
      this.onItemChange(null, 0);
      return;
    }

    this.playCurrent();
  }

  next() {
    if (this.isDestroyed) return;

    this.clearTimer();
    this.currentIndex += 1;

    if (this.currentIndex >= this.playlist.length) {
      if (!this.loop) {
        this.onItemChange(null, this.currentIndex);
        return;
      }

      this.currentIndex = 0;
    }

    this.playCurrent();
  }

  updatePlaylist(newPlaylist: T[]) {
    if (this.isDestroyed) return;

    this.playlist = Array.isArray(newPlaylist) ? newPlaylist : [];
    this.currentIndex = 0;
    this.clearTimer();
    this.start();
  }

  destroy() {
    this.isDestroyed = true;
    this.clearTimer();
  }

  private playCurrent() {
    if (this.isDestroyed) return;

    this.clearTimer();

    const item = this.playlist[this.currentIndex];
    if (!item) {
      if (this.loop && this.playlist.length > 0) {
        this.currentIndex = 0;
        this.playCurrent();
        return;
      }

      this.onItemChange(null, this.currentIndex);
      return;
    }

    this.onItemChange(item, this.currentIndex);

    if (item.type === "IMAGE") {
      const durationMs = Math.max(1, item.duration ?? 10) * 1000;
      this.activeTimer = window.setTimeout(() => this.next(), durationMs);
    }
  }

  private clearTimer() {
    if (this.activeTimer !== null) {
      window.clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
  }
}
