import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type JSX
} from "react";
import { Link } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/supabase/database.types";
import { createSupabaseClient } from "@/infrastructure/supabase/create-supabase-client";
import { SUPABASE_TABLES } from "@/infrastructure/supabase/supabase-table-names";
import { useLanguage } from "@/presentation/app/LanguageContext";
import { useSound } from "@/presentation/app/SoundContext";
import { localizeRouteName } from "@/presentation/i18n/localize-route";
import { ROUTES } from "@/shared/config/routes";

interface AdminUserLookupRow {
  readonly id: string;
  readonly email: string;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

interface RouteListRow {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly is_active: boolean;
}

interface RouteLocationListRow {
  readonly route_id: string;
  readonly location_id: string;
  readonly sequence_index: number;
}

interface LocationEditorSourceRow {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly question_prompt: string;
  readonly question_prompt_hu: string | null;
  readonly instruction_brief: string | null;
  readonly instruction_brief_hu: string | null;
  readonly instruction_full: string | null;
  readonly instruction_full_hu: string | null;
  readonly expected_answer: string;
  readonly expected_answers: string[] | null;
}

interface RouteStationEditorSourceRow {
  readonly id: string;
  readonly route_id: string;
  readonly location_id: string;
  readonly question_prompt: string | null;
  readonly question_prompt_hu: string | null;
  readonly instruction_brief: string | null;
  readonly instruction_brief_hu: string | null;
  readonly instruction_full: string | null;
  readonly instruction_full_hu: string | null;
  readonly expected_answer: string | null;
  readonly expected_answers: string[] | null;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

type StationFieldKey =
  | "questionPrompt"
  | "questionPromptHu"
  | "instructionBrief"
  | "instructionBriefHu"
  | "instructionFull"
  | "instructionFullHu"
  | "expectedAnswer"
  | "expectedAnswersText";

interface RouteOption {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly isActive: boolean;
}

interface EditableStationRow {
  readonly locationId: string;
  readonly sequenceIndex: number;
  readonly locationName: string;
  readonly locationSlug: string;
  readonly questionPrompt: string;
  readonly questionPromptHu: string;
  readonly instructionBrief: string;
  readonly instructionBriefHu: string;
  readonly instructionFull: string;
  readonly instructionFullHu: string;
  readonly expectedAnswer: string;
  readonly expectedAnswersText: string;
}

function normalizeOptionalText(value: string): string | null {
  const normalizedValue: string = value.trim();
  return normalizedValue.length === 0 ? null : normalizedValue;
}

function normalizeExpectedAnswers(value: string): string[] | null {
  const tokens = value
    .split(",")
    .map((token: string): string => token.trim())
    .filter((token: string): boolean => token.length > 0);

  if (tokens.length === 0) {
    return null;
  }

  return Array.from(new Set(tokens));
}

function routeLabel(route: RouteOption, localizedName: string): string {
  return route.isActive ? localizedName : `${localizedName} (inactive)`;
}

function AdminPage(): JSX.Element {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const { t } = useLanguage();
  const { play } = useSound();

  const [magicEmail, setMagicEmail] = useState<string>("");
  const [isSendingMagicLink, setIsSendingMagicLink] = useState<boolean>(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminCheckLoading, setIsAdminCheckLoading] = useState<boolean>(false);

  const [routes, setRoutes] = useState<readonly RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [isRoutesLoading, setIsRoutesLoading] = useState<boolean>(false);
  const [isStationsLoading, setIsStationsLoading] = useState<boolean>(false);
  const [stations, setStations] = useState<readonly EditableStationRow[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savingLocationId, setSavingLocationId] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadSession = async (): Promise<void> => {
      const { data, error } = await supabase.auth.getSession();
      if (isCancelled) {
        return;
      }

      if (error !== null) {
        setAuthError(error.message);
      } else {
        setSession(data.session);
      }

      setIsAuthLoading(false);
    };

    void loadSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession): void => {
      setSession(nextSession);
    });

