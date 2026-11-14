import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Venue } from "../../data/types";
import type { IssueKind } from "../../lib/backend";

type ReportValue = {
  /** Open the report flow. `venue` is null when adding a missing gym. */
  open: (kind: IssueKind, venue: Venue | null) => void;
};

const ReportContext = createContext<ReportValue | null>(null);
const ReportDialog = lazy(() => import("./ReportDialog"));

type OpenState = { kind: IssueKind; venue: Venue | null; key: number } | null;

/** One report flow for the whole app: problems, missing gyms and claims (plan G7). */
export function ReportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpenState>(null);
  const open = useCallback((kind: IssueKind, venue: Venue | null) => setState({ kind, venue, key: Date.now() }), []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <ReportContext.Provider value={value}>
      {children}
      {state && (
        <Suspense fallback={null}>
          <ReportDialog key={state.key} initialKind={state.kind} venue={state.venue} onClose={() => setState(null)} />
        </Suspense>
      )}
    </ReportContext.Provider>
  );
}

export function useReport(): ReportValue {
  const value = useContext(ReportContext);
  if (!value) throw new Error("useReport outside ReportProvider");
  return value;
}
