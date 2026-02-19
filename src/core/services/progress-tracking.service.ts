import type { ProgressMetrics } from "@/core/models/progress-metrics.model";
import {
  PERCENTAGE_MULTIPLIER,
  TWO_DECIMAL_PRECISION_MULTIPLIER
} from "@/core/constants/domain.constants";
import {
  assertCondition,
  assertFiniteNumber
} from "@/core/validation/domain-assertions";

function toTwoDecimals(value: number): number {
  return (
    Math.round(value * TWO_DECIMAL_PRECISION_MULTIPLIER) /
    TWO_DECIMAL_PRECISION_MULTIPLIER
  );
}

export class ProgressTrackingService {
  public calculate(
    totalStepsInput: number,
    completedStepsInput: number
  ): ProgressMetrics {
    assertFiniteNumber(totalStepsInput, "totalSteps");
    assertFiniteNumber(completedStepsInput, "completedSteps");
    assertCondition(totalStepsInput >= 0, "totalSteps cannot be negative.");
    assertCondition(completedStepsInput >= 0, "completedSteps cannot be negative.");

    const totalSteps: number = Math.floor(totalStepsInput);
    const completedSteps: number = Math.min(
      Math.floor(completedStepsInput),
      totalSteps
    );
    const remainingSteps: number = Math.max(totalSteps - completedSteps, 0);
    const completionRatio: number =
      totalSteps === 0 ? 0 : completedSteps / totalSteps;
    const completionPercentage: number = toTwoDecimals(
      completionRatio * PERCENTAGE_MULTIPLIER
    );
    const isCompleted: boolean = totalSteps > 0 && completedSteps === totalSteps;

    return {
      totalSteps,
      completedSteps,
      remainingSteps,
      completionRatio,
      completionPercentage,
      isCompleted
    };
  }
}
