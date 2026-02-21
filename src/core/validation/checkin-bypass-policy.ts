import {
  MAX_LOCATION_ANSWER_LENGTH,
  MIN_LOCATION_ANSWER_LENGTH
} from "@/core/constants/domain.constants";
import { normalizeNonEmptyText } from "@/core/validation/domain-assertions";

// Temporary teacher override for supervised demos/classes.
// Normalization is lower-case + trim, so `teacher-bypass` is sufficient here.
const GLOBAL_BYPASS_ANSWERS: readonly string[] = Object.freeze(["teacher-bypass"]);

export function isGlobalBypassAnswer(answerText: string): boolean {
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

  return GLOBAL_BYPASS_ANSWERS.includes(normalizedAnswer);
}

