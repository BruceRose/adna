import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { RouteChangeNotifier, TransitionLink } from "@/components/PageTransitions";
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
          <TransitionLink href="/" className="site-logo" aria-label="Audience DNA home" direction="back">
            <Logo />
          </TransitionLink>
        </header>
        <main className="container">{children}</main>
        <Suspense fallback={null}>
          <RouteChangeNotifier />
        </Suspense>
      </body>
    </html>
  );
}
