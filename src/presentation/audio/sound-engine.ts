export type QuestSound =
  | "tap"
  | "success"
  | "finale"
  | "error"
  | "transition"
  | "language_hu"
  | "language_en";

interface ToneSpec {
  readonly frequency: number;
  readonly durationMs: number;
  readonly volume: number;
  readonly type: OscillatorType;
  readonly delayMs?: number;
}

type AudioContextFactory = typeof AudioContext;

const SOUND_LIBRARY: Readonly<Record<QuestSound, readonly ToneSpec[]>> = Object.freeze({
  tap: [{ frequency: 760, durationMs: 44, volume: 0.035, type: "triangle" }],
  success: [
    { frequency: 620, durationMs: 65, volume: 0.04, type: "sine" },
    { frequency: 880, durationMs: 78, volume: 0.04, type: "sine", delayMs: 72 }
  ],
  finale: [
    { frequency: 523, durationMs: 120, volume: 0.036, type: "sine" },
    { frequency: 659, durationMs: 120, volume: 0.034, type: "sine", delayMs: 110 },
    { frequency: 784, durationMs: 145, volume: 0.034, type: "sine", delayMs: 220 },
    { frequency: 1047, durationMs: 260, volume: 0.03, type: "triangle", delayMs: 335 }
  ],
  error: [
    { frequency: 350, durationMs: 80, volume: 0.045, type: "sawtooth" },
    { frequency: 280, durationMs: 95, volume: 0.038, type: "sawtooth", delayMs: 84 }
  ],
  transition: [{ frequency: 520, durationMs: 38, volume: 0.02, type: "triangle" }],
  language_hu: [
    { frequency: 196, durationMs: 360, volume: 0.014, type: "triangle" },
    { frequency: 392, durationMs: 95, volume: 0.028, type: "triangle" },
    { frequency: 494, durationMs: 92, volume: 0.026, type: "triangle", delayMs: 84 },
    { frequency: 622, durationMs: 112, volume: 0.027, type: "sine", delayMs: 168 },
    { frequency: 523, durationMs: 122, volume: 0.024, type: "sine", delayMs: 280 }
  ],
  language_en: [
    { frequency: 196, durationMs: 340, volume: 0.013, type: "sine" },
    { frequency: 392, durationMs: 86, volume: 0.026, type: "triangle" },
    { frequency: 494, durationMs: 84, volume: 0.025, type: "triangle", delayMs: 76 },
    { frequency: 587, durationMs: 94, volume: 0.026, type: "triangle", delayMs: 152 },
    { frequency: 784, durationMs: 122, volume: 0.027, type: "sine", delayMs: 242 },
    { frequency: 659, durationMs: 84, volume: 0.022, type: "sine", delayMs: 356 }
  ]
});

interface WindowWithWebkitAudioContext extends Window {
  readonly AudioContext?: AudioContextFactory;
  readonly webkitAudioContext?: AudioContextFactory;
}

export class SoundEngine {
  private context: AudioContext | null = null;
  private unlocked = false;

  public async unlock(): Promise<void> {
    const context = this.getContext();
    if (context === null) {
      return;
    }

    if (context.state === "suspended") {
      await context.resume();
    }

    this.unlocked = context.state === "running";
  }

  public play(sound: QuestSound): void {
    const context = this.getContext();
    if (context === null || !this.unlocked) {
      return;
    }

    const tones: readonly ToneSpec[] = SOUND_LIBRARY[sound];
    const baseTime = context.currentTime;

    tones.forEach((tone: ToneSpec): void => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startTime = baseTime + (tone.delayMs ?? 0) / 1000;
      const endTime = startTime + tone.durationMs / 1000;

      oscillator.type = tone.type;
      oscillator.frequency.value = tone.frequency;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(tone.volume, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(startTime);
      oscillator.stop(endTime + 0.01);
    });
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") {
      return null;
    }

    if (this.context !== null) {
      return this.context;
    }

    const audioContextClass = this.resolveAudioContextClass(window);
    if (audioContextClass === null) {
      return null;
    }

    this.context = new audioContextClass();
    return this.context;
  }

  private resolveAudioContextClass(
    targetWindow: Window
  ): AudioContextFactory | null {
    const audioWindow = targetWindow as WindowWithWebkitAudioContext;
    const constructorCandidate =
      audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (typeof constructorCandidate === "function") {
      return constructorCandidate;
    }

    return null;
  }
}
