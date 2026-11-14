import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, buttonClassName } from "../../ui";
import { buildTrainingPlan, type PlanSettings } from "../../lib/planner";
import { MyWeekScreen } from "./MyWeekScreen";
import { usePlan } from "./PlanContext";
import { planKey } from "./planStore";
import { usePlanCopy } from "./strings";
import styles from "./Plan.module.css";
import local from "./Setup.module.css";

type Field<K extends keyof PlanSettings> = { key: K; options: Array<PlanSettings[K]> };

const FIELDS = [
  { key: "goal", options: ["general", "strength", "endurance"] },
  { key: "level", options: ["beginner", "intermediate"] },
  { key: "days", options: [2, 3, 4, 5] },
  { key: "venue", options: ["gym", "home"] },
  { key: "diet", options: ["omnivore", "vegetarian"] },
] as const satisfies ReadonlyArray<Field<keyof PlanSettings>>;

/** Optional. Nothing is saved until the user presses Save, and the effect on progress is said first. */
export function SetupPage() {
  const { copy } = usePlanCopy();
  const plan = usePlan();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<PlanSettings>(plan.settings);
  const preview = buildTrainingPlan(draft)[0];
  const sameShape = planKey(draft) === planKey(plan.settings);
  const dietOnly = sameShape && draft.diet !== plan.settings.diet;
  const progressNote = !sameShape ? copy.progressNoteNew : dietOnly ? copy.progressNoteDiet : copy.progressNoteSame;

  function label<K extends keyof PlanSettings>(key: K, value: PlanSettings[K]): string {
    if (key === "days") return copy.days(value as number);
    return (copy[key as "goal" | "level" | "venue" | "diet"] as Record<string, string>)[value as string];
  }

  function save() {
    plan.saveSettings(draft);
    navigate("/plan");
  }

  return (
    <MyWeekScreen title={copy.setupTitle}>
      <p className={styles.body}>{copy.setupIntro}</p>
      <div className={`${styles.grid} ${local.setup}`}>
        <form className={styles.column} onSubmit={(event) => { event.preventDefault(); save(); }}>
          {FIELDS.map((field) => (
            <fieldset key={field.key} className={local.fieldset}>
              <legend className={local.legend}>{copy.labels[field.key]}</legend>
              <div className={local.options}>
                {field.options.map((option) => (
                  <label key={String(option)} className={local.option}>
                    <input
                      type="radio"
                      name={field.key}
                      checked={draft[field.key] === option}
                      onChange={() => setDraft({ ...draft, [field.key]: option })}
                    />
                    <span>{label(field.key, option)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <p className={local.effect} role="status">{progressNote}</p>
          <div className={styles.actions}>
            <Button type="submit" variant="primary">{copy.save}</Button>
            <Link to="/plan" className={buttonClassName("secondary")}>{copy.cancel}</Link>
          </div>
        </form>
        <section className={`${styles.panel} ${styles.padded}`} aria-labelledby="setup-preview">
          <h2 id="setup-preview" className={styles.sectionTitle}>{copy.preview}</h2>
          <p className={styles.note}>{preview.theme}</p>
          <ul className={styles.rows} role="list">
            {preview.sessions.map((session) => (
              <li key={session.id} className={local.previewRow}>
                <span className={styles.rowDay}>{copy.weekday[session.day]}</span>
                <span className={styles.rowName}>{session.title}</span>
                <span className={styles.rowMeta}>{session.duration}</span>
              </li>
            ))}
          </ul>
          <p className={styles.note}>{copy.plate[draft.goal]}</p>
          <p className={styles.note}>{copy.scope}</p>
        </section>
      </div>
    </MyWeekScreen>
  );
}
