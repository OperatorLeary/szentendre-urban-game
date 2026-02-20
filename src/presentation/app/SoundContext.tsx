import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode
} from "react";

import { SoundEngine, type QuestSound } from "@/presentation/audio/sound-engine";

const SOUND_ENABLED_STORAGE_KEY = "szentendre-city-quest-sound-enabled";
const DEFAULT_SOUND_ENABLED = true;

interface SoundContextValue {
  readonly isEnabled: boolean;
  toggleEnabled: () => void;
  play: (sound: QuestSound) => void;
  unlock: () => void;
}

interface SoundProviderProps {
  readonly children: ReactNode;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function getInitialSoundPreference(): boolean {
  if (typeof window === "undefined") {
    return DEFAULT_SOUND_ENABLED;
  }

  const value = window.localStorage.getItem(SOUND_ENABLED_STORAGE_KEY);
  if (value === null) {
    return DEFAULT_SOUND_ENABLED;
  }

  return value === "1";
}

export function SoundProvider({ children }: SoundProviderProps): JSX.Element {
  const [isEnabled, setIsEnabled] = useState<boolean>(getInitialSoundPreference);
  const soundEngineRef = useRef<SoundEngine | null>(null);

  const getSoundEngine = useCallback((): SoundEngine => {
    if (soundEngineRef.current === null) {
      soundEngineRef.current = new SoundEngine();
    }

    return soundEngineRef.current;
  }, []);

  const unlock = useCallback((): void => {
    if (!isEnabled) {
      return;
    }

    void getSoundEngine().unlock();
  }, [getSoundEngine, isEnabled]);

  const play = useCallback(
    (sound: QuestSound): void => {
      if (!isEnabled) {
        return;
      }

      const engine = getSoundEngine();

      if (!engine.isUnlocked()) {
        void engine.unlock().then((): void => {
          engine.play(sound);
        });
        return;
      }

      engine.play(sound);
    },
    [getSoundEngine, isEnabled]
  );

  const toggleEnabled = useCallback((): void => {
    setIsEnabled((previous: boolean): boolean => !previous);
  }, []);

  useEffect((): void => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, isEnabled ? "1" : "0");
  }, [isEnabled]);

  useEffect((): (() => void) => {
    const unlockOnGesture = (): void => {
      unlock();
    };

    window.addEventListener("pointerdown", unlockOnGesture, { passive: true });
    window.addEventListener("keydown", unlockOnGesture, { passive: true });
    window.addEventListener("touchstart", unlockOnGesture, { passive: true });

    return (): void => {
      window.removeEventListener("pointerdown", unlockOnGesture);
      window.removeEventListener("keydown", unlockOnGesture);
      window.removeEventListener("touchstart", unlockOnGesture);
    };
  }, [unlock]);

  const value = useMemo<SoundContextValue>(
    (): SoundContextValue => ({
      isEnabled,
      toggleEnabled,
      play,
      unlock
    }),
    [isEnabled, play, toggleEnabled, unlock]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const context = useContext(SoundContext);
  if (context === null) {
    throw new Error("useSound must be used within a SoundProvider.");
  }

  return context;
}

