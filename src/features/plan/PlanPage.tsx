import { PlanProvider } from "./PlanContext";
import { TodayPage } from "./TodayPage";

/**
 * Kept for the current shell, which mounts this at the exact path /plan.
 * Once the shell mounts the default export of ./index at /plan/*, this file can go.
 */
export function PlanPage() {
  return (
    <PlanProvider>
      <TodayPage />
    </PlanProvider>
  );
}
