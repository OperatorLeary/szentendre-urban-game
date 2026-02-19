import type { AppServices } from "@/application/contracts/app-services.contract";
import { createGameUseCases } from "@/infrastructure/di/create-game-use-cases";
import { ConsoleLoggerAdapter } from "@/infrastructure/logging/console-logger.adapter";
import { SupabaseBugReportRepository } from "@/infrastructure/repositories/supabase-bug-report.repository";
import { SupabaseCheckinRepository } from "@/infrastructure/repositories/supabase-checkin.repository";
import { SupabaseLocationRepository } from "@/infrastructure/repositories/supabase-location.repository";
import { SupabaseRunRepository } from "@/infrastructure/repositories/supabase-run.repository";
import { DeviceContextProvider } from "@/infrastructure/runtime/device-context.provider";
import { DefaultRouteResolver } from "@/infrastructure/runtime/default-route-resolver";
import { createSupabaseClient } from "@/infrastructure/supabase/create-supabase-client";
import { SystemClockAdapter } from "@/infrastructure/time/system-clock.adapter";

let cachedServices: AppServices | null = null;

export function createAppServices(): AppServices {
  if (cachedServices !== null) {
    return cachedServices;
  }

  const logger = new ConsoleLoggerAdapter();
  const clock = new SystemClockAdapter();
  const supabase = createSupabaseClient();
  const deviceContextProvider = new DeviceContextProvider();
  const defaultRouteResolver = new DefaultRouteResolver(supabase, logger);

  const runRepository = new SupabaseRunRepository(
    supabase,
    defaultRouteResolver,
    deviceContextProvider,
    logger
  );
  const locationRepository = new SupabaseLocationRepository(
    supabase,
    defaultRouteResolver,
    logger
  );
  const checkinRepository = new SupabaseCheckinRepository(supabase, logger);
  const bugReportRepository = new SupabaseBugReportRepository(
    supabase,
    deviceContextProvider,
    logger
  );

  const gameUseCases = createGameUseCases({
    logger,
    clock,
    repositories: {
      runRepository,
      locationRepository,
      checkinRepository,
      bugReportRepository
    }
  });

  cachedServices = Object.freeze({
    logger,
    gameUseCases
  });

  return cachedServices;
}
