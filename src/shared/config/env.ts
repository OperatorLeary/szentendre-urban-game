export interface RuntimeEnvironment {
  readonly mode: string;
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
}

export interface SupabaseEnvironmentConfig {
  readonly url: string;
  readonly anonKey: string;
}

export interface QuestEnvironmentConfig {
  readonly defaultRouteSlug: string;
  readonly deviceIdStorageKey: string;
}

const DEFAULT_ROUTE_SLUG = "short";
const DEFAULT_DEVICE_ID_STORAGE_KEY = "szentendre-city-quest-device-id";

export function getRuntimeEnvironment(): RuntimeEnvironment {
  const mode: string = import.meta.env.MODE;

  return {
    mode,
    isDevelopment: mode === "development",
    isProduction: mode === "production"
  };
}

export function getSupabaseEnvironmentConfig(): SupabaseEnvironmentConfig {
  const url = getRequiredEnvironmentVariable("VITE_SUPABASE_URL");
  const anonKey = getRequiredEnvironmentVariable("VITE_SUPABASE_ANON_KEY");

  return {
    url,
    anonKey
  };
}

export function getQuestEnvironmentConfig(): QuestEnvironmentConfig {
  return {
    defaultRouteSlug: getOptionalEnvironmentVariable(
      "VITE_DEFAULT_ROUTE_SLUG",
      DEFAULT_ROUTE_SLUG
    ),
    deviceIdStorageKey: getOptionalEnvironmentVariable(
      "VITE_DEVICE_ID_STORAGE_KEY",
      DEFAULT_DEVICE_ID_STORAGE_KEY
    )
  };
}

function getRequiredEnvironmentVariable(name: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const value: string | undefined = env[name];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getOptionalEnvironmentVariable(name: string, fallback: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const value: string | undefined = env[name];

  if (value === undefined || value.trim().length === 0) {
    return fallback;
  }

  return value.trim();
}