    return (): void => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  useEffect(() => {
    let isCancelled = false;

    const verifyAdminAccess = async (): Promise<void> => {
      if (session?.user.email === undefined) {
        setIsAdmin(false);
        setRoutes([]);
        setStations([]);
        setSelectedRouteId("");
        return;
      }

      setIsAdminCheckLoading(true);
      setAuthError(null);

      const normalizedEmail: string = session.user.email.trim().toLowerCase();
      const { data, error } = await supabase
        .from(SUPABASE_TABLES.adminUsers)
        .select("id, email, is_active, created_at, updated_at")
        .eq("email", normalizedEmail)
        .eq("is_active", true)
        .maybeSingle();

      if (isCancelled) {
        return;
      }

      if (error !== null) {
        setIsAdmin(false);
        setAuthError(error.message);
      } else {
        const adminRow: AdminUserLookupRow | null = data as AdminUserLookupRow | null;
        setIsAdmin(adminRow !== null);
      }

      setIsAdminCheckLoading(false);
    };

    void verifyAdminAccess();

    return (): void => {
      isCancelled = true;
    };
  }, [session?.user.email, supabase]);

  useEffect(() => {
    let isCancelled = false;

    const loadRoutes = async (): Promise<void> => {
      if (!isAdmin) {
        return;
      }

      setIsRoutesLoading(true);
      setSaveError(null);
      setSaveMessage(null);

      const { data, error } = await supabase
        .from(SUPABASE_TABLES.routes)
        .select("id, slug, name, is_active")
        .order("slug", { ascending: true });

      if (isCancelled) {
        return;
      }

      if (error !== null) {
        setSaveError(error.message);
        setIsRoutesLoading(false);
        return;
      }

      const nextRoutes: readonly RouteOption[] = (data as readonly RouteListRow[]).map(
        (route: RouteListRow) => ({
        id: route.id,
        slug: route.slug,
        name: route.name,
        isActive: route.is_active
        })
      );

      setRoutes(nextRoutes);
      setSelectedRouteId((previousRouteId: string): string => {
        if (previousRouteId.length > 0 && nextRoutes.some((route) => route.id === previousRouteId)) {
          return previousRouteId;
        }

        return nextRoutes[0]?.id ?? "";
      });
      setIsRoutesLoading(false);
    };

    void loadRoutes();

    return (): void => {
      isCancelled = true;
    };
  }, [isAdmin, supabase]);

