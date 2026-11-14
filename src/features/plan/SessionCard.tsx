import { useId, useState } from "react";
import { Link } from "react-router";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { Button } from "../../ui";
import { usePlan } from "./PlanContext";
import { splitExercise } from "./exercise";
import { setCount, type DaySession, type Focus } from "./schedule";
import { usePlanCopy } from "./strings";
import styles from "./Today.module.css";

function Exercise({ session, index, text }: { session: DaySession; index: number; text: string }) {
  const { copy } = usePlanCopy();
  const plan = usePlan();
  const { move, dose } = splitExercise(text);
  const sets = setCount(text);
  const doneSets = plan.sets[session.id]?.[index] ?? 0;
  return (
    <li className={styles.exercise}>
      <span className={styles.move}>{move}</span>
      {dose && <span className={styles.dose}>{dose}</span>}
      {sets > 0 && (
        <span className={styles.sets}>
          {Array.from({ length: sets }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={styles.setButton}
              aria-pressed={doneSets >= n}
              onClick={() => plan.setSetsDone(session.id, index, doneSets >= n ? n - 1 : n)}
            >
              {doneSets >= n && <Check aria-hidden="true" size={16} strokeWidth={2.75} />}
              <span aria-hidden="true">{copy.set(n)}</span>
              <span className="sr-only">{copy.setLabel(n, move)}</span>
            </button>
          ))}
        </span>
      )}
    </li>
  );
}

/** Today's bold element: the session on an iron-plate panel. */
export function SessionCard({ focus }: { focus: Focus & { session: DaySession } }) {
  const { copy } = usePlanCopy();
  const plan = usePlan();
  const [open, setOpen] = useState(focus.when === "today");
  const listId = useId();
  const { session } = focus;
  const day = copy.weekday[session.effectiveDay];
  const lead = focus.when === "today" ? copy.today : focus.when === "later" ? copy.nextOn(day) : copy.stillOpen(day);

  return (
    <section className={styles.card} aria-labelledby={`${listId}-title`}>
      <div className={styles.plate}>
        <p className={styles.lead}>{lead}</p>
        <h2 id={`${listId}-title`} className={styles.sessionTitle}>{session.title}</h2>
        <p className={styles.meta}>{session.duration}, {copy.at(plan.sessionTime)}</p>
        <p className={styles.meta}>{copy.weekOf(focus.week.week, focus.week.theme)}</p>
        {session.moved && <p className={styles.meta}>{copy.moved(copy.weekday[session.day])}</p>}
        <p className={styles.where}>
          <MapPin aria-hidden="true" size={18} strokeWidth={2} />
          <span className="sr-only">{copy.place}: </span>
          {plan.settings.venue === "home"
            ? copy.home
            : plan.myGym ? plan.myGym.name : <Link to="/plan/week#my-gym" className={styles.plateLink}>{copy.pickGym}</Link>}
        </p>
      </div>
      <div className={styles.body}>
        <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)}>
          <ChevronDown className={styles.chevron} aria-hidden="true" size={20} />
          {open ? copy.hideExercises : copy.showExercises}
        </button>
        <ol id={listId} className={styles.exercises} hidden={!open}>
          {session.exercises.map((text, index) => <Exercise key={text} session={session} index={index} text={text} />)}
        </ol>
        <p className={styles.note}>{session.note}</p>
        <div className={styles.actions}>
          <Button variant="primary" icon={Check} onClick={() => plan.toggleDone(session.id)}>{copy.markDone}</Button>
        </div>
      </div>
    </section>
  );
}
