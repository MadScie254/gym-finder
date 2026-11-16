import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft, ShoppingBasket } from "lucide-react";
import { Banner } from "../../ui";
import { basketCount, useFuelState } from "./fuelStore";
import { useFuelCopy } from "./strings";
import styles from "./Fuel.module.css";

export type FuelScreenProps = {
  title: string;
  /**
   * Required on purpose. "simulated" screens always carry the demo banner
   * (docs/REVAMP_PLAN.md 2.1); only screens with no demo data may say "real".
   */
  content: "simulated" | "real";
  /** Show a link back: true for the demo stores home, "week" for My week's meals. */
  back?: boolean | "week";
  /** Small text under the title. */
  intro?: ReactNode;
  /** Replaces the plain title, for screens whose header is their bold element. */
  header?: ReactNode;
  children: ReactNode;
};

export function FuelScreen({ title, content, back, intro, header, children }: FuelScreenProps) {
  const copy = useFuelCopy();
  const { basket } = useFuelState();
  const count = basketCount(basket);
  return (
    <div className={styles.screen} data-fuel-content={content}>
      {content === "simulated" && <Banner kind="demo">{copy.demoLine}</Banner>}
      <div className={styles.frame}>
        <div className={styles.bar}>
          {back ? (
            <Link to={back === "week" ? "/plan/meals" : "/fuel"} className={styles.back}>
              <ChevronLeft aria-hidden="true" size={20} strokeWidth={2} />
              {back === "week" ? copy.backToWeek : copy.backToFuel}
            </Link>
          ) : <span />}
          {content === "simulated" && (
            <Link to="/fuel/basket" className={styles.basketLink}>
              <ShoppingBasket aria-hidden="true" size={20} strokeWidth={2} />
              <span>{copy.basket}</span>
              <span className={styles.count} aria-hidden="true">{count}</span>
              <span className="sr-only">, {copy.basketCount(count)}</span>
            </Link>
          )}
        </div>
        {header ?? (
          <div className={styles.head}>
            <h1 className={styles.title}>{title}</h1>
            {intro && <p className={styles.intro}>{intro}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
