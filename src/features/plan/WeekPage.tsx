import { useState } from "react";
import { Link } from "react-router";
import { WEEKDAYS } from "../../lib/nairobi";
import { buttonClassName } from "../../ui";
import { currentWeek } from "./planStore";
import { MyWeekScreen } from "./MyWeekScreen";
import { usePlan } from "./PlanContext";
import { PlanTools } from "./PlanTools";
import { sessionsOf, totalSessions } from "./schedule";
import { usePlanCopy } from "./strings";
import { SafetyNotes } from "./TodayPage";
import styles from "./Plan.module.css";
import local from "./Week.module.css";

export function WeekPage() {
  const { copy } = usePlanCopy();
  const plan = usePlan();
  const [weekNumber, setWeekNumber] = useState(() => currentWeek(plan.weeks, plan.done).week);
  const week = plan.weeks[weekNumber - 1] ?? plan.weeks[0];
  const sessions = sessionsOf(week, plan.moves);
  const total = totalSessions(plan.weeks);
  const weekDone = week.sessions.filter((s) => plan.done.includes(s.id)).length;

  return (
    <MyWeekScreen>
      <div className={styles.grid}>
        <div className={styles.column}>
          <p className={local.progress}>
            <span className={local.progressNumber}>{plan.done.length}</span>
            <span>{copy.progress(plan.done.length, total)}</span>
          </p>
          <div className={local.weeks} role="group" aria-label={copy.weekPick} data-print="hide">
            {plan.weeks.map((item) => (
              <button key={item.week} type="button" className={local.weekButton} aria-pressed={item.week === week.week} onClick={() => setWeekNumber(item.week)}>
                {copy.weekN(item.week)}
              </button>
            ))}
          </div>
          <section className={styles.section} aria-labelledby="week-title">
            <h2 id="week-title" className={styles.sectionTitle}>{copy.weekOf(week.week, week.theme)}</h2>
            <p className={styles.note}>{weekDone} / {week.sessions.length} {copy.done.toLowerCase()}</p>
            <ul className={`${styles.panel} ${styles.rows}`} role="list">
              {WEEKDAYS.map((day) => {
                const items = sessions.filter((s) => s.effectiveDay === day);
                if (!items.length) {
                  return (
                    <li key={day} className={local.day}>
                      <span className={styles.rowDay}>{copy.weekday[day]}</span>
                      <span className={local.rest}>{copy.restDay}</span>
                    </li>
                  );
                }
                return items.map((session) => {
                  const checked = plan.done.includes(session.id);
                  const id = `done-${session.id}`;
                  return (
                    <li key={session.id} className={local.day} data-done={checked || undefined}>
                      <span className={styles.rowDay}>{copy.weekday[day]}</span>
                      <span className={local.session}>
                        <span className={styles.rowName}>{session.title}</span>
                        <span className={styles.rowMeta}>
                          {session.duration}{session.moved ? `. ${copy.moved(copy.weekday[session.day])}` : ""}
                        </span>
                      </span>
                      <span className={local.tick}>
                        <input id={id} type="checkbox" checked={checked} onChange={() => plan.toggleDone(session.id)} />
                        <label htmlFor={id}>{copy.done}<span className="sr-only">, {session.title}, {copy.weekday[day]}</span></label>
                      </span>
                    </li>
                  );
                });
              })}
            </ul>
            <p className={styles.note}>{copy.noStreaks}</p>
          </section>
        </div>
        <div className={styles.column}>
          <section className={`${styles.panel} ${styles.padded}`} aria-labelledby="week-plan">
            <h2 id="week-plan" className={styles.sectionTitle}>{copy.yourPlan}</h2>
            <dl className={local.summary}>
              <div><dt>{copy.labels.goal}</dt><dd>{copy.goal[plan.settings.goal]}</dd></div>
              <div><dt>{copy.labels.level}</dt><dd>{copy.level[plan.settings.level]}</dd></div>
              <div><dt>{copy.labels.days}</dt><dd>{copy.days(plan.settings.days)}</dd></div>
              <div><dt>{copy.labels.venue}</dt><dd>{copy.venue[plan.settings.venue]}</dd></div>
              <div><dt>{copy.labels.diet}</dt><dd>{copy.diet[plan.settings.diet]}</dd></div>
            </dl>
            <Link to="/plan/setup" className={buttonClassName("secondary")} data-print="hide">{copy.editPlan}</Link>
          </section>
          <PlanTools />
          <SafetyNotes />
        </div>
      </div>
    </MyWeekScreen>
  );
}
