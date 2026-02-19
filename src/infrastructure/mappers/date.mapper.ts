import { RepositoryError } from "@/infrastructure/errors/repository.error";

export function parseIsoDate(
  isoString: string,
  repository: string,
  fieldName: string
): Date {
  const parsed: Date = new Date(isoString);

  if (Number.isNaN(parsed.getTime())) {
    throw new RepositoryError(
      `Invalid ISO date in ${fieldName}.`,
      {
        repository,
        operation: "parseIsoDate",
        metadata: {
          fieldName,
          isoString
        }
      }
    );
  }

  return parsed;
}
