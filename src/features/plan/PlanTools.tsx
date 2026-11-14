import { useState, type ChangeEvent } from "react";
import { Link } from "react-router";
import { CalendarPlus, Download, Printer, Upload } from "lucide-react";
import { Button, buttonClassName } from "../../ui";
import { downloadText } from "../../lib/ics";
import { upcomingMonday } from "../../lib/nairobi";
import { planCalendar } from "./calendar";
import { usePlan } from "./PlanContext";
import { exportBackup, importBackup, SESSION_TIMES } from "./planStore";
import { usePlanCopy } from "./strings";
import styles from "./Plan.module.css";
import local from "./Week.module.css";

/** My gym, calendar file, print and backup. */
export function PlanTools() {
  const { copy } = usePlanCopy();
  const plan = usePlan();
  const [status, setStatus] = useState("");

  function addToCalendar() {
    const ics = planCalendar(plan.weeks, { start: upcomingMonday(), time: plan.sessionTime, gymName: plan.settings.venue === "home" ? copy.home : plan.myGym?.name });
    downloadText("find-my-gym-plan.ics", ics);
  }

  function backup() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(`find-my-gym-my-week-${stamp}.json`, JSON.stringify(exportBackup(), null, 2), "application/json");
  }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const count = importBackup(await file.text());
    if (count == null) {
      setStatus(copy.restoreFailed);
      return;
    }
    plan.reload();
    setStatus(copy.restored(count));
  }

  return (
    <>
      <section id="my-gym" className={`${styles.panel} ${styles.padded}`} aria-labelledby="tools-gym" data-print="hide">
        <h2 id="tools-gym" className={styles.sectionTitle}>{copy.myGym}</h2>
        {plan.savedGyms.length ? (
          <label className={styles.field}>
            <span>{copy.myGym}</span>
            <select className={styles.select} value={plan.myGymId ?? ""} onChange={(event) => plan.setMyGymId(event.target.value || null)}>
              <option value="">{copy.noGym}</option>
              {plan.savedGyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}{gym.area ? `, ${gym.area}` : ""}</option>)}
            </select>
          </label>
        ) : (
          <>
            <p className={styles.note}>{copy.noSavedGyms}</p>
            <Link to="/search" className={buttonClassName("secondary")}>{copy.findGyms}</Link>
          </>
        )}
      </section>
      <section className={`${styles.panel} ${styles.padded}`} aria-labelledby="tools-files" data-print="hide">
        <h2 id="tools-files" className={styles.sectionTitle}>{copy.calendarTitle}</h2>
        <label className={styles.field}>
          <span>{copy.sessionTime}</span>
          <select className={styles.select} value={plan.sessionTime} onChange={(event) => plan.setSessionTime(event.target.value)}>
            {SESSION_TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
          </select>
        </label>
        <Button icon={CalendarPlus} onClick={addToCalendar}>{copy.addCalendar}</Button>
        <p className={styles.note}>{copy.calendarNote}</p>
        <div className={styles.actions}>
          <Button icon={Printer} onClick={() => window.print()}>{copy.print}</Button>
          <Button icon={Download} onClick={backup}>{copy.backup}</Button>
          <label className={`${buttonClassName("secondary")} ${local.fileButton}`}>
            <Upload aria-hidden="true" size={20} strokeWidth={2} />
            <span>{copy.restore}</span>
            <input type="file" accept="application/json,.json" className="sr-only" onChange={restore} />
          </label>
        </div>
        <p className={styles.note}>{copy.backupNote}</p>
        <p className={styles.status} role="status">{status}</p>
      </section>
    </>
  );
}
