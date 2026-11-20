import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import "@fontsource-variable/nunito";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audience DNA",
  description: "Discover your Audience DNA profile.",
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
