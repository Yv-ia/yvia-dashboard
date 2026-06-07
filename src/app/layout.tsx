import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Suivi de marge freelances",
  description: "Pilotage de la marge des freelances en mission",
};

// Liens du menu de navigation, partagés par toutes les pages.
const liens = [
  { href: "/", label: "Dashboard" },
  { href: "/missions", label: "Missions" },
  { href: "/freelances", label: "Freelances" },
  { href: "/clients", label: "Clients" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-muted/30">
        <header className="border-b bg-background">
          <nav className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3">
            <span className="mr-4 font-semibold">Suivi de marge</span>
            {liens.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {lien.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
