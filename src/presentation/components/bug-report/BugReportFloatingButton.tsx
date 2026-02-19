import { useState, type FormEvent, type JSX } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { useBugReport } from "@/presentation/hooks/useBugReport";
import { useQuestRuntime } from "@/presentation/hooks/useQuestRuntime";

export function BugReportFloatingButton(): JSX.Element {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const { state } = useQuestRuntime();
  const bugReport = useBugReport();

  const submitBugReport = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const isSuccess: boolean = await bugReport.submitBugReport(description, state);

    if (isSuccess) {
      setDescription("");
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="bug-report-fab"
        onClick={(): void => {
          bugReport.resetStatus();
          setIsOpen((isCurrentlyOpen: boolean): boolean => !isCurrentlyOpen);
        }}
      >
        {t("bugReport.fabLabel")}
      </button>

      {isOpen ? (
        <section className="bug-report-modal" aria-modal="true" role="dialog">
          <form className="bug-report-form" onSubmit={submitBugReport}>
            <h2 className="bug-report-title">{t("bugReport.title")}</h2>
            <p className="bug-report-copy">
              {t("bugReport.copy")}
            </p>
            <textarea
              className="bug-report-textarea"
              value={description}
              onChange={(event): void => {
                setDescription(event.target.value);
              }}
              minLength={10}
              maxLength={3000}
              required
              placeholder={t("bugReport.placeholder")}
            />
            {bugReport.errorMessage !== null ? (
              <p className="bug-report-error" role="alert">
                {bugReport.errorMessage}
              </p>
            ) : null}
            <div className="bug-report-actions">
              <button
                className="quest-button quest-button--ghost"
                type="button"
                onClick={(): void => {
                  setIsOpen(false);
                }}
              >
                {t("bugReport.cancel")}
              </button>
              <button
                className="quest-button"
                type="submit"
                disabled={bugReport.isSubmitting}
              >
                {bugReport.isSubmitting ? t("bugReport.sending") : t("bugReport.submit")}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
