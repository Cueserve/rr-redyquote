import { Archivo, IBM_Plex_Mono } from "next/font/google";

// The two brand faces (DESIGN-SYSTEM.md §3), loaded once and shared by the two
// files that own an `<html>` element: `app/layout.tsx` and `app/global-error.tsx`.
//
// Extracted rather than declared twice because `global-error.tsx` *replaces* the
// root layout when it fires — including its `<html className>` — so a second,
// hand-copied loader config is the only other way to keep the crash screen on
// brand, and two copies of a font config drift silently.

// Archivo is the only text family: display, body and the rare brand-voice
// italic. Headings differ from body by weight and tracking, not by face -- one
// grotesk keeps a dense quote table visually quiet. Loaded as a variable font,
// so every weight 400-700 costs one file.
export const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

// Tabular numerics only -- costs, SKUs, percentages, quantities, and every
// editable numeric field. Not a variable font, so the weights are explicit.
export const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

/** The class string every `<html>` in the app carries. */
export const fontVariables = `${archivo.variable} ${plexMono.variable}`;
