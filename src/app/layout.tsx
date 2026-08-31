import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "RedyQuote",
  description: "Quoting and approval for REDYREF interactive kiosks.",
  icons: {
    icon: "/api/branding/favicon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