  useEffect(() => {
    let isCancelled = false;

    const loadStations = async (): Promise<void> => {
      if (!isAdmin || selectedRouteId.length === 0) {
        setStations([]);
        return;
      }

      setIsStationsLoading(true);
      setSaveError(null);
      setSaveMessage(null);

      const { data: routeLocations, error: routeLocationsError } = await supabase
        .from(SUPABASE_TABLES.routeLocations)
        .select("route_id, location_id, sequence_index")
        .eq("route_id", selectedRouteId)
        .order("sequence_index", { ascending: true });

      if (isCancelled) {
        return;
      }

      if (routeLocationsError !== null) {
        setSaveError(routeLocationsError.message);
        setIsStationsLoading(false);
        return;
      }

      const rows: readonly RouteLocationListRow[] =
        routeLocations as readonly RouteLocationListRow[];
      if (rows.length === 0) {
        setStations([]);
        setIsStationsLoading(false);
        return;
      }

      const locationIds: readonly string[] = rows.map((row) => row.location_id);

      const [{ data: locationsData, error: locationsError }, { data: stationData, error: stationError }] =
        await Promise.all([
          supabase
            .from(SUPABASE_TABLES.locations)
            .select(
              "id, slug, name, question_prompt, question_prompt_hu, instruction_brief, instruction_brief_hu, instruction_full, instruction_full_hu, expected_answer, expected_answers"
            )
            .in("id", [...locationIds]),
          supabase
            .from(SUPABASE_TABLES.routeStations)
            .select(
              "route_id, location_id, question_prompt, question_prompt_hu, instruction_brief, instruction_brief_hu, instruction_full, instruction_full_hu, expected_answer, expected_answers, is_active, created_at, updated_at, id"
            )
            .eq("route_id", selectedRouteId)
            .in("location_id", [...locationIds])
        ]);

      if (locationsError !== null) {
        setSaveError(locationsError.message);
        setIsStationsLoading(false);
        return;
      }

      if (stationError !== null) {
        setSaveError(stationError.message);
        setIsStationsLoading(false);
        return;
      }

      const locationsById = new Map<string, LocationEditorSourceRow>(
        (locationsData as readonly LocationEditorSourceRow[]).map(
          (locationRow: LocationEditorSourceRow) => [
          locationRow.id,
          locationRow
          ]
        )
      );
      const stationsByLocationId = new Map<string, RouteStationEditorSourceRow>(
        (stationData as readonly RouteStationEditorSourceRow[]).map(
          (stationRow: RouteStationEditorSourceRow): readonly [string, RouteStationEditorSourceRow] => [
            stationRow.location_id,
            stationRow
          ]
        )
      );

      const editorRows: readonly EditableStationRow[] = rows
        .map((routeLocationRow: RouteLocationListRow): EditableStationRow | null => {
          const locationRow: LocationEditorSourceRow | undefined = locationsById.get(
            routeLocationRow.location_id
          );
          if (locationRow === undefined) {
            return null;
          }

          const stationRow: RouteStationEditorSourceRow | undefined =
            stationsByLocationId.get(
            routeLocationRow.location_id
            );
          const fallbackExpectedAnswers: readonly string[] =
            locationRow.expected_answers === null || locationRow.expected_answers.length === 0
              ? [locationRow.expected_answer]
              : locationRow.expected_answers;

          return {
            locationId: locationRow.id,
            sequenceIndex: routeLocationRow.sequence_index,
            locationName: locationRow.name,
            locationSlug: locationRow.slug,
            questionPrompt: stationRow?.question_prompt ?? locationRow.question_prompt,
            questionPromptHu:
              stationRow?.question_prompt_hu ?? (locationRow.question_prompt_hu ?? ""),
            instructionBrief:
              stationRow?.instruction_brief ?? (locationRow.instruction_brief ?? ""),
            instructionBriefHu:
              stationRow?.instruction_brief_hu ?? (locationRow.instruction_brief_hu ?? ""),
            instructionFull: stationRow?.instruction_full ?? (locationRow.instruction_full ?? ""),
            instructionFullHu:
              stationRow?.instruction_full_hu ?? (locationRow.instruction_full_hu ?? ""),
            expectedAnswer: stationRow?.expected_answer ?? locationRow.expected_answer,
            expectedAnswersText: (
              stationRow?.expected_answers === null ||
              stationRow?.expected_answers === undefined ||
              stationRow.expected_answers.length === 0
                ? fallbackExpectedAnswers
                : stationRow.expected_answers
            ).join(", ")
          };
        })
        .filter((row: EditableStationRow | null): row is EditableStationRow => row !== null);

      setStations(editorRows);
      setIsStationsLoading(false);
    };

    void loadStations();

    return (): void => {
      isCancelled = true;
    };
  }, [isAdmin, selectedRouteId, supabase]);

