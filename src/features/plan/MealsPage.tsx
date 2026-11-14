import { useState } from "react";
import { Link } from "react-router";
import { ExternalLink, ListChecks, Store } from "lucide-react";
import { DemoTag, buttonClassName } from "../../ui";
import { nairobiNow } from "../../lib/nairobi";
import type { PlanSettings } from "../../lib/planner";
import { MyWeekScreen } from "./MyWeekScreen";
import { usePlan } from "./PlanContext";
import { MEAL_SLOTS, mealEntry, swapKeys } from "./mealIngredients";
import { SWAPS, usePlanCopy } from "./strings";
import styles from "./Plan.module.css";
import local from "./Meals.module.css";

export function MealsPage({ now: fixedNow }: { now?: Date }) {
  const { copy, lang } = usePlanCopy();
  const plan = usePlan();
  const [now] = useState(() => fixedNow ?? new Date());
  const today = nairobiNow(now).weekday;
  const diet = plan.settings.diet;

  function setDiet(next: PlanSettings["diet"]) {
    plan.saveSettings({ ...plan.settings, diet: next });
  }

  return (
    <MyWeekScreen>
      <div className={styles.grid}>
        <div className={styles.column}>
          <fieldset className={local.diet} data-print="hide">
            <legend className={local.legend}>{copy.labels.diet}</legend>
            {(["omnivore", "vegetarian"] as const).map((value) => (
              <label key={value} className={local.dietOption}>
                <input type="radio" name="diet" checked={diet === value} onChange={() => setDiet(value)} />
                <span>{copy.diet[value]}</span>
              </label>
            ))}
          </fieldset>
          <section className={styles.section} aria-labelledby="meals-title">
            <h2 id="meals-title" className={styles.sectionTitle}>{copy.mealsTitle}</h2>
            <ol className={local.days} role="list">
              {plan.meals.map((day) => (
                <li key={day.day} className={local.day} data-today={day.day === today || undefined}>
                  <h3 className={local.dayName}>
                    {copy.weekday[day.day]}
                    {day.day === today && <span className={local.todayTag}>{copy.todayTag}</span>}
                  </h3>
                  <dl className={local.slots}>
                    {MEAL_SLOTS.map((slot) => {
                      const entry = mealEntry(diet, day.day, slot);
                      const swaps = entry ? swapKeys(entry).map((key) => SWAPS[lang][key]).filter(Boolean) : [];
                      return (
                        <div key={slot} className={local.slot}>
                          <dt>{copy.slot[slot]}</dt>
                          <dd>
                            <span>{day[slot]}</span>
                            {swaps.length > 0 && (
                              <span className={local.swaps}>{copy.swapTitle}: {swaps.join(". ")}.</span>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className={styles.column}>
          <section className={`${styles.panel} ${styles.padded}`} aria-labelledby="meals-guide">
            <h2 id="meals-guide" className={styles.sectionTitle}>{copy.goal[plan.settings.goal]}</h2>
            <p className={styles.body}>{copy.plate[plan.settings.goal]}</p>
            <p className={styles.body}>{copy.water}</p>
            <p className={styles.note}>{copy.allergy}</p>
            <a className={styles.external} href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet" target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" size={16} />{copy.whoDiet}<span className="sr-only"> {copy.newTab}</span>
            </a>
          </section>
          <section className={`${styles.panel} ${styles.padded}`} aria-labelledby="meals-shopping" data-print="hide">
            <h2 id="meals-shopping" className={styles.sectionTitle}>{copy.shoppingCard}</h2>
            <p className={styles.note}>{copy.shoppingCardBody}</p>
            <Link to="/plan/shopping" className={buttonClassName("secondary")}>
              <ListChecks aria-hidden="true" size={20} strokeWidth={2} />
              <span>{copy.openShopping}</span>
            </Link>
          </section>
          <section className={local.demo} aria-labelledby="meals-demo" data-print="hide">
            <div className={local.demoHead}>
              <h2 id="meals-demo" className={styles.sectionTitle}>{copy.foodDemoTitle}</h2>
              <DemoTag />
            </div>
            <p className={styles.body}>{copy.foodDemoBody}</p>
            <p className={styles.note}>{copy.foodDemoMore}</p>
            <Link to="/fuel" className={buttonClassName("secondary")}>
              <Store aria-hidden="true" size={20} strokeWidth={2} />
              <span>{copy.openFoodDemo}</span>
            </Link>
          </section>
        </div>
      </div>
    </MyWeekScreen>
  );
}
