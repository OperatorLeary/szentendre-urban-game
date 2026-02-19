import type { ClockPort } from "@/application/ports/clock.port";

export class SystemClockAdapter implements ClockPort {
  public now(): Date {
    return new Date();
  }
}
