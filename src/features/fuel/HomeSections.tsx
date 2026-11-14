import { Link } from "react-router";
import { ChevronRight, ExternalLink, LocateFixed } from "lucide-react";
import { Button } from "../../ui";
import { formatDistance } from "../../lib/format";
import { DEMO_TOWNS, REAL_SERVICES } from "./data";
import type { Pick, RankedStore } from "./recommend";
import { useFuelCopy } from "./strings";
import type { LocateStatus } from "./useTown";
import styles from "./Fuel.module.css";
import local from "./HomeSections.module.css";

export function PickList({ picks, sessionTitle }: { picks: Pick[]; sessionTitle: string | null }) {
  const copy = useFuelCopy();
  return (
    <section className={styles.section} aria-labelledby="fuel-picks">
      <h2 id="fuel-picks" className={styles.sectionTitle}>{copy.picksTitle}</h2>
      <p className={styles.note}>{copy.picksNote}</p>
      <div className={styles.panel}>
        <ul className={styles.rows} role="list">
          {picks.map(({ item, store, reason }) => (
            <li key={item.id}>
              <Link to={`/fuel/store/${store.id}?item=${item.id}`} className={styles.rowLink}>
                <span className={styles.rowMain}>
                  <span className={styles.rowName}>{item.name}</span>
                  <span className={local.reason}>{copy.reason(reason, sessionTitle)}</span>
                  <span className={styles.rowMeta}>{store.name}</span>
                </span>
                <span className={styles.price}>
                  <span className={styles.priceValue}>{copy.kes(item.priceKes)}</span>
                  <span className={styles.priceNote}>{copy.sample}</span>
                </span>
                <ChevronRight className={styles.chevron} aria-hidden="true" size={20} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

type StoreListProps = {
  town: string;
  stores: RankedStore[];
  onTown: (town: string) => void;
  onLocate: () => void;
  status: LocateStatus;
};

export function StoreList({ town, stores, onTown, onLocate, status }: StoreListProps) {
  const copy = useFuelCopy();
  return (
    <section className={styles.section} aria-labelledby="fuel-stores">
      <h2 id="fuel-stores" className={styles.sectionTitle}>{copy.storesTitle(town)}</h2>
      <div className={local.picker}>
        <label className={local.field}>
          <span className={local.label}>{copy.town}</span>
          <select className={local.select} value={town} onChange={(event) => onTown(event.target.value)}>
            {DEMO_TOWNS.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <Button variant="quiet" icon={LocateFixed} onClick={onLocate} disabled={status === "locating"}>
          {status === "locating" ? copy.locating : copy.useLocation}
        </Button>
      </div>
      <p className={styles.status} role="status">
        {status === "failed" ? copy.locationFailed : status === "found" ? copy.locationNote : ""}
      </p>
      <div className={styles.panel}>
        <ul className={styles.rows} role="list">
          {stores.map(({ store, fit, distanceKm }) => (
            <li key={store.id}>
              <Link to={`/fuel/store/${store.id}`} className={styles.rowLink}>
                <span className={styles.rowMain}>
                  <span className={local.storeName}>{store.name}</span>
                  <span className={styles.rowMeta}>{copy.kind[store.kind]}, {store.area}</span>
                  {distanceKm != null && <span className={styles.rowMeta}>{copy.away(formatDistance(distanceKm))}</span>}
                </span>
                <span className={local.fit}>{copy.fits(fit)}</span>
                <ChevronRight className={styles.chevron} aria-hidden="true" size={20} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function RealServices() {
  const copy = useFuelCopy();
  const label = { glovo: copy.openGlovo, foodplus: copy.openFoodplus } as const;
  return (
    <section className={styles.section} aria-labelledby="fuel-real">
      <h2 id="fuel-real" className={styles.sectionTitle}>{copy.realTitle}</h2>
      <p className={styles.note}>{copy.realBody}</p>
      <div className={styles.links}>
        {REAL_SERVICES.map((service) => (
          <Button key={service.id} href={service.url} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>
            {label[service.id]}<span className="sr-only"> {copy.newTab}</span>
          </Button>
        ))}
      </div>
      <p className={styles.fine}>{copy.notAffiliated}</p>
    </section>
  );
}
