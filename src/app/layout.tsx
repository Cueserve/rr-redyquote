import type { Metadata } from "next";
import "./globals.css";

import { fontVariables } from "@/lib/fonts";

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
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
