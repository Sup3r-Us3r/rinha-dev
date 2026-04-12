type SoundKey = 'start' | 'round-1' | 'damage' | 'hit' | 'deadth' | 'jump';

const SOUND_FILES: Record<SoundKey, string> = {
  start: '/sounds/start.mp3',
  'round-1': '/sounds/round-1.mp3',
  damage: '/sounds/damage.mp3',
  hit: '/sounds/hit.mp3',
  deadth: '/sounds/deadth.mp3',
  jump: '/sounds/jump.mp3',
};

class SoundEffects {
  private unlocked = false;
  private unlockPromise: Promise<void> | null = null;
  private readonly audioByKey = new Map<SoundKey, HTMLAudioElement>();

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    for (const [key, src] of Object.entries(SOUND_FILES) as Array<
      [SoundKey, string]
    >) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      this.audioByKey.set(key, audio);
    }
  }

  async unlock(): Promise<void> {
    if (this.unlocked || typeof window === 'undefined') {
      return;
    }

    if (this.unlockPromise) {
      await this.unlockPromise;
      return;
    }

    this.unlockPromise = Promise.resolve().then(async () => {
      const firstAudio = this.audioByKey.values().next().value;
      if (!firstAudio) {
        this.unlocked = true;
        return;
      }

      firstAudio.muted = true;

      try {
        firstAudio.currentTime = 0;
        await firstAudio.play();
        firstAudio.pause();
        firstAudio.currentTime = 0;
        this.unlocked = true;
      } finally {
        firstAudio.muted = false;
      }
    });

    try {
      await this.unlockPromise;
    } finally {
      this.unlockPromise = null;
    }
  }

  async play(sound: SoundKey): Promise<void> {
    const audio = this.audioByKey.get(sound);
    if (!audio) {
      return;
    }

    audio.currentTime = 0;

    try {
      await audio.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
    }
  }
}

export const soundEffects = new SoundEffects();
export type { SoundKey };
