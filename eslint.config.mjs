import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Extraction boundary for the future shared RedyRef component library:
  // src/components/ui/ must not reach into app-specific layers.
  {
    files: ["src/components/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "@/lib/supabase/*", "@/app/*"],
              message:
                "ui/ must stay app-agnostic — it is the future shared RedyRef library.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
