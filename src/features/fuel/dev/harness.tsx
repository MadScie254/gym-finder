// Dev-only harness: renders Fuel and Plan before the shell mounts them.
// Served by `npm run dev` at /src/features/fuel/dev/harness.html#/fuel.
// Not part of the production build (Vite only builds index.html).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router";
import "../../../ui/tokens.css";
import "../../../ui/base.css";
import "../../../styles.css";
import FuelRoutes from "../index";
import { PlanPage } from "../../plan/PlanPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <main>
        <Routes>
          <Route path="/fuel/*" element={<FuelRoutes />} />
          <Route path="/live/*" element={<FuelRoutes mode="live" />} />
          <Route path="/plan" element={<PlanPage />} />
        </Routes>
      </main>
    </HashRouter>
  </StrictMode>,
);
