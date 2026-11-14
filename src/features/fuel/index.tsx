import { Link, Navigate, Route, Routes } from "react-router";
import { Store } from "lucide-react";
import { EmptyState, buttonClassName } from "../../ui";
import { BasketPage } from "./BasketPage";
import { fuelMode } from "./data";
import { FuelHome, FuelTools } from "./FuelHome";
import { FuelScreen } from "./FuelScreen";
import { RealServices } from "./HomeSections";
import { ConfirmationPage, OrdersPage } from "./OrderPages";
import { StorePage } from "./StorePage";
import { useFuelCopy } from "./strings";
import styles from "./Fuel.module.css";

/** VITE_FUEL_MODE=live with no live services configured: say so plainly. */
function LiveHome() {
  const copy = useFuelCopy();
  return (
    <FuelScreen title={copy.fuel} content="real" back="week">
      <div className={styles.homeGrid}>
        <div className={styles.column}>
          <EmptyState title={copy.liveTitle} icon={Store}>
            <p>{copy.liveBody}</p>
          </EmptyState>
          <FuelTools />
        </div>
        <div className={styles.column}>
          <RealServices />
        </div>
      </div>
    </FuelScreen>
  );
}

function LiveNotHere() {
  const copy = useFuelCopy();
  return (
    <FuelScreen title={copy.liveTitle} content="real" back intro={copy.liveBody}>
      <Link to="/fuel" className={buttonClassName("primary")}>{copy.backToFuel}</Link>
    </FuelScreen>
  );
}

/** Entry point for the Fuel tab. The app shell mounts this at /fuel/*. */
export default function FuelRoutes({ mode = fuelMode() }: { mode?: "demo" | "live" }) {
  if (mode === "live") {
    return (
      <Routes>
        <Route index element={<LiveHome />} />
        <Route path="list" element={<Navigate to="/plan/shopping" replace />} />
        <Route path="*" element={<LiveNotHere />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route index element={<FuelHome />} />
      <Route path="store/:storeId" element={<StorePage />} />
      <Route path="basket" element={<BasketPage />} />
      <Route path="order/:orderId" element={<ConfirmationPage />} />
      <Route path="orders" element={<OrdersPage />} />
      <Route path="list" element={<Navigate to="/plan/shopping" replace />} />
      <Route path="*" element={<FuelHome />} />
    </Routes>
  );
}
