import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
            <Link href="/" className="mr-6 flex items-center">
              <Image
                src="/logo-yvia.svg"
                alt="Yvia"
                width={107}
                height={40}
                className="h-7 w-auto"
                priority
              />
            </Link>
            <NavLinks />
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
