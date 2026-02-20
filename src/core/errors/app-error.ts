import type { AppErrorCode } from "@/core/errors/error-codes";

export interface AppErrorOptions {
  readonly errorCode?: AppErrorCode;
  readonly cause?: unknown;
  readonly context?: Readonly<Record<string, unknown>>;
}

export abstract class AppError extends Error {
  public readonly errorCode: AppErrorCode | null;
  public override cause: unknown;
  public readonly context: Readonly<Record<string, unknown>>;

  protected constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.errorCode = options.errorCode ?? null;
    this.cause = options.cause;
    this.context = options.context ?? {};
  }
}

export class DomainError extends AppError {
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
  }
}

export class ApplicationError extends AppError {
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
  }
}

export class InfrastructureError extends AppError {
  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options);
  }
}
