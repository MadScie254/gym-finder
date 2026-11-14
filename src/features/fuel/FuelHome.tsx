import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, ListChecks, ReceiptText } from "lucide-react";
import { nairobiNow } from "../../lib/nairobi";
import { usePlanSnapshot } from "../plan/usePlanSnapshot";
import { DEMO_STORES } from "./data";
import { FuelScreen } from "./FuelScreen";
import { GuidanceCard } from "./GuidanceCard";
import { PickList, RealServices, StoreList } from "./HomeSections";
import { recommend, todaySession } from "./recommend";
import { useFuelCopy } from "./strings";
import { useTown } from "./useTown";
import styles from "./Fuel.module.css";
import local from "./HomeSections.module.css";

export function FuelTools() {
  const copy = useFuelCopy();
  const tools = [
    { to: "/fuel/list", icon: ListChecks, name: copy.shoppingList, hint: copy.shoppingListHint },
    { to: "/fuel/orders", icon: ReceiptText, name: copy.demoOrders, hint: copy.ordersIntro },
  ];
  return (
    <nav className={styles.panel} aria-label={copy.fuel}>
      <ul className={styles.rows} role="list">
        {tools.map(({ to, icon: Icon, name, hint }) => (
          <li key={to}>
            <Link to={to} className={local.toolLink}>
              <Icon className={local.toolIcon} aria-hidden="true" size={24} strokeWidth={2} />
              <span className={local.toolText}>
                <span className={local.toolName}>{name}</span>
                <span className={styles.rowMeta}>{hint}</span>
              </span>
              <ChevronRight className={styles.chevron} aria-hidden="true" size={20} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function FuelHome({ now: fixedNow }: { now?: Date }) {
  const copy = useFuelCopy();
  const [now] = useState(() => fixedNow ?? new Date());
  const plan = usePlanSnapshot();
  const { town, setTown, origin, locate, status } = useTown();
  const today = plan.meals.find((meal) => meal.day === nairobiNow(now).weekday);
  const result = useMemo(() => recommend({
    settings: plan.settings,
    now,
    session: todaySession(plan.weeks, plan.done, now),
    sessionTime: plan.sessionTime,
    town,
    origin,
    stores: DEMO_STORES,
  }), [plan, now, town, origin]);

  return (
    <FuelScreen title={copy.fuel} content="simulated">
      <div className={styles.homeGrid}>
        <div className={styles.column}>
          <GuidanceCard guidance={result.guidance} settings={plan.settings} today={today} />
          <FuelTools />
        </div>
        <div className={styles.column}>
          <PickList picks={result.picks} sessionTitle={result.guidance.session?.title ?? null} />
          <StoreList town={town} stores={result.stores} onTown={setTown} onLocate={locate} status={status} />
          <RealServices />
        </div>
      </div>
    </FuelScreen>
  );
}
