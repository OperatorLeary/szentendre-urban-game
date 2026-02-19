export interface ProgressMetrics {
  readonly totalSteps: number;
  readonly completedSteps: number;
  readonly remainingSteps: number;
  readonly completionRatio: number;
  readonly completionPercentage: number;
  readonly isCompleted: boolean;
}
