import { useEffect, useState } from "react";

/** True once a service worker controls the page, which is when the app and the gym list work without a connection. */
export function useOfflineReady(): boolean {
  const [ready, setReady] = useState(() => typeof navigator !== "undefined" && Boolean(navigator.serviceWorker?.controller));

  useEffect(() => {
    const worker = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
    if (!worker) return;
    const update = () => setReady(Boolean(worker.controller));
    update();
    worker.addEventListener("controllerchange", update);
    return () => worker.removeEventListener("controllerchange", update);
  }, []);

  return ready;
}
