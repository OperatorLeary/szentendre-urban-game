import { InfrastructureError } from "@/core/errors/app-error";

export interface RepositoryErrorContext {
  readonly repository: string;
  readonly operation: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class RepositoryError extends InfrastructureError {
  public constructor(message: string, context: RepositoryErrorContext, cause?: unknown) {
    super(message, {
      cause,
      context: {
        repository: context.repository,
        operation: context.operation,
        ...(context.metadata ?? {})
      }
    });
  }
}
