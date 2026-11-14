import { Link } from "react-router";
import type { MealDay, PlanSettings } from "../../lib/planner";
import type { Guidance } from "./recommend";
import { useFuelCopy } from "./strings";
import styles from "./GuidanceCard.module.css";

const STEPS = ["later", "before", "after"] as const;

/** The one bold element on Fuel home: an iron-plate panel with today's plain guidance. */
export function GuidanceCard({ guidance, settings, today }: { guidance: Guidance; settings: PlanSettings; today: MealDay | undefined }) {
  const copy = useFuelCopy();
  const { phase, session, sessionTime } = guidance;
  const vegetarian = settings.diet === "vegetarian";
  return (
    <section className={styles.plate} aria-labelledby="fuel-guidance-title">
      <h2 id="fuel-guidance-title" className={styles.title}>{copy.phaseTitle(phase, sessionTime, session?.title ?? null)}</h2>
      {session && (
        <p className={styles.session}>{session.title}, {session.duration}</p>
      )}
      {session && (
        <ol className={styles.track} aria-label={copy.phaseTitle(phase, sessionTime, session.title)}>
          {STEPS.map((step) => (
            <li key={step} className={styles.step} aria-current={step === phase ? "step" : undefined}>
              {step === "later" ? copy.trackLater : step === "before" ? copy.trackBefore : copy.trackAfter}
            </li>
          ))}
        </ol>
      )}
      <p className={styles.body}>{copy.phaseBody(phase, vegetarian)}</p>
      <p className={styles.body}>{copy.plate[settings.goal]} {copy.water}</p>
      {today && (
        <div className={styles.today}>
          <h3 className={styles.todayTitle}>{copy.todayMeals}</h3>
          <dl className={styles.meals}>
            {(["breakfast", "lunch", "dinner", "snack"] as const).map((meal) => (
              <div key={meal} className={styles.meal}>
                <dt>{copy.meals[meal]}</dt>
                <dd>{today[meal]}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <p className={styles.fine}>
        {copy.mealIdeas} <Link to="/plan?view=meals" className={styles.link}>{copy.changePlan}</Link>
      </p>
    </section>
  );
}
