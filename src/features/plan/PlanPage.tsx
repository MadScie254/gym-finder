import PlanRoutes from "./index";

/** Named export the shell mounts at /plan/*. Same as the default export of ./index. */
export function PlanPage() {
  return <PlanRoutes />;
}
