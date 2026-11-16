import { useState } from "react";
import { Link, useParams } from "react-router";
import { CircleCheck, ReceiptText } from "lucide-react";
import { Button, Dialog, EmptyState, buttonClassName } from "../../ui";
import { fuelStore, useFuelState, type DemoOrder } from "./fuelStore";
import { FuelScreen } from "./FuelScreen";
import { useFuelCopy } from "./strings";
import styles from "./Fuel.module.css";
import local from "./Orders.module.css";

/** "16 Nov 2026, 20:05" in Nairobi time. */
export function orderTime(iso: string, lang = "en-KE"): string {
  return new Intl.DateTimeFormat(lang, {
    timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(iso));
}

function OrderLines({ order }: { order: DemoOrder }) {
  const copy = useFuelCopy();
  return (
    <ul className={local.orderLines} role="list">
      {order.lines.map((line) => (
        <li key={line.itemId} className={local.orderLine}>
          <span>{line.qty} &times; {line.name}</span>
          <span className={local.numeral}>{copy.kes(line.priceKes * line.qty)}</span>
        </li>
      ))}
      <li className={local.orderTotal}>
        <span>{copy.sampleTotal}</span>
        <span className={local.numeral}>{copy.kes(order.totalKes)}</span>
      </li>
    </ul>
  );
}

export function ConfirmationPage() {
  const copy = useFuelCopy();
  const { orderId } = useParams();
  const { orders } = useFuelState();
  const order = orders.find((candidate) => candidate.id === orderId);

  if (!order) {
    return (
      <FuelScreen title={copy.orderMissing} content="simulated" back intro={copy.orderMissingBody}>
        <Link to="/fuel/orders" className={buttonClassName("primary")}>{copy.seeOrders}</Link>
      </FuelScreen>
    );
  }

  return (
    <FuelScreen
      title={copy.orderSaved}
      content="simulated"
      back
      header={(
        <div className={local.confirmHead}>
          <CircleCheck className={local.confirmMark} aria-hidden="true" size={56} strokeWidth={2.25} />
          <h1 className={local.confirmTitle}>{copy.orderSaved}</h1>
          <p className={local.confirmLine}>{copy.confirmLine}</p>
        </div>
      )}
    >
      <section className={local.receipt} aria-label={copy.fromStore(order.storeName)}>
        <p className={styles.rowName}>{order.storeName}</p>
        <p className={styles.rowMeta}>{orderTime(order.placedAt)}</p>
        <OrderLines order={order} />
        <p className={styles.fine}>{copy.samplePrices}</p>
      </section>
      <div className={`${styles.links} ${local.after}`}>
        <Link to="/fuel/orders" className={buttonClassName("primary")}>{copy.seeOrders}</Link>
        <Link to="/fuel" className={buttonClassName("secondary")}>{copy.backToFuel}</Link>
      </div>
    </FuelScreen>
  );
}

export function OrdersPage() {
  const copy = useFuelCopy();
  const { orders } = useFuelState();
  const [confirmAll, setConfirmAll] = useState(false);

  return (
    <FuelScreen title={copy.demoOrders} content="simulated" back intro={copy.ordersIntro}>
      {orders.length === 0 ? (
        <EmptyState title={copy.ordersEmpty} icon={ReceiptText} action={<Link to="/fuel" className={buttonClassName("primary")}>{copy.backToFuel}</Link>}>
          <p>{copy.ordersEmptyBody}</p>
        </EmptyState>
      ) : (
        <>
          <ul className={local.orderList} role="list">
            {orders.map((order) => (
              <li key={order.id} className={local.receipt}>
                <div className={local.orderHead}>
                  <span className={styles.rowMain}>
                    <span className={styles.rowName}>{order.storeName}</span>
                    <span className={styles.rowMeta}>{orderTime(order.placedAt)}</span>
                  </span>
                  <Button variant="quiet" onClick={() => fuelStore().deleteOrder(order.id)} aria-label={copy.deleteOrderLabel(orderTime(order.placedAt))}>
                    {copy.deleteOrder}
                  </Button>
                </div>
                <OrderLines order={order} />
              </li>
            ))}
          </ul>
          <div className={local.after}>
            <Button variant="secondary" onClick={() => setConfirmAll(true)}>{copy.deleteAll}</Button>
          </div>
        </>
      )}
      <Dialog
        title={copy.deleteAllTitle}
        description={copy.deleteAllBody}
        open={confirmAll}
        onOpenChange={setConfirmAll}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmAll(false)}>{copy.cancel}</Button>
            <Button variant="primary" onClick={() => { fuelStore().deleteAllOrders(); setConfirmAll(false); }}>{copy.deleteAllConfirm}</Button>
          </>
        )}
      >
        <span />
      </Dialog>
    </FuelScreen>
  );
}
