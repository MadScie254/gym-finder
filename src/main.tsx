import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { registerServiceWorker } from "./app/pwa";
import { applyTheme, loadTheme } from "./lib/storage";
import "./ui/tokens.css";
import "./ui/base.css";
import "./styles.css";

// Before the first render, so the page never shows the wrong appearance and every component reads the same choice.
applyTheme(loadTheme(), false);
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
