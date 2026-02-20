import { InfrastructureError } from "@/core/errors/app-error";
import type { AppErrorCode } from "@/core/errors/error-codes";

export interface RepositoryErrorContext {
  readonly repository: string;
  readonly operation: string;
  readonly errorCode?: AppErrorCode;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class RepositoryError extends InfrastructureError {
  public constructor(message: string, context: RepositoryErrorContext, cause?: unknown) {
    super(message, {
      ...(context.errorCode === undefined ? {} : { errorCode: context.errorCode }),
      cause,
      context: {
        repository: context.repository,
        operation: context.operation,
        ...(context.metadata ?? {})
      }
    });
  }
}
