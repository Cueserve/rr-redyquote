import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Raw Tailwind palette classes (bg-zinc-50, text-black, bg-[#ad0000]) bypass the
// semantic token layer in src/app/globals.css: they don't flip in dark mode and
// they don't re-theme when a brand value changes. Components must use semantic
// tokens only -- bg-background, text-muted-foreground, bg-primary, border-border.
//
// Tier-1 brand primitives are already unusable by construction (globals.css keeps
// them out of @theme, so Tailwind emits no utility for them). This rule closes the
// other half: Tailwind's own built-in palette.
const TW_PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const TW_PROP =
  "bg|text|border|ring|fill|stroke|from|via|to|decoration|outline|shadow|caret|accent|divide|placeholder";
const RAW_COLOR_CLASS =
  `(^|[\\s:\\[])(${TW_PROP})-((${TW_PALETTE})-\\d{2,3}|black|white)([\\s/]|$)` +
  `|(^|[\\s:\\[])(${TW_PROP})-\\[#`;

const RAW_COLOR_MESSAGE =
  "Raw color class. Use a semantic token from globals.css (bg-background, " +
  "text-muted-foreground, bg-primary, border-border, text-success). Raw palette " +
  "classes and hex literals break dark mode and re-theming.";

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
  // Semantic tokens only -- enforced by lint, not by convention.
  {
    files: ["src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${RAW_COLOR_CLASS}/]`,
          message: RAW_COLOR_MESSAGE,
        },
        {
          selector: `TemplateElement[value.raw=/${RAW_COLOR_CLASS}/]`,
          message: RAW_COLOR_MESSAGE,
        },
      ],
    },
  },
]);

export default eslintConfig;
