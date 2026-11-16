import type { PhotoId } from "../../assets/photos";
import type { PlanSession } from "../../lib/planner";

/**
 * Which illustration goes with a session. The planner names its sessions Full body A, Full body B, Steady cardio and
 * Mobility & recovery, so the picture follows the name: weights for A, the open floor for B, treadmills for cardio,
 * and the quiet mat room for mobility. These are stock photographs, not pictures of the gym the person picked.
 */
export function sessionPhoto(session: Pick<PlanSession, "title">): PhotoId {
  const title = session.title.toLowerCase();
  if (title.includes("cardio")) return "treadmills";
  if (title.includes("mobility")) return "boxing-room";
  if (title.endsWith(" b")) return "functional-floor";
  return "dumbbells";
}
