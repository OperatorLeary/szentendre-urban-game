import type {
  AbandonActiveRunResponse
} from "@/application/use-cases/abandon-active-run.use-case";
import type {
  EnsureRunSessionRequest,
  EnsureRunSessionResponse
} from "@/application/use-cases/ensure-run-session.use-case";
import type {
  GetRunProgressRequest,
  GetRunProgressResponse
} from "@/application/use-cases/get-run-progress.use-case";
import type {
  ListRoutesResponse
} from "@/application/use-cases/list-routes.use-case";
import type {
  ResolveQrEntryRouteRequest,
  ResolveQrEntryRouteResponse
} from "@/application/use-cases/resolve-qr-entry-route.use-case";
import type {
  SubmitBugReportRequest,
  SubmitBugReportResponse
} from "@/application/use-cases/submit-bug-report.use-case";
import type {
  ValidateGpsCheckinRequest,
  ValidateGpsCheckinResponse
} from "@/application/use-cases/validate-gps-checkin.use-case";
import type {
  ValidateQrCheckinRequest,
  ValidateQrCheckinResponse
} from "@/application/use-cases/validate-qr-checkin.use-case";

export interface GameUseCases {
  listRoutes(): Promise<ListRoutesResponse>;
  resolveQrEntryRoute(
    request: ResolveQrEntryRouteRequest
  ): Promise<ResolveQrEntryRouteResponse>;
  abandonActiveRun(): Promise<AbandonActiveRunResponse>;
  ensureRunSession(
    request: EnsureRunSessionRequest
  ): Promise<EnsureRunSessionResponse>;
  getRunProgress(request: GetRunProgressRequest): Promise<GetRunProgressResponse>;
  validateGpsCheckin(
    request: ValidateGpsCheckinRequest
  ): Promise<ValidateGpsCheckinResponse>;
  validateQrCheckin(
    request: ValidateQrCheckinRequest
  ): Promise<ValidateQrCheckinResponse>;
  submitBugReport(
    request: SubmitBugReportRequest
  ): Promise<SubmitBugReportResponse>;
}
