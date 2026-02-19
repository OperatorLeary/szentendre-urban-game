import type { LogContext, LoggerPort } from "@/application/ports/logger.port";
import { APP_LOG_PREFIX } from "@/shared/constants/app.constants";
import { getRuntimeEnvironment } from "@/shared/config/env";

type LogLevel = "debug" | "info" | "warn" | "error";

export class ConsoleLoggerAdapter implements LoggerPort {
  private readonly runtime = getRuntimeEnvironment();

  public debug(message: string, context?: LogContext): void {
    if (this.runtime.isProduction) {
      return;
    }

    this.write("debug", message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.write("warn", message, context);
  }

  public error(message: string, context?: LogContext): void {
    this.write("error", message, context);
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp: string = new Date().toISOString();
    const logMessage: string = `${APP_LOG_PREFIX} [${timestamp}] ${message}`;

    if (context === undefined) {
      this.writeWithoutContext(level, logMessage);
      return;
    }

    this.writeWithContext(level, logMessage, context);
  }

  private writeWithoutContext(level: LogLevel, message: string): void {
    switch (level) {
      case "debug":
        console.debug(message);
        return;
      case "info":
        console.info(message);
        return;
      case "warn":
        console.warn(message);
        return;
      case "error":
        console.error(message);
        return;
      default:
        this.assertNever(level);
    }
  }

  private writeWithContext(
    level: LogLevel,
    message: string,
    context: LogContext
  ): void {
    switch (level) {
      case "debug":
        console.debug(message, context);
        return;
      case "info":
        console.info(message, context);
        return;
      case "warn":
        console.warn(message, context);
        return;
      case "error":
        console.error(message, context);
        return;
      default:
        this.assertNever(level);
    }
  }

  private assertNever(level: never): never {
    throw new Error(`Unsupported log level: ${level as string}`);
  }
}
