/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type JSX,
  type ReactNode,
  type SetStateAction
} from "react";

export type ThemeMode = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

const THEME_MODE_STORAGE_KEY = "szentendre-city-quest-theme-mode";
const DEFAULT_THEME_MODE: ThemeMode = "light";
const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

interface ThemeContextValue {
  readonly mode: ThemeMode;
  readonly resolvedTheme: ResolvedTheme;
  readonly setMode: Dispatch<SetStateAction<ThemeMode>>;
}

interface ThemeProviderProps {
  readonly children: ReactNode;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemeMode(value: string): value is ThemeMode {
  return value === "light" || value === "dark" || value === "auto";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia(SYSTEM_DARK_QUERY).matches ? "dark" : "light";
}

function resolveInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_MODE;
  }

  const storedValue = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
  if (storedValue !== null && isThemeMode(storedValue)) {
    return storedValue;
  }

  return DEFAULT_THEME_MODE;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const [mode, setMode] = useState<ThemeMode>(resolveInitialThemeMode);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY);
    const handleThemeChange = (event: MediaQueryListEvent): void => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleThemeChange);

    return (): void => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, []);

  const resolvedTheme: ResolvedTheme = mode === "auto" ? systemTheme : mode;

  useEffect((): void => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  }, [mode]);

  useEffect((): void => {
    if (typeof document === "undefined") {
      return;
    }

    const rootElement = document.documentElement;
    rootElement.dataset.theme = resolvedTheme;
    rootElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const contextValue = useMemo<ThemeContextValue>(
    (): ThemeContextValue => ({
      mode,
      resolvedTheme,
      setMode
    }),
    [mode, resolvedTheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }

  return context;
}
