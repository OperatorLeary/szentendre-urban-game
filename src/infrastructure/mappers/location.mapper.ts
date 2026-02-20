import { Location } from "@/core/entities/location.entity";
import { toLocationId } from "@/core/types/identifiers.type";
import { GeoPoint } from "@/core/value-objects/geo-point.vo";
import { QrToken } from "@/core/value-objects/qr-token.vo";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import { parseIsoDate } from "@/infrastructure/mappers/date.mapper";
import type { Tables } from "@/infrastructure/supabase/database.types";

type LocationRow = Tables["locations"]["Row"];

export function toLocationEntity(
  row: LocationRow,
  sequenceIndex: number
): Location {
  try {
    const expectedAnswers: readonly string[] =
      row.expected_answers === null || row.expected_answers.length === 0
        ? [row.expected_answer]
        : row.expected_answers;

    return new Location({
      id: toLocationId(row.id),
      slug: row.slug,
      name: row.name,
      position: new GeoPoint({
        latitude: row.latitude,
        longitude: row.longitude
      }),
      validationRadiusMeters: row.radius_m,
      sequenceNumber: sequenceIndex,
      qrToken: QrToken.create(row.qr_code_value),
      questionPrompt: row.question_prompt,
      questionPromptHu: row.question_prompt_hu,
      instructionBrief: row.instruction_brief,
      instructionBriefHu: row.instruction_brief_hu,
      instructionFull: row.instruction_full,
      instructionFullHu: row.instruction_full_hu,
      expectedAnswers,
      isActive: row.is_active,
      createdAt: parseIsoDate(row.created_at, "LocationMapper", "locations.created_at"),
      updatedAt: parseIsoDate(row.updated_at, "LocationMapper", "locations.updated_at")
    });
  } catch (error) {
    throw new RepositoryError(
      "Failed to map location row to entity.",
      {
        repository: "LocationMapper",
        operation: "toLocationEntity",
        metadata: {
          locationId: row.id,
          sequenceIndex
        }
      },
      error
    );
  }
}
