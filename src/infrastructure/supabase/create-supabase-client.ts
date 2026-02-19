import {
  createClient,
  type SupabaseClient
} from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/supabase/database.types";
import { getSupabaseEnvironmentConfig } from "@/shared/config/env";

let cachedClient: SupabaseClient<Database> | null = null;

export function createSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient !== null) {
    return cachedClient;
  }

  const config = getSupabaseEnvironmentConfig();

  cachedClient = createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });

  return cachedClient;
}
