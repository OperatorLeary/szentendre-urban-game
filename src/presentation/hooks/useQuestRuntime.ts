import { useContext } from "react";

import {
  QuestRuntimeContext,
  type QuestRuntimeContextValue
} from "@/presentation/app/QuestRuntimeContext";
import { assertNonNull } from "@/shared/utils/assert";

export function useQuestRuntime(): QuestRuntimeContextValue {
  const context = useContext(QuestRuntimeContext);

  assertNonNull(
    context,
    "QuestRuntimeContext is missing. Ensure QuestRuntimeProvider is mounted."
  );

  return context;
}
