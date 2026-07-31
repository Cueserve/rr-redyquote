import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Archivo is the only text family: display, body and the rare brand-voice
// italic. Headings differ from body by weight and tracking, not by face -- one
// grotesk keeps a dense quote table visually quiet. Loaded as a variable font,
// so every weight 400-700 costs one file.
const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

// Tabular numerics only -- costs, SKUs, percentages, quantities, and every
// editable numeric field. Not a variable font, so the weights are explicit.
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RedyQuote",
  description: "Quoting and approval for REDYREF interactive kiosks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
