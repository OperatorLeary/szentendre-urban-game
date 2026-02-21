import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function getFocusableElements(container: HTMLElement): readonly HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element: HTMLElement): boolean => {
      if (element.hasAttribute("disabled")) {
        return false;
      }

      return element.getClientRects().length > 0;
    }
  );
}

interface UseDialogA11yInput {
  readonly isOpen: boolean;
  readonly containerRef: RefObject<HTMLElement | null>;
  readonly onRequestClose?: () => void;
}

export function useDialogA11y(input: UseDialogA11yInput): void {
  const { containerRef, isOpen, onRequestClose } = input;

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTarget = getFocusableElements(container)[0] ?? container;
    window.requestAnimationFrame((): void => {
      focusTarget.focus();
    });

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        if (onRequestClose !== undefined) {
          event.preventDefault();
          onRequestClose();
        }
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const firstElement = focusableElements[0] ?? container;
      const lastElement = focusableElements[focusableElements.length - 1] ?? container;
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (event.shiftKey) {
        if (activeElement === firstElement || !container.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (activeElement === lastElement || !container.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return (): void => {
      document.removeEventListener("keydown", handleKeyDown);

      if (
        previouslyFocusedElement !== null &&
        document.contains(previouslyFocusedElement)
      ) {
        previouslyFocusedElement.focus();
      }
    };
  }, [containerRef, isOpen, onRequestClose]);
}
