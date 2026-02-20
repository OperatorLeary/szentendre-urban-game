import {
  MAX_QR_TOKEN_LENGTH,
  MIN_QR_TOKEN_LENGTH
} from "@/core/constants/domain.constants";
import { normalizeNonEmptyText } from "@/core/validation/domain-assertions";

function replaceControlCharacters(value: string): string {
  return Array.from(value, (character: string): string => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      return character;
    }

    return codePoint <= 31 || codePoint === 127 ? " " : character;
  }).join("");
}

export class QrToken {
  private constructor(private readonly normalizedValue: string) {}

  public static create(rawValue: string): QrToken {
    const normalizedValue: string = normalizeNonEmptyText(
      replaceControlCharacters(rawValue),
      "qrToken",
      MIN_QR_TOKEN_LENGTH,
      MAX_QR_TOKEN_LENGTH
    ).toLowerCase();

    return new QrToken(normalizedValue);
  }

  public equals(other: QrToken): boolean {
    return this.normalizedValue === other.normalizedValue;
  }

  public toString(): string {
    return this.normalizedValue;
  }
}
