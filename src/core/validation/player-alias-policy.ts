import {
  MAX_PLAYER_ALIAS_LENGTH,
  MIN_PLAYER_ALIAS_LENGTH
} from "@/core/constants/domain.constants";

export type PlayerAliasValidationReason =
  | "too_short"
  | "too_long"
  | "contains_url_or_contact"
  | "contains_blocked_content";

export interface PlayerAliasValidationResult {
  readonly isValid: boolean;
  readonly normalizedAlias: string;
  readonly moderationNormalizedAlias: string;
  readonly reason: PlayerAliasValidationReason | null;
}

const URL_OR_CONTACT_PATTERN =
  /(https?:\/\/|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;

const BLOCKED_TOKENS: readonly string[] = [
  "nazi",
  "hitler",
  "heil",
  "kkk",
  "isis",
  "terror",
  "terrorist",
  "terrorista",
  "pedo",
  "pedofil",
  "drug",
  "drog",
  "fuck",
  "fck",
  "shit",
  "kurva",
  "fasz",
  "geci",
  "baszd",
  "picsa",
  "szex",
  "sex",
  "porno",
  "porn",
  "racist",
  "rasszista",
  "orban",
  "trump",
  "biden",
  "putin",
  "fidesz"
];

const BLOCKED_PHRASES: readonly string[] = [
  "mi hazank",
  "white power",
  "heil hitler"
];

function normalizeAlias(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeAliasForModeration(value: string): string {
  return normalizeAlias(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasBlockedContent(normalizedAliasForModeration: string): boolean {
  if (normalizedAliasForModeration.length === 0) {
    return false;
  }

  const compactAlias: string = normalizedAliasForModeration.replace(/[^a-z]+/g, "");
  if (
    BLOCKED_TOKENS.some((blockedToken: string): boolean =>
      compactAlias.includes(blockedToken)
    )
  ) {
    return true;
  }

  const paddedAlias = ` ${normalizedAliasForModeration} `;
  return BLOCKED_PHRASES.some((phrase: string): boolean =>
    paddedAlias.includes(` ${phrase} `) ||
    compactAlias.includes(phrase.replace(/\s+/g, ""))
  );
}

export function validatePlayerAlias(alias: string): PlayerAliasValidationResult {
  const normalizedAlias: string = normalizeAlias(alias);
  const moderationNormalizedAlias: string = normalizeAliasForModeration(alias);

  if (normalizedAlias.length < MIN_PLAYER_ALIAS_LENGTH) {
    return {
      isValid: false,
      normalizedAlias,
      moderationNormalizedAlias,
      reason: "too_short"
    };
  }

  if (normalizedAlias.length > MAX_PLAYER_ALIAS_LENGTH) {
    return {
      isValid: false,
      normalizedAlias,
      moderationNormalizedAlias,
      reason: "too_long"
    };
  }

  if (URL_OR_CONTACT_PATTERN.test(normalizedAlias)) {
    return {
      isValid: false,
      normalizedAlias,
      moderationNormalizedAlias,
      reason: "contains_url_or_contact"
    };
  }

  if (hasBlockedContent(moderationNormalizedAlias)) {
    return {
      isValid: false,
      normalizedAlias,
      moderationNormalizedAlias,
      reason: "contains_blocked_content"
    };
  }

  return {
    isValid: true,
    normalizedAlias,
    moderationNormalizedAlias,
    reason: null
  };
}
