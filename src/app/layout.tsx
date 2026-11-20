import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SITE_URL } from "@/lib/site";
import "@fontsource-variable/nunito";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Audience DNA",
  description: "Discover your event style and what helps you get the most out of events.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <header className="site-header">
          <Link href="/" className="site-logo" aria-label="Audience DNA home">
            <Logo />
          </Link>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
