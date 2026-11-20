import type { Metadata } from "next";
import { TransitionLink } from "@/components/PageTransitions";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HowCommon, StyleFooterCta, YouPanel } from "@/components/v3/StyleExplorer";
import { StyleEmblem } from "@/components/v3/StyleEmblem";
import { MiniGrid } from "@/components/v3/StyleGrid";
import {
  LEVEL_NAMES,
  STYLES,
  STYLE_IDS,
  neighbouringStyles,
  positionOf,
  prevNextStyle,
  styleFromSlug,
  styleSlug,
  stylePlural,
} from "@/lib/v3/styles";

/** All nine pages are built at build time; any other id is a 404. */
export const dynamicParams = false;
export function generateStaticParams() {
  return STYLE_IDS.map((id) => ({ id: styleSlug(id) }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = styleFromSlug((await params).id);
  if (!id) return {};
  const s = STYLES[id];
  const title = `${s.name}: ${s.tagline} · Audience DNA`;
  return {
    title,
    description: s.about,
    alternates: { canonical: `/styles/${styleSlug(id)}` },
    openGraph: { title, description: s.about, url: `/styles/${styleSlug(id)}`, type: "article" },
  };
}

export default async function StylePage({ params }: Props) {
  const id = styleFromSlug((await params).id);
  if (!id) notFound();
  const s = STYLES[id];
  const pos = positionOf(id);
  const { prev, next } = prevNextStyle(id);

  return (
    <div className="report style-page">
      <section className="card hero style-hero">
        <StyleEmblem style={id} size={160} animate />
        <div>
          <p className="eyebrow">Event style</p>
          <h1 className="profile-name">{s.name}</h1>
          <p className="tagline">{s.tagline}</p>
          <ul className="chips strengths" aria-label="Strengths">
            {s.strengths.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="position-label">
            {LEVEL_NAMES.connecting[pos.connecting]} · {LEVEL_NAMES.ideas[pos.ideas]}
          </p>
        </div>
        <div className="mini-grid">
          <MiniGrid style={id} />
          <span className="muted small">Connecting × Ideas</span>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">About {stylePlural(id)}</h2>
        <p className="profile-desc">{s.about}</p>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2 className="section-title">At events they get the most from</h2>
          <ul className="ticks">
            {s.getMost.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="section-title">What can drain them</h2>
          <ul className="dashes">
            {s.drains.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="section-title">Connecting with {/^[AEIOU]/.test(s.name) ? "an" : "a"} {s.name}</h2>
          <p>{s.connect}</p>
        </section>
        <section className="card">
          <h2 className="section-title">Designing for {stylePlural(id)}</h2>
          <p>{s.design}</p>
          <p className="small">
            <TransitionLink href="/styles">See how all nine styles fit together</TransitionLink>
          </p>
        </section>
      </div>

      <Suspense fallback={null}>
        <YouPanel them={id} />
      </Suspense>

      <section className="card">
        <h2 className="section-title">Neighbouring styles</h2>
        <p className="muted small">Styles next to each other on the grid have a lot in common.</p>
        <ul className="neighbours">
          {neighbouringStyles(id).map((n) => (
            <li key={n}>
              <TransitionLink href={`/styles/${styleSlug(n)}`} className="neighbour">
                <StyleEmblem style={n} size={48} />
                <span>
                  <strong>{STYLES[n].name}</strong>
                  <span className="muted small">{STYLES[n].tagline}</span>
                </span>
              </TransitionLink>
            </li>
          ))}
        </ul>
      </section>

      <HowCommon style={id} />

      <div className="style-footer">
        <Suspense fallback={null}>
          <StyleFooterCta />
        </Suspense>
        <nav className="prev-next" aria-label="Other styles">
          <TransitionLink href={`/styles/${styleSlug(prev)}`} rel="prev" direction="back">
            ← {STYLES[prev].name}
          </TransitionLink>
          <TransitionLink href="/styles">All styles</TransitionLink>
          <TransitionLink href={`/styles/${styleSlug(next)}`} rel="next">
            {STYLES[next].name} →
          </TransitionLink>
        </nav>
      </div>
    </div>
  );
}
