import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist/**",
    ".next/**",
    "node_modules/**",
    "data/**",
    "public/**",
    "coverage/**",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-unused-vars": "off",
    },
  },
]);
