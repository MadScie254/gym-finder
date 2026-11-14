import { useCallback, useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPrompt | null = null;
let waiting: ServiceWorker | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function watch(registration: ServiceWorkerRegistration) {
  const check = (worker: ServiceWorker | null) => {
    // A waiting worker while another controls the page is a new version, not the first install.
    if (worker && navigator.serviceWorker.controller) { waiting = worker; notify(); }
  };
  check(registration.waiting);
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    worker?.addEventListener("statechange", () => { if (worker.state === "installed") check(worker); });
  });
}

/** Register the service worker once, in production builds only (the e2e build is one). */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPrompt;
    notify();
  });
  window.addEventListener("appinstalled", () => { deferred = null; notify(); });
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !waiting) return;
    reloading = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(watch).catch(() => undefined);
  });
}

/** Install prompt and "new version" state for the shell. */
export function usePwa() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  const install = useCallback(async () => {
    const prompt = deferred;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
    deferred = null;
    notify();
  }, []);
  const applyUpdate = useCallback(() => { waiting?.postMessage({ type: "skip-waiting" }); }, []);
  return { canInstall: deferred != null, install, updateReady: waiting != null, applyUpdate };
}
