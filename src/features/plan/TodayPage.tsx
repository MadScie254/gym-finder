import { useState } from "react";
import { Link } from "react-router";
import { CalendarClock, ExternalLink, Pause, Play, RotateCcw } from "lucide-react";
import { Button, Dialog, EmptyState, buttonClassName } from "../../ui";
import { MyWeekScreen } from "./MyWeekScreen";
import { usePlan } from "./PlanContext";
import { SessionCard } from "./SessionCard";
import { focusFor, freeDays, type DaySession } from "./schedule";
import { usePlanCopy } from "./strings";
import styles from "./Plan.module.css";

export function SafetyNotes() {
  const { copy } = usePlanCopy();
  return (
    <div className={styles.section}>
      <p className={styles.note}>{copy.walk}</p>
      <p className={styles.body}>{copy.stop}</p>
      <a className={styles.external} href="https://www.who.int/news-room/fact-sheets/detail/physical-activity" target="_blank" rel="noopener noreferrer">
        <ExternalLink aria-hidden="true" size={16} />{copy.whoActivity}<span className="sr-only"> {copy.newTab}</span>
      </a>
    </div>
  );
}

function MoveDialog({ session, open, onClose }: { session: DaySession; open: boolean; onClose: () => void }) {
  const { copy } = usePlanCopy();
  const plan = usePlan();
  const week = plan.weeks.find((w) => w.sessions.some((s) => s.id === session.id)) ?? plan.weeks[0];
  const days = freeDays(week, plan.moves, session.id).filter((day) => day !== session.effectiveDay);
  return (
    <Dialog title={copy.move} description={copy.noStreaks} open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <div className={styles.actions}>
        {days.map((day) => (
          <Button key={day} variant="secondary" onClick={() => { plan.moveSession(session.id, day === session.day ? null : day); onClose(); }}>
            {day === session.day ? copy.moveBack(copy.weekday[day]) : `${copy.moveTo} ${copy.weekday[day]}`}
          </Button>
        ))}
      </div>
    </Dialog>
  );
}

export function TodayPage({ now: fixedNow }: { now?: Date }) {
  const { copy } = usePlanCopy();
  const plan = usePlan();
  const [now] = useState(() => fixedNow ?? new Date());
  const [moving, setMoving] = useState(false);
  const focus = focusFor(plan.weeks, plan.done, plan.moves, now);
  const session = focus.session;

  let main;
  if (plan.paused) {
    main = (
      <EmptyState title={copy.pausedTitle} icon={Pause} action={<Button variant="primary" icon={Play} onClick={() => plan.setPaused(false)}>{copy.resume}</Button>}>
        <p>{copy.pausedBody}</p>
      </EmptyState>
    );
  } else if (!session) {
    main = (
      <EmptyState title={copy.allDoneTitle} icon={CalendarClock} action={<Button variant="primary" icon={RotateCcw} onClick={plan.resetProgress}>{copy.restart}</Button>}>
        <p>{copy.allDoneBody}</p>
      </EmptyState>
    );
  } else {
    main = (
      <>
        <SessionCard key={session.id} focus={{ ...focus, session }} />
        <div className={styles.actions} data-print="hide">
          <Button variant="secondary" icon={CalendarClock} onClick={() => setMoving(true)}>{copy.move}</Button>
          <Button variant="quiet" icon={Pause} onClick={() => plan.setPaused(true)}>{copy.pause}</Button>
        </div>
        <p className={styles.note}>{copy.noStreaks}</p>
        <MoveDialog session={session} open={moving} onClose={() => setMoving(false)} />
      </>
    );
  }

  return (
    <MyWeekScreen>
      <div className={styles.grid}>
        <div className={styles.column}>
          {!plan.customised && (
            <div className={styles.starter}>
              <h2 className={styles.starterTitle}>{copy.starterTitle}</h2>
              <p className={styles.note}>{copy.starterBody}</p>
              <Link to="/plan/setup" className={buttonClassName("secondary")}>{copy.setUp}</Link>
            </div>
          )}
          {main}
        </div>
        <div className={styles.column}>
          {!plan.paused && focus.upcoming.length > 0 && (
            <section className={styles.section} aria-labelledby="today-upcoming">
              <h2 id="today-upcoming" className={styles.sectionTitle}>{copy.laterThisWeek}</h2>
              <ul className={`${styles.panel} ${styles.rows}`} role="list">
                {focus.upcoming.map((item) => (
                  <li key={item.id} className={styles.row}>
                    <span className={styles.rowDay}>{copy.weekday[item.effectiveDay]}</span>
                    <span className={styles.rowName}>{item.title}</span>
                    <span className={styles.rowMeta}>{item.duration}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className={styles.note}>{copy.scope}</p>
          <SafetyNotes />
        </div>
      </div>
    </MyWeekScreen>
  );
}
