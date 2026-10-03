import { defineConfig } from "vite-plus";
export default defineConfig({
  fmt: {
    ignorePatterns: [
      "docs/research/**",
      "docs/specs/**",
      "public/fonts/**",
      "tests/e2e/snapshots/**",
      "pnpm-lock.yaml",
    ],
  },
  lint: {
    ignorePatterns: ["docs/**", "dist/**", ".fixture-site/**"],
    options: { typeAware: false, typeCheck: false },
  },
});