  const handleSendMagicLink = useCallback(async (): Promise<void> => {
    const normalizedEmail: string = magicEmail.trim().toLowerCase();
    if (normalizedEmail.length === 0) {
      setAuthError(t("admin.emailRequired"));
      return;
    }

    setIsSendingMagicLink(true);
    setAuthError(null);
    setAuthMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}${ROUTES.admin}`
      }
    });

    if (error !== null) {
      setAuthError(error.message);
      setIsSendingMagicLink(false);
      return;
    }

    setAuthMessage(t("admin.magicLinkSent"));
    setIsSendingMagicLink(false);
    play("success");
  }, [magicEmail, play, supabase.auth, t]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setRoutes([]);
    setStations([]);
    setSelectedRouteId("");
    setSaveError(null);
    setSaveMessage(null);
    play("tap");
  }, [play, supabase.auth]);

  const updateStationField = useCallback(
    (locationId: string, field: StationFieldKey, value: string): void => {
      setStations((previousRows: readonly EditableStationRow[]): readonly EditableStationRow[] =>
        previousRows.map((row: EditableStationRow): EditableStationRow =>
          row.locationId === locationId ? { ...row, [field]: value } : row
        )
      );
      setSaveMessage(null);
      setSaveError(null);
    },
    []
  );

  const handleSaveStation = useCallback(
    async (row: EditableStationRow): Promise<void> => {
      if (selectedRouteId.length === 0) {
        return;
      }

      setSavingLocationId(row.locationId);
      setSaveError(null);
      setSaveMessage(null);

      const payload: Database["public"]["Tables"]["route_stations"]["Insert"] = {
        route_id: selectedRouteId,
        location_id: row.locationId,
        question_prompt: normalizeOptionalText(row.questionPrompt),
        question_prompt_hu: normalizeOptionalText(row.questionPromptHu),
        instruction_brief: normalizeOptionalText(row.instructionBrief),
        instruction_brief_hu: normalizeOptionalText(row.instructionBriefHu),
        instruction_full: normalizeOptionalText(row.instructionFull),
        instruction_full_hu: normalizeOptionalText(row.instructionFullHu),
        expected_answer: normalizeOptionalText(row.expectedAnswer),
        expected_answers: normalizeExpectedAnswers(row.expectedAnswersText),
        is_active: true
      };

      const { error } = await supabase
        .from(SUPABASE_TABLES.routeStations)
        .upsert(payload, {
          onConflict: "route_id,location_id"
        });

      if (error !== null) {
        setSaveError(error.message);
        setSavingLocationId(null);
        play("error");
        return;
      }

      setSaveMessage(
        t("admin.stationSaved", {
          station: `${String(row.sequenceIndex)}. ${row.locationName}`
        })
      );
      setSavingLocationId(null);
      play("success");
    },
    [play, selectedRouteId, supabase, t]
  );

  if (isAuthLoading) {
    return (
      <main className="quest-shell">
        <section className="quest-panel">
          <p className="quest-muted">{t("admin.loadingSession")}</p>
        </section>
      </main>
    );
  }

  if (session === null) {
    return (
      <main className="quest-shell">
        <section className="quest-panel">
          <h1 className="quest-panel-title">{t("admin.title")}</h1>
          <p className="quest-copy">{t("admin.loginHint")}</p>
          <label className="quest-field">
            <span className="quest-field-label">{t("admin.emailLabel")}</span>
            <input
              className="quest-input"
              type="email"
              value={magicEmail}
              onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                setMagicEmail(event.target.value);
              }}
              autoComplete="email"
            />
          </label>
          <div className="quest-actions">
            <button
              className="quest-button"
              type="button"
              disabled={isSendingMagicLink}
              onClick={(): void => {
                play("tap");
                void handleSendMagicLink();
              }}
            >
              {isSendingMagicLink ? t("admin.sendingMagicLink") : t("admin.sendMagicLink")}
            </button>
            <Link className="app-link" to={ROUTES.home}>
              {t("admin.backHome")}
            </Link>
          </div>
          {authMessage !== null ? <p className="quest-feedback">{authMessage}</p> : null}
          {authError !== null ? <p className="quest-error">{authError}</p> : null}
        </section>
      </main>
    );
  }

  if (isAdminCheckLoading) {
    return (
      <main className="quest-shell">
        <section className="quest-panel">
          <h1 className="quest-panel-title">{t("admin.title")}</h1>
          <p className="quest-muted">{t("admin.verifyingAccess")}</p>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="quest-shell">
        <section className="quest-panel">
          <h1 className="quest-panel-title">{t("admin.title")}</h1>
          <p className="quest-error">{t("admin.notAuthorized")}</p>
          <p className="quest-copy">{t("admin.notAuthorizedHint")}</p>
          <div className="quest-actions">
            <button
              className="quest-button quest-button--ghost"
              type="button"
              onClick={(): void => {
                void handleSignOut();
              }}
            >
              {t("admin.signOut")}
            </button>
            <Link className="app-link" to={ROUTES.home}>
              {t("admin.backHome")}
            </Link>
          </div>
          {authError !== null ? <p className="quest-error">{authError}</p> : null}
        </section>
      </main>
    );
  }

  const selectedRoute: RouteOption | undefined = routes.find(
    (route: RouteOption): boolean => route.id === selectedRouteId
  );

  return (
    <main className="quest-shell">
      <section className="quest-panel">
        <div className="quest-panel-header">
          <h1 className="quest-panel-title">{t("admin.title")}</h1>
          <button
            className="quest-button quest-button--ghost"
            type="button"
            onClick={(): void => {
              void handleSignOut();
            }}
          >
            {t("admin.signOut")}
          </button>
        </div>
        <p className="quest-copy">{t("admin.subtitle")}</p>
        <label className="quest-field">
          <span className="quest-field-label">{t("admin.routeLabel")}</span>
          <select
            className="quest-input"
            value={selectedRouteId}
            onChange={(event: ChangeEvent<HTMLSelectElement>): void => {
              setSelectedRouteId(event.target.value);
            }}
          >
            {routes.map((route: RouteOption): JSX.Element => (
              <option key={route.id} value={route.id}>
                {routeLabel(route, localizeRouteName(route.slug, route.name, t))}
              </option>
            ))}
          </select>
        </label>
        {isRoutesLoading ? <p className="quest-muted">{t("admin.loadingRoutes")}</p> : null}
        {selectedRoute !== undefined ? (
          <p className="quest-muted">
            {t("admin.selectedRoute")}: {localizeRouteName(selectedRoute.slug, selectedRoute.name, t)}
          </p>
        ) : null}
        {saveMessage !== null ? <p className="quest-feedback">{saveMessage}</p> : null}
        {saveError !== null ? <p className="quest-error">{saveError}</p> : null}
      </section>

      <section className="quest-panel">
        <h2 className="quest-panel-title">{t("admin.stationEditorTitle")}</h2>
        {isStationsLoading ? <p className="quest-muted">{t("admin.loadingStations")}</p> : null}
        {!isStationsLoading && stations.length === 0 ? (
          <p className="quest-muted">{t("admin.noStations")}</p>
        ) : null}

        {stations.map((station: EditableStationRow): JSX.Element => (
          <article key={station.locationId} className="admin-station-card">
            <h3 className="route-title">
              {String(station.sequenceIndex)}. {station.locationName}
            </h3>
            <p className="quest-muted">/{station.locationSlug}</p>

            <label className="quest-field">
              <span className="quest-field-label">{t("admin.field.questionPrompt")}</span>
              <input
                className="quest-input"
                value={station.questionPrompt}
                onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                  updateStationField(station.locationId, "questionPrompt", event.target.value);
                }}
              />
            </label>

            <label className="quest-field">
              <span className="quest-field-label">{t("admin.field.questionPromptHu")}</span>
              <input
                className="quest-input"
                value={station.questionPromptHu}
                onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                  updateStationField(station.locationId, "questionPromptHu", event.target.value);
                }}
              />
            </label>

            <label className="quest-field">
              <span className="quest-field-label">{t("admin.field.instructionBrief")}</span>
              <textarea
                className="bug-report-textarea"
                value={station.instructionBrief}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => {
                  updateStationField(station.locationId, "instructionBrief", event.target.value);
                }}
              />
            </label>

            <label className="quest-field">
              <span className="quest-field-label">{t("admin.field.instructionBriefHu")}</span>
              <textarea
                className="bug-report-textarea"
                value={station.instructionBriefHu}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => {
                  updateStationField(station.locationId, "instructionBriefHu", event.target.value);
                }}
              />
            </label>

            <label className="quest-field">
              <span className="quest-field-label">{t("admin.field.instructionFull")}</span>
              <textarea
                className="bug-report-textarea"
                value={station.instructionFull}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => {
                  updateStationField(station.locationId, "instructionFull", event.target.value);
                }}
              />
            </label>

            <label className="quest-field">
              <span className="quest-field-label">{t("admin.field.instructionFullHu")}</span>
              <textarea
                className="bug-report-textarea"
                value={station.instructionFullHu}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => {
                  updateStationField(station.locationId, "instructionFullHu", event.target.value);
                }}
              />
            </label>

            <label className="quest-field">
              <span className="quest-field-label">{t("admin.field.expectedAnswer")}</span>
              <input
                className="quest-input"
                value={station.expectedAnswer}
                onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                  updateStationField(station.locationId, "expectedAnswer", event.target.value);
                }}
              />
            </label>

            <label className="quest-field">
              <span className="quest-field-label">{t("admin.field.expectedAnswers")}</span>
              <input
                className="quest-input"
                value={station.expectedAnswersText}
                onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                  updateStationField(station.locationId, "expectedAnswersText", event.target.value);
                }}
              />
            </label>

            <div className="quest-actions">
              <button
                className="quest-button"
                type="button"
                disabled={savingLocationId === station.locationId}
                onClick={(): void => {
                  play("tap");
                  void handleSaveStation(station);
                }}
              >
                {savingLocationId === station.locationId
                  ? t("admin.savingStation")
                  : t("admin.saveStation")}
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default AdminPage;
