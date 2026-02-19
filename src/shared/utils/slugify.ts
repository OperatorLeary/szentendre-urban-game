const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/g;
const LEADING_OR_TRAILING_DASHES_PATTERN = /^-+|-+$/g;

export function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_PATTERN, "-")
    .replace(LEADING_OR_TRAILING_DASHES_PATTERN, "");
}
