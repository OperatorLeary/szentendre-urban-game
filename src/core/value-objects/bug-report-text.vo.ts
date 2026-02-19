import {
  MAX_BUG_REPORT_DESCRIPTION_LENGTH,
  MAX_BUG_REPORT_DETAILS_LENGTH,
  MAX_BUG_REPORT_SUMMARY_LENGTH,
  MIN_BUG_REPORT_DESCRIPTION_LENGTH,
  MIN_BUG_REPORT_DETAILS_LENGTH,
  MIN_BUG_REPORT_SUMMARY_LENGTH
} from "@/core/constants/domain.constants";
import { normalizeNonEmptyText } from "@/core/validation/domain-assertions";

const UNSAFE_HTML_CHARACTERS_PATTERN = /[<>]/g;
const CONTROL_CHARACTERS_PATTERN = /[\u0000-\u001f\u007f]/g;

export function sanitizeUserInput(rawValue: string): string {
  return rawValue
    .replace(CONTROL_CHARACTERS_PATTERN, " ")
    .replace(UNSAFE_HTML_CHARACTERS_PATTERN, "");
}

export class BugReportSummary {
  private constructor(private readonly value: string) {}

  public static create(rawValue: string): BugReportSummary {
    const sanitizedValue: string = normalizeNonEmptyText(
      sanitizeUserInput(rawValue),
      "bugReportSummary",
      MIN_BUG_REPORT_SUMMARY_LENGTH,
      MAX_BUG_REPORT_SUMMARY_LENGTH
    );

    return new BugReportSummary(sanitizedValue);
  }

  public toString(): string {
    return this.value;
  }
}

export class BugReportDescription {
  private constructor(private readonly value: string) {}

  public static create(rawValue: string): BugReportDescription {
    const sanitizedValue: string = normalizeNonEmptyText(
      sanitizeUserInput(rawValue),
      "bugReportDescription",
      MIN_BUG_REPORT_DESCRIPTION_LENGTH,
      MAX_BUG_REPORT_DESCRIPTION_LENGTH
    );

    return new BugReportDescription(sanitizedValue);
  }

  public toString(): string {
    return this.value;
  }
}

export class BugReportDetails {
  private constructor(private readonly value: string) {}

  public static create(rawValue: string): BugReportDetails {
    const sanitizedValue: string = normalizeNonEmptyText(
      sanitizeUserInput(rawValue),
      "bugReportDetails",
      MIN_BUG_REPORT_DETAILS_LENGTH,
      MAX_BUG_REPORT_DETAILS_LENGTH
    );

    return new BugReportDetails(sanitizedValue);
  }

  public toString(): string {
    return this.value;
  }
}
