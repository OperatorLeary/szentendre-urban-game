import {
  MAX_QR_TOKEN_LENGTH,
  MIN_QR_TOKEN_LENGTH
} from "@/core/constants/domain.constants";
import { normalizeNonEmptyText } from "@/core/validation/domain-assertions";

const CONTROL_CHARACTERS_PATTERN = /[\u0000-\u001f\u007f]/g;

export class QrToken {
  private constructor(private readonly normalizedValue: string) {}

  public static create(rawValue: string): QrToken {
    const normalizedValue: string = normalizeNonEmptyText(
      rawValue.replace(CONTROL_CHARACTERS_PATTERN, " "),
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
