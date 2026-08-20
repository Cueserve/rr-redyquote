"use client";

import "./globals.css";

import { fontVariables } from "@/lib/fonts";

/**
 * The last boundary. It catches what the route-scoped `error.tsx` files cannot:
 * a throw in `app/layout.tsx` itself, or in an `error.tsx` while it renders.
 *
 * It **replaces** the root layout rather than nesting inside it — which is why
 * it has to emit its own `<html>` and `<body>`, import `globals.css`, and carry
 * the font variables. Without those the crash screen falls back to Times New
 * Roman on a white page, which is exactly the unbranded Next default this file
 * exists to avoid.
 *
 * No `Card`, `Button`, or `PageBody`: the premise of this boundary is that the
 * app shell already failed once, so it stays on plain elements and token classes
 * that need nothing but the stylesheet. `reset()` is a plain `<button>` for the
 * same reason. The tokens are still the design system's — a hex literal here
 * would be a lint error and, worse, a second unreviewable palette.
 *
 * `error.digest` is the only detail shown. A raw message at the root can carry
 * anything the app was holding when it died (ARCHITECTURE.md §7), and unlike the
 * route boundaries there is no narrower claim to make about what leaked.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    // `lang` and the `<html>`/`<body>` pair are this file's responsibility now;
    // nothing above it renders when it fires.
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <main className="mx-auto flex w-full max-w-(--container-max) flex-1 flex-col justify-center gap-4 px-7 py-7">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl leading-tight font-semibold tracking-tight">
              RedyQuote could not start
            </h1>
            <p className="max-w-[57ch] text-sm text-muted-foreground">
              Something failed before the app finished loading. Nothing was
              changed. Reload the page, and if it keeps happening give your
              admin the reference below.
            </p>
          </div>
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">
              Reference {error.digest}
            </p>
          ) : null}
          <div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-input bg-clip-padding px-4.5 py-2.5 text-base font-semibold whitespace-nowrap text-foreground outline-none transition-colors select-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
