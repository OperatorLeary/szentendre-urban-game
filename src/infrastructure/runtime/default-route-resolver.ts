import type { SupabaseClient } from "@supabase/supabase-js";

import type { LoggerPort } from "@/application/ports/logger.port";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SUPABASE_TABLES } from "@/infrastructure/supabase/supabase-table-names";
import { getQuestEnvironmentConfig } from "@/shared/config/env";

export class DefaultRouteResolver {
  private readonly defaultRouteSlug: string;
  private cachedRouteId: string | null = null;

  public constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly logger: LoggerPort,
    defaultRouteSlug: string = getQuestEnvironmentConfig().defaultRouteSlug
  ) {
    this.defaultRouteSlug = defaultRouteSlug;
  }

  public async getDefaultRouteId(): Promise<string> {
    if (this.cachedRouteId !== null) {
      return this.cachedRouteId;
    }

    const { data, error } = await this.supabase
      .from(SUPABASE_TABLES.routes)
      .select("id")
      .eq("slug", this.defaultRouteSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (error !== null) {
      throw new RepositoryError(
        "Failed to resolve default route ID.",
        {
          repository: "DefaultRouteResolver",
          operation: "getDefaultRouteId",
          metadata: {
            routeSlug: this.defaultRouteSlug
          }
        },
        error
      );
    }

    if (data === null) {
      throw new RepositoryError("Default route was not found.", {
        repository: "DefaultRouteResolver",
        operation: "getDefaultRouteId",
        metadata: {
          routeSlug: this.defaultRouteSlug
        }
      });
    }

    this.cachedRouteId = data.id;
    this.logger.debug("Default route resolved.", {
      routeId: data.id,
      routeSlug: this.defaultRouteSlug
    });

    return data.id;
  }
}
