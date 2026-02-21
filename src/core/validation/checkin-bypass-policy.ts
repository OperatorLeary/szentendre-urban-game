import {
  MAX_LOCATION_ANSWER_LENGTH,
  MIN_LOCATION_ANSWER_LENGTH
} from "@/core/constants/domain.constants";
import { normalizeNonEmptyText } from "@/core/validation/domain-assertions";

// Phase 0 hardening: no global bypass answers in production runtime.
// Keep this list empty unless a temporary, explicitly approved override is needed.
const GLOBAL_BYPASS_ANSWERS: readonly string[] = Object.freeze([]);

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

