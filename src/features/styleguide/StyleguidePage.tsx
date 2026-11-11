import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { Button } from "../../ui/Button";
import { ControlsSection } from "./ControlsSection";
import { FeedbackSection } from "./FeedbackSection";
import { FoundationSection } from "./FoundationSection";
import { GymSection } from "./GymSection";
import { NavigationSection } from "./NavigationSection";
import styles from "./Styleguide.module.css";

type Theme = "system" | "light" | "dark";
const THEMES: Theme[] = ["system", "light", "dark"];

/** Dev-only review page: every src/ui component in every state. Not in production builds. */
export default function StyleguidePage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("theme");
  const theme: Theme = raw === "light" || raw === "dark" ? raw : "system";

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    return () => { delete root.dataset.theme; };
  }, [theme]);

  useEffect(() => { document.title = "Styleguide, Find My Gym"; }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headline}>Signwriter</h1>
        <p className={styles.lede}>
          The Find My Gym design system, after the hand-painted signs on Kenyan gyms: enamel blue,
          road-marking yellow, white block letters. Every component in every state, with real catalogue rows.
        </p>
        <div className={styles.themes} role="group" aria-label="Theme">
          {THEMES.map((item) => (
            <Button
              key={item}
              variant="secondary"
              aria-pressed={theme === item}
              onClick={() => setParams(item === "system" ? {} : { theme: item })}
            >
              {item === "system" ? "System theme" : item === "light" ? "Light" : "Dark"}
            </Button>
          ))}
        </div>
      </header>
      <main className={styles.main}>
        <FoundationSection />
        <ControlsSection />
        <GymSection />
        <FeedbackSection />
        <NavigationSection />
      </main>
    </div>
  );
}
