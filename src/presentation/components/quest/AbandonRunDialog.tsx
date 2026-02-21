import { useRef, type JSX, type SyntheticEvent } from "react";

import { useLanguage } from "@/presentation/app/LanguageContext";
import { useDialogA11y } from "@/presentation/hooks/useDialogA11y";

interface AbandonRunDialogProps {
  readonly isOpen: boolean;
  readonly isSubmitting: boolean;
  readonly errorMessage: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function AbandonRunDialog(props: AbandonRunDialogProps): JSX.Element | null {
  const { t } = useLanguage();
  const formRef = useRef<HTMLFormElement | null>(null);

  useDialogA11y({
    isOpen: props.isOpen,
    containerRef: formRef,
    onRequestClose: (): void => {
      if (!props.isSubmitting) {
        props.onCancel();
      }
    }
  });

  if (!props.isOpen) {
    return null;
  }

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    props.onConfirm();
  };

  return (
    <section
      className="run-abandon-modal"
      aria-modal="true"
      role="alertdialog"
      aria-labelledby="abandon-run-title"
      aria-describedby="abandon-run-copy"
      onMouseDown={(event): void => {
        if (event.target === event.currentTarget && !props.isSubmitting) {
          props.onCancel();
        }
      }}
    >
      <form className="run-abandon-form" onSubmit={handleSubmit} ref={formRef} tabIndex={-1}>
        <div className="run-abandon-header">
          <span className="run-abandon-warning-icon" aria-hidden="true">
            !
          </span>
          <h2 className="run-abandon-title" id="abandon-run-title">
            {t("quest.abandonConfirmTitle")}
          </h2>
        </div>

        <p className="run-abandon-copy" id="abandon-run-copy">
          {t("quest.abandonConfirmCopy")}
        </p>

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

