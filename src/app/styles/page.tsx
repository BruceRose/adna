import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StyleExplorerGrid, StyleExplorerGridFromUrl } from "@/components/v3/StyleExplorer";
import { STYLES_INTRO, STYLES_AXES, STYLES_HOW_THEY_WORK } from "@/lib/v3/stylePageCopy";

export const metadata: Metadata = {
  title: "The nine event styles · Audience DNA",
  description:
    "Nine event styles, based on how people like to connect at events and how they like to engage with ideas. Find out what each style gets most from events.",
  alternates: { canonical: "/styles" },
  openGraph: { title: "The nine event styles · Audience DNA", url: "/styles" },
};

export default function StylesPage() {
  return (
    <div className="report styles-page">
      <section className="card hero">
        <p className="eyebrow">Audience DNA</p>
        <h1 className="report-title">The nine event styles</h1>
        <p className="lede">{STYLES_INTRO}</p>
        <dl className="axes-explained">
          {STYLES_AXES.map((a) => (
            <div key={a.name} className={`axis-${a.id}`}>
              <dt>{a.name}</dt>
              <dd>{a.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card">
        <h2 className="section-title">Explore the styles</h2>
        <p className="muted small">Choose a style to see what people with it get from events. You can use the arrow keys to move around the grid.</p>
        <Suspense fallback={<StyleExplorerGrid />}>
          <StyleExplorerGridFromUrl />
        </Suspense>
      </section>

      <section className="card">
        <h2 className="section-title">How styles work</h2>
        <p>{STYLES_HOW_THEY_WORK}</p>
        <p>
          <Link href="/">Discover your style</Link>
        </p>
      </section>
    </div>
  );
}
