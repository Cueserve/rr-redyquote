import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests are co-located as `*.test.ts` next to the module under test
    // (PROJECT-STRUCTURE.md §1). Playwright specs live in `e2e/` as `*.spec.ts`
    // and must never be picked up here — hence `.test.ts`, not a bare glob.
    include: ["src/**/*.test.ts"],

    // REMOVE THIS when the first real test lands (the pricing calc, blocked on
    // PRD §2A). While it is set, a green `npm run test` means "nothing ran",
    // not "everything passed" — and an accidentally-broken glob passes silently
    // instead of failing. It exists only so CI has a green baseline before any
    // test is written.
    passWithNoTests: true,
  },
});
