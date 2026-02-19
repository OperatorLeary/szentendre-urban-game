import type { JSX } from "react";

function RouteFallback(): JSX.Element {
  return (
    <div className="system-message" role="status" aria-live="polite">
      Loading screen...
    </div>
  );
}

export default RouteFallback;
