/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type JSX,
  type ReactNode
} from "react";

export interface QuestRuntimeState {
  readonly runId: string | null;
  readonly locationId: string | null;
  readonly gpsLatitude: number | null;
  readonly gpsLongitude: number | null;
  readonly detectedDistanceMeters: number | null;
}

export interface QuestRuntimeContextValue {
  readonly state: QuestRuntimeState;
  updateState: (partialState: Partial<QuestRuntimeState>) => void;
  resetState: () => void;
}

const INITIAL_STATE: QuestRuntimeState = {
  runId: null,
  locationId: null,
  gpsLatitude: null,
  gpsLongitude: null,
  detectedDistanceMeters: null
};

interface QuestRuntimeProviderProps {
  readonly children: ReactNode;
}

export const QuestRuntimeContext = createContext<QuestRuntimeContextValue | null>(
  null
);

export function QuestRuntimeProvider({
  children
}: QuestRuntimeProviderProps): JSX.Element {
  const [state, setState] = useState<QuestRuntimeState>(INITIAL_STATE);

  const updateState = useCallback((partialState: Partial<QuestRuntimeState>): void => {
    setState((previousState: QuestRuntimeState): QuestRuntimeState => ({
      ...previousState,
      ...partialState
    }));
  }, []);

  const resetState = useCallback((): void => {
    setState(INITIAL_STATE);
  }, []);

  const value = useMemo<QuestRuntimeContextValue>(
    (): QuestRuntimeContextValue => ({
      state,
      updateState,
      resetState
    }),
    [resetState, state, updateState]
  );

  return (
    <QuestRuntimeContext.Provider value={value}>
      {children}
    </QuestRuntimeContext.Provider>
  );
}
