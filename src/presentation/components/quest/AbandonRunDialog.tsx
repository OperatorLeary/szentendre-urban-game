import type { JSX, SyntheticEvent } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";

interface AbandonRunDialogProps {
  readonly isOpen: boolean;
  readonly isSubmitting: boolean;
  readonly errorMessage: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function AbandonRunDialog(props: AbandonRunDialogProps): JSX.Element | null {
  const { t } = useLanguage();

  if (!props.isOpen) {
    return null;
  }

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    props.onConfirm();
  };

  return (
    <section className="run-abandon-modal" aria-modal="true" role="dialog">
      <form className="run-abandon-form" onSubmit={handleSubmit}>
        <div className="run-abandon-header">
          <span className="run-abandon-warning-icon" aria-hidden="true">
            !
          </span>
          <h2 className="run-abandon-title">{t("quest.abandonConfirmTitle")}</h2>
        </div>

        <p className="run-abandon-copy">{t("quest.abandonConfirmCopy")}</p>

        {props.errorMessage !== null ? (
          <p className="quest-error" role="alert">
            {props.errorMessage}
          </p>
        ) : null}

        <div className="run-abandon-actions">
          <button
            className="quest-button quest-button--ghost"
            type="button"
            onClick={props.onCancel}
            disabled={props.isSubmitting}
          >
            {t("quest.abandonCancel")}
          </button>
          <button
            className="quest-button quest-button--danger"
            type="submit"
            disabled={props.isSubmitting}
          >
            {props.isSubmitting ? t("quest.abandonInProgress") : t("quest.abandonConfirm")}
          </button>
        </div>
      </form>
    </section>
  );
}

