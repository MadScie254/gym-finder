import { fileURLToPath, URL } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "@data": fileURLToPath(new URL("./data", import.meta.url)),
    },
  },
  test: {
    // Playwright owns e2e/; Vitest would otherwise pick up its *.spec.ts files.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
