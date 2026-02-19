export type CheckinEligibilityReason =
  | "allowed"
  | "run_not_active"
  | "location_inactive"
  | "already_checked_in"
  | "out_of_order";

export interface AllowedCheckinEligibility {
  readonly isAllowed: true;
  readonly reason: "allowed";
}

export interface RejectedCheckinEligibility {
  readonly isAllowed: false;
  readonly reason: Exclude<CheckinEligibilityReason, "allowed">;
}

export type CheckinEligibility =
  | AllowedCheckinEligibility
  | RejectedCheckinEligibility;
