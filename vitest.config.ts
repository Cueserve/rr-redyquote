import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests are co-located as `*.test.ts` next to the module under test
    // (PROJECT-STRUCTURE.md §1). Playwright specs live in `e2e/` as `*.spec.ts`
    // and must never be picked up here — hence `.test.ts`, not a bare glob.
    include: ["src/**/*.test.ts"],
  },
});
