import { Link, useNavigate } from "react-router";
import { Minus, Plus, ShoppingBasket } from "lucide-react";
import { Button, EmptyState, IconButton, buttonClassName } from "../../ui";
import { findStore } from "./data";
import { basketLines, fuelStore, sampleTotal, useFuelState } from "./fuelStore";
import { FuelScreen } from "./FuelScreen";
import { useFuelCopy } from "./strings";
import styles from "./Fuel.module.css";
import local from "./Orders.module.css";

export function BasketPage() {
  const copy = useFuelCopy();
  const navigate = useNavigate();
  const { basket } = useFuelState();
  const store = basket ? findStore(basket.storeId) : undefined;
  const lines = basketLines(basket, store);

  if (!store || lines.length === 0) {
    return (
      <FuelScreen title={copy.basket} content="simulated" back>
        <EmptyState
          title={copy.basketEmpty}
          icon={ShoppingBasket}
          action={<Link to="/fuel" className={buttonClassName("primary")}>{copy.backToFuel}</Link>}
        >
          <p>{copy.basketEmptyBody}</p>
        </EmptyState>
      </FuelScreen>
    );
  }

  const total = sampleTotal(lines);

  function place() {
    if (!store) return;
    const order = fuelStore().placeDemoOrder(store);
    if (order) navigate(`/fuel/order/${order.id}`);
  }

  return (
    <FuelScreen title={copy.basket} content="simulated" back intro={copy.fromStore(store.name)}>
      <div className={local.split}>
        <div className={styles.panel}>
          <ul className={styles.rows} role="list">
            {lines.map(({ item, qty }) => (
              <li key={item.id} className={local.line}>
                <span className={styles.rowMain}>
                  <span className={styles.rowName}>{item.name}</span>
                  <span className={styles.rowMeta}>{item.unit}, {copy.kes(item.priceKes)} {copy.sample}</span>
                </span>
                <span className={local.stepper}>
                  <IconButton icon={Minus} label={copy.removeOne(item.name)} variant="quiet" onClick={() => fuelStore().setQty(item.id, qty - 1)} />
                  <span className={local.qty} aria-live="polite">
                    <span aria-hidden="true">{qty}</span>
                    <span className="sr-only">{copy.qty(qty)}, {item.name}</span>
                  </span>
                  <IconButton icon={Plus} label={copy.moreOne(item.name)} variant="quiet" onClick={() => fuelStore().setQty(item.id, qty + 1)} />
                </span>
                <span className={local.lineTotal}>{copy.kes(item.priceKes * qty)}</span>
              </li>
            ))}
          </ul>
        </div>

        <section className={local.summary} aria-labelledby="basket-total">
          <h2 id="basket-total" className={local.totalLabel}>{copy.sampleTotal}</h2>
          <p className={local.total}>{copy.kes(total)}</p>
          <p className={styles.fine}>{copy.samplePrices}</p>
          <Button variant="primary" wide onClick={place}>{copy.placeOrder}</Button>
          <p className={styles.fine}>{copy.placeNote}</p>
          <Button variant="quiet" onClick={() => fuelStore().clearBasket()}>{copy.emptyBasket}</Button>
        </section>
      </div>
    </FuelScreen>
  );
}
