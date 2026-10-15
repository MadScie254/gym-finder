import { setWorkerUrl } from "maplibre-gl";
// MapLibre 6 resolves its worker at runtime with new URL("./maplibre-gl-worker.mjs", import.meta.url),
// which Vite cannot see, so the worker was never emitted and no tiles ever loaded. Bundle it explicitly.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);
