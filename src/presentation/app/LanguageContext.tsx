/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type JSX,
  type ReactNode,
  type SetStateAction
} from "react";

import type { AppLanguage } from "@/presentation/i18n/language.types";
import {
  translations,
  type TranslationKey
} from "@/presentation/i18n/translations";

const LANGUAGE_STORAGE_KEY = "szentendre-city-quest-language";
const DEFAULT_LANGUAGE: AppLanguage = "hu";

interface TranslationParams {
  readonly [placeholder: string]: string;
}

interface LanguageContextValue {
  readonly language: AppLanguage;
  readonly setLanguage: Dispatch<SetStateAction<AppLanguage>>;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

interface LanguageProviderProps {
  readonly children: ReactNode;
}

function resolveInitialLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const storedValue: string | null = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedValue === "hu" || storedValue === "en") {
    return storedValue;
  }

  return DEFAULT_LANGUAGE;
}

function interpolateMessage(template: string, params: TranslationParams): string {
  let resolvedMessage = template;
  Object.entries(params).forEach(([key, value]): void => {
    resolvedMessage = resolvedMessage.replaceAll(`{${key}}`, value);
  });
  return resolvedMessage;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: LanguageProviderProps): JSX.Element {
  const [language, setLanguage] = useState<AppLanguage>(resolveInitialLanguage);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key: TranslationKey, params?: TranslationParams): string => {
        const template = translations[language][key];

        if (params === undefined) {
          return template;
        }

        return interpolateMessage(template, params);
      }
    }),
    [language]
  );

  useEffect((): void => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }

  return context;
}
