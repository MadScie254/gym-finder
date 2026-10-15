import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  configLoader: "legacy",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@data": fileURLToPath(new URL("./data", import.meta.url)),
    },
  },
  // MapLibre's worker imports a shared ES module chunk; bundle it as an ES module worker.
  worker: { format: "es" },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
