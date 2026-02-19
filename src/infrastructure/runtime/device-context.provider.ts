import { getQuestEnvironmentConfig } from "@/shared/config/env";

export class DeviceContextProvider {
  private readonly storageKey: string;
  private cachedDeviceId: string | null = null;

  public constructor(storageKey: string = getQuestEnvironmentConfig().deviceIdStorageKey) {
    this.storageKey = storageKey;
  }

  public getDeviceId(): string {
    if (this.cachedDeviceId !== null) {
      return this.cachedDeviceId;
    }

    const fromStorage: string | null = this.readFromStorage();
    if (fromStorage !== null) {
      this.cachedDeviceId = fromStorage;
      return fromStorage;
    }

    const generatedDeviceId: string = this.generateDeviceId();
    this.writeToStorage(generatedDeviceId);
    this.cachedDeviceId = generatedDeviceId;
    return generatedDeviceId;
  }

  public getDeviceInfo(): string {
    if (typeof navigator === "undefined") {
      return "unknown-device";
    }

    return navigator.userAgent;
  }

  private readFromStorage(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const value: string | null = window.localStorage.getItem(this.storageKey);

      if (value === null || value.trim().length === 0) {
        return null;
      }

      return value;
    } catch {
      return null;
    }
  }

  private writeToStorage(value: string): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(this.storageKey, value);
    } catch {
      // Ignore storage errors and continue with in-memory device id.
    }
  }

  private generateDeviceId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
