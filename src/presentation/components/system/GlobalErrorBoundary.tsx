import { Component, type ErrorInfo, type ReactNode } from "react";

import { DEFAULT_ERROR_MESSAGE } from "@/shared/constants/app.constants";

interface GlobalErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
  readonly onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
}

const INITIAL_STATE: GlobalErrorBoundaryState = {
  hasError: false
};

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  public override state: GlobalErrorBoundaryState = INITIAL_STATE;

  public static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return {
      hasError: true
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      return (
        <div className="system-message system-message--error" role="alert">
          {DEFAULT_ERROR_MESSAGE}
        </div>
      );
    }

    return this.props.children;
  }
}
