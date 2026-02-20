import { Location } from "@/core/entities/location.entity";
import { toLocationId } from "@/core/types/identifiers.type";
import { GeoPoint } from "@/core/value-objects/geo-point.vo";
import { QrToken } from "@/core/value-objects/qr-token.vo";
import { RepositoryError } from "@/infrastructure/errors/repository.error";
import { parseIsoDate } from "@/infrastructure/mappers/date.mapper";
import type { Tables } from "@/infrastructure/supabase/database.types";

type LocationRow = Tables["locations"]["Row"];
type RouteStationRow = Tables["route_stations"]["Row"];

export interface RouteStationContentOverrides {
  readonly questionPrompt: RouteStationRow["question_prompt"] | null;
  readonly questionPromptHu: RouteStationRow["question_prompt_hu"] | null;
  readonly instructionBrief: RouteStationRow["instruction_brief"] | null;
  readonly instructionBriefHu: RouteStationRow["instruction_brief_hu"] | null;
  readonly instructionFull: RouteStationRow["instruction_full"] | null;
  readonly instructionFullHu: RouteStationRow["instruction_full_hu"] | null;
  readonly expectedAnswer: RouteStationRow["expected_answer"] | null;
  readonly expectedAnswers: RouteStationRow["expected_answers"] | null;
}

export function toLocationEntity(
  row: LocationRow,
  sequenceIndex: number,
  overrides?: RouteStationContentOverrides
): Location {
  try {
    const questionPrompt: string = overrides?.questionPrompt ?? row.question_prompt;
    const questionPromptHu: string | null =
      overrides?.questionPromptHu ?? row.question_prompt_hu;
    const instructionBrief: string | null =
      overrides?.instructionBrief ?? row.instruction_brief;
    const instructionBriefHu: string | null =
      overrides?.instructionBriefHu ?? row.instruction_brief_hu;
    const instructionFull: string | null =
      overrides?.instructionFull ?? row.instruction_full;
    const instructionFullHu: string | null =
      overrides?.instructionFullHu ?? row.instruction_full_hu;
    const expectedAnswer: string = overrides?.expectedAnswer ?? row.expected_answer;
    const expectedAnswersCandidate: readonly string[] | null =
      overrides?.expectedAnswers ?? row.expected_answers;
    const expectedAnswers: readonly string[] =
      expectedAnswersCandidate === null || expectedAnswersCandidate.length === 0
        ? [expectedAnswer]
        : expectedAnswersCandidate;

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
      questionPrompt,
      questionPromptHu,
      instructionBrief,
      instructionBriefHu,
      instructionFull,
      instructionFullHu,
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
