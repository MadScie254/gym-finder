import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { MapPin, Plus, ShoppingBasket } from "lucide-react";
import { Button, DemoTag, Dialog, buttonClassName } from "../../ui";
import { directionsUrl } from "../../lib/format";
import { findStore } from "./data";
import { basketCount, basketLines, fuelStore, sampleTotal, useFuelState } from "./fuelStore";
import { FuelScreen } from "./FuelScreen";
import { useFuelCopy } from "./strings";
import type { DemoItem, DemoStore } from "./types";
import styles from "./Fuel.module.css";
import local from "./StorePage.module.css";

function sections(store: DemoStore): Array<[string, DemoItem[]]> {
  const map = new Map<string, DemoItem[]>();
  for (const item of store.items) map.set(item.section, [...(map.get(item.section) ?? []), item]);
  return [...map.entries()];
}

function StoreSign({ store }: { store: DemoStore }) {
  const copy = useFuelCopy();
  return (
    <header className={local.sign}>
      <DemoTag detail="invented store with a sample menu" />
      <h1 className={local.signName}>{store.name.replace(/^Demo: /, "")}</h1>
      <p className={local.signMeta}>{copy.kind[store.kind]}, {store.area}, {store.town}</p>
    </header>
  );
}

export function StorePage() {
  const copy = useFuelCopy();
  const { storeId } = useParams();
  const [params] = useSearchParams();
  const store = findStore(storeId);
  const state = useFuelState();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<DemoItem | null>(null);
  const focusItem = params.get("item");

  useEffect(() => {
    if (focusItem) document.getElementById(`item-${focusItem}`)?.scrollIntoView({ block: "center" });
  }, [focusItem]);

  if (!store) {
    return (
      <FuelScreen title={copy.storeMissing} content="simulated" back intro={copy.storeMissingBody}>
        <Link to="/fuel" className={buttonClassName("primary")}>{copy.backToFuel}</Link>
      </FuelScreen>
    );
  }

  const basketStore = state.basket ? findStore(state.basket.storeId) : undefined;
  const count = basketCount(state.basket);

  function add(item: DemoItem) {
    if (!store) return;
    if (fuelStore().add(store, item) === "other-store") {
      setPending(item);
      return;
    }
    setMessage(copy.added(item.name, basketCount(fuelStore().getState().basket)));
  }

  function replace() {
    if (!store || !pending) return;
    fuelStore().replaceWith(store, pending);
    setMessage(copy.added(pending.name, 1));
    setPending(null);
  }

  return (
    <FuelScreen title={store.name} content="simulated" back header={<StoreSign store={store} />}>
      <div className={local.layout}>
        <aside className={local.facts}>
          <section className={styles.section} aria-labelledby="store-hours">
            <h2 id="store-hours" className={local.factTitle}>{copy.sampleHours}</h2>
            <dl className={local.hours}>
              {store.hours.map((row) => (
                <div key={row.days} className={local.hoursRow}>
                  <dt>{row.days}</dt>
                  <dd>{row.open} to {row.close}</dd>
                </div>
              ))}
            </dl>
            {store.hours[0]?.days !== "Every day" && <p className={styles.fine}>{copy.closedOther}</p>}
          </section>
          <section className={styles.section} aria-labelledby="store-where">
            <h2 id="store-where" className={local.factTitle}>{copy.whereTitle}</h2>
            <p className={styles.fine}>{copy.sampleLocation(store.area)}</p>
            <Button href={directionsUrl(store.location.lat, store.location.lng)} target="_blank" rel="noopener noreferrer" icon={MapPin}>
              {copy.openMaps}<span className="sr-only"> {copy.newTab}</span>
            </Button>
          </section>
        </aside>

        <div className={local.menu}>
          <h2 className={styles.sectionTitle}>{copy.menu}</h2>
          {sections(store).map(([name, items]) => (
            <section key={name} className={local.menuSection} aria-labelledby={`sec-${name}`}>
              <h3 id={`sec-${name}`} className={local.menuHeading}>{name}</h3>
              <ul className={local.items} role="list">
                {items.map((item) => (
                  <li key={item.id} id={`item-${item.id}`} className={local.item} data-focus={item.id === focusItem || undefined}>
                    <div className={local.itemMain}>
                      <span className={styles.rowName}>{item.name}</span>
                      <span className={styles.rowMeta}>{item.unit}</span>
                      {item.proteinG != null && (
                        <span className={styles.rowMeta}>
                          {copy.protein(item.proteinG)}{item.kcal != null ? `, ${copy.kcal(item.kcal)}` : ""}, {copy.estimate}
                        </span>
                      )}
                    </div>
                    <span className={styles.price}>
                      <span className={styles.priceValue}>{copy.kes(item.priceKes)}</span>
                      <span className={styles.priceNote}>{copy.sample}</span>
                    </span>
                    <button type="button" className={buttonClassName("secondary", false, local.add)} onClick={() => add(item)}>
                      <Plus aria-hidden="true" size={20} strokeWidth={2} />
                      <span>{copy.add}<span className="sr-only">{copy.addTail(item.name)}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <p className={local.live} role="status">{message}</p>

      {count > 0 && basketStore && (
        <div className={local.dock}>
          <Link to="/fuel/basket" className={buttonClassName("primary", true)}>
            <ShoppingBasket aria-hidden="true" size={20} strokeWidth={2} />
            <span>{copy.viewBasket}, {copy.basketCount(count)}, {copy.kes(sampleTotal(basketLines(state.basket, basketStore)))} {copy.sample}</span>
          </Link>
        </div>
      )}

      <Dialog
        title={copy.switchTitle}
        description={copy.switchBody(basketStore?.name ?? "")}
        open={pending != null}
        onOpenChange={(open) => { if (!open) setPending(null); }}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>{copy.switchCancel}</Button>
            <Button variant="primary" onClick={replace}>{copy.switchConfirm}</Button>
          </>
        )}
      >
        <span />
      </Dialog>
    </FuelScreen>
  );
}
