import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource/cal-sans/400.css";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NavLinks } from "./nav-links";

export const metadata: Metadata = {
  title: "Yvia - Suivi de marge",
  description: "Pilotage de la marge des freelances en mission",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className="flex min-h-full flex-col">
        <header className="border-b bg-background">
          <nav className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3">
            <span className="mr-6 font-display text-xl text-yvia-navy">Yvia</span>
            <NavLinks />
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
