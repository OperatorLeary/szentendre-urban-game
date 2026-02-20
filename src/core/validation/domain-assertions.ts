import { DomainError } from "@/core/errors/app-error";

export function assertCondition(
  condition: boolean,
  message: string,
  context: Readonly<Record<string, unknown>> = {}
): void {
  if (!condition) {
    throw new DomainError(message, {
      context
    });
  }
}

export function assertFiniteNumber(value: number, fieldName: string): void {
  assertCondition(Number.isFinite(value), `${fieldName} must be a finite number.`, {
    fieldName,
    value
  });
}

export function assertNumberInRange(
  value: number,
  fieldName: string,
  min: number,
  max: number
): void {
  assertFiniteNumber(value, fieldName);
  assertCondition(value >= min, `${fieldName} must be >= ${String(min)}.`, {
    fieldName,
    min,
    value
  });
  assertCondition(value <= max, `${fieldName} must be <= ${String(max)}.`, {
    fieldName,
    max,
    value
  });
}

export function assertPositiveInteger(value: number, fieldName: string): void {
  assertCondition(Number.isInteger(value), `${fieldName} must be an integer.`, {
    fieldName,
    value
  });
  assertCondition(value > 0, `${fieldName} must be greater than zero.`, {
    fieldName,
    value
  });
}

export function assertValidDate(value: Date, fieldName: string): void {
  assertCondition(!Number.isNaN(value.getTime()), `${fieldName} must be a valid date.`, {
    fieldName,
    value
  });
}

export function normalizeNonEmptyText(
  value: string,
  fieldName: string,
  minLength = 1,
  maxLength = Number.MAX_SAFE_INTEGER
): string {
  const normalizedValue: string = value.trim().replace(/\s+/g, " ");

  assertCondition(normalizedValue.length >= minLength, `${fieldName} is too short.`, {
    fieldName,
    minLength,
    value: normalizedValue
  });
  assertCondition(normalizedValue.length <= maxLength, `${fieldName} is too long.`, {
    fieldName,
    maxLength,
    value: normalizedValue
  });

  return normalizedValue;
}
