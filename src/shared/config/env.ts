export interface RuntimeEnvironment {
  readonly mode: string;
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
}

export function getRuntimeEnvironment(): RuntimeEnvironment {
  const mode: string = import.meta.env.MODE;

  return {
    mode,
    isDevelopment: mode === "development",
    isProduction: mode === "production"
  };
}
