import {
  createClient,
  type SupabaseClient
} from "@supabase/supabase-js";

import { DeviceContextProvider } from "@/infrastructure/runtime/device-context.provider";
import type { Database } from "@/infrastructure/supabase/database.types";
import { getSupabaseEnvironmentConfig } from "@/shared/config/env";

let cachedClient: SupabaseClient<Database> | null = null;
const deviceContextProvider = new DeviceContextProvider();

export function createSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient !== null) {
    return cachedClient;
  }

  const config = getSupabaseEnvironmentConfig();
  const deviceId: string = deviceContextProvider.getDeviceId();

  cachedClient = createClient<Database>(config.url, config.anonKey, {
    global: {
      headers: {
        "x-device-id": deviceId
      }
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });

  return cachedClient;
}
