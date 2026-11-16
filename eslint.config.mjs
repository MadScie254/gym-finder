import tseslint from "typescript-eslint";

export default tseslint.config(
  // docs/design holds the approved mockup and the throwaway scripts that built it; they are reference, not app code.
  { ignores: ["dist/**", "node_modules/**", "data/**", "public/**", "scripts/**", "docs/design/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
);
