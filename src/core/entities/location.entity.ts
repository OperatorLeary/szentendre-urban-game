import {
  MAX_LOCATION_ANSWER_LENGTH,
  MAX_LOCATION_CODE_LENGTH,
  MAX_LOCATION_NAME_LENGTH,
  MAX_LOCATION_QUESTION_LENGTH,
  MAX_LOCATION_RADIUS_METERS,
  MIN_LOCATION_ANSWER_LENGTH,
  MIN_LOCATION_CODE_LENGTH,
  MIN_LOCATION_NAME_LENGTH,
  MIN_LOCATION_QUESTION_LENGTH,
  MIN_LOCATION_RADIUS_METERS
} from "@/core/constants/domain.constants";
import { Entity } from "@/core/entities/entity";
import { DomainError } from "@/core/errors/app-error";
import type { LocationId } from "@/core/types/identifiers.type";
import { GeoPoint } from "@/core/value-objects/geo-point.vo";
import { QrToken } from "@/core/value-objects/qr-token.vo";
import {
  assertCondition,
  assertPositiveInteger,
  assertValidDate,
  assertNumberInRange,
  normalizeNonEmptyText
} from "@/core/validation/domain-assertions";

const LOCATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface LocationProps {
  readonly id: LocationId;
  readonly slug: string;
  readonly name: string;
  readonly position: GeoPoint;
  readonly validationRadiusMeters: number;
  readonly sequenceNumber: number;
  readonly qrToken: QrToken;
  readonly questionPrompt: string;
  readonly questionPromptHu: string | null;
  readonly expectedAnswers: readonly string[];
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Location extends Entity<LocationId> {
  public readonly slug: string;
  public readonly name: string;
  public readonly position: GeoPoint;
  public readonly validationRadiusMeters: number;
  public readonly sequenceNumber: number;
  public readonly qrToken: QrToken;
  public readonly questionPrompt: string;
  public readonly questionPromptHu: string | null;
  public readonly expectedAnswers: readonly string[];
  private readonly normalizedExpectedAnswers: readonly string[];
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  public constructor(props: LocationProps) {
    super(props.id);

    const normalizedSlug: string = normalizeNonEmptyText(
      props.slug,
      "locationSlug",
      MIN_LOCATION_CODE_LENGTH,
      MAX_LOCATION_CODE_LENGTH
    ).toLowerCase();
    const normalizedName: string = normalizeNonEmptyText(
      props.name,
      "locationName",
      MIN_LOCATION_NAME_LENGTH,
      MAX_LOCATION_NAME_LENGTH
    );
    const normalizedQuestionPrompt: string = normalizeNonEmptyText(
      props.questionPrompt,
      "questionPrompt",
      MIN_LOCATION_QUESTION_LENGTH,
      MAX_LOCATION_QUESTION_LENGTH
    );
    const normalizedQuestionPromptHu: string | null =
      props.questionPromptHu === null
        ? null
        : normalizeNonEmptyText(
            props.questionPromptHu,
            "questionPromptHu",
            MIN_LOCATION_QUESTION_LENGTH,
            MAX_LOCATION_QUESTION_LENGTH
          );
    const normalizedExpectedAnswers: readonly string[] = Array.from(
      new Set(
        props.expectedAnswers.map((answer: string): string =>
          normalizeNonEmptyText(
            answer,
            "expectedAnswer",
            MIN_LOCATION_ANSWER_LENGTH,
            MAX_LOCATION_ANSWER_LENGTH
          ).toLowerCase()
        )
      )
    );

    if (!LOCATION_SLUG_PATTERN.test(normalizedSlug)) {
      throw new DomainError("locationSlug has invalid format.");
    }

    assertNumberInRange(
      props.validationRadiusMeters,
      "validationRadiusMeters",
      MIN_LOCATION_RADIUS_METERS,
      MAX_LOCATION_RADIUS_METERS
    );
    assertPositiveInteger(props.sequenceNumber, "sequenceNumber");
    assertValidDate(props.createdAt, "locationCreatedAt");
    assertValidDate(props.updatedAt, "locationUpdatedAt");
    assertCondition(
      props.updatedAt.getTime() >= props.createdAt.getTime(),
      "locationUpdatedAt cannot be before locationCreatedAt."
    );
    assertCondition(
      normalizedExpectedAnswers.length > 0,
      "expectedAnswers must contain at least one accepted answer."
    );

    this.slug = normalizedSlug;
    this.name = normalizedName;
    this.position = props.position;
    this.validationRadiusMeters = props.validationRadiusMeters;
    this.sequenceNumber = props.sequenceNumber;
    this.qrToken = props.qrToken;
    this.questionPrompt = normalizedQuestionPrompt;
    this.questionPromptHu = normalizedQuestionPromptHu;
    this.expectedAnswers = normalizedExpectedAnswers;
    this.normalizedExpectedAnswers = normalizedExpectedAnswers;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static compareBySequence(a: Location, b: Location): number {
    return a.sequenceNumber - b.sequenceNumber;
  }

  public isAnswerCorrect(answerText: string): boolean {
    let normalizedAnswer: string;
    try {
      normalizedAnswer = normalizeNonEmptyText(
        answerText,
        "answerText",
        MIN_LOCATION_ANSWER_LENGTH,
        MAX_LOCATION_ANSWER_LENGTH
      ).toLowerCase();
    } catch {
      return false;
    }

    return this.normalizedExpectedAnswers.includes(normalizedAnswer);
  }
}
