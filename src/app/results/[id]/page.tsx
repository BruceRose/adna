import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsActions, ScrollReveal, SectionNav } from "@/components/v3/ResultsChrome";
import { CommunicationIcon, ContentIcon, MeetingIcon, PaceIcon, TakePartIcon } from "@/components/v3/TipIcons";
import { Continuum } from "@/components/v3/Continuum";
import { PreferencesPanel } from "@/components/v3/PreferencesPanel";
import { StyleGrid } from "@/components/v3/StyleGrid";
import { StyleEmblem } from "@/components/v3/StyleEmblem";
import { StyleExplorerGrid } from "@/components/v3/StyleExplorer";
import Link from "next/link";
import { getResponse } from "@/lib/responses";
import { P2_ROW_IDS, type P2RowId } from "@/lib/v3/items";
import { buildRecommendations } from "@/lib/v3/recommendations";
import { ABOUT_YOUR_STYLE, PLANNING_BADGES, STYLES, motivationLabel, styleSlug } from "@/lib/v3/styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getResponse((await params).id);
  if (!row) return { title: "Audience DNA" };
  const title = `My event style: ${STYLES[row.style].name} · Audience DNA`;
  return {
    title,
    description: "Discover your event style and what helps you get the most out of events.",
    robots: { index: false },
    openGraph: { title, description: STYLES[row.style].tagline },
  };
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const row = await getResponse(id);
  if (!row) notFound();

  const style = STYLES[row.style];
  const neighbour = row.styleNeighbour ? STYLES[row.styleNeighbour] : null;
  const recs = buildRecommendations(row.preferences, row.axes, row.badges.planning);
  const firstName = row.name.trim().split(/\s+/)[0];
  const motivation = motivationLabel(row.badges.motivation);
  const planning = row.badges.planning ? PLANNING_BADGES[row.badges.planning] : null;
  const shownP2 = row.meta.presentedOrder.filter((x) => x.startsWith("P2.")).map((x) => x.slice(3) as P2RowId);
  const p2Order = shownP2.length === P2_ROW_IDS.length ? shownP2 : P2_ROW_IDS;

  const shareTitle = `My event style is ${style.name}. What's yours?`;

  return (
    <div className="report results-page">
      <ScrollReveal />
      <SectionNav />

      <section className="card hero results-hero" id="your-style">
        <StyleEmblem style={row.style} size={160} animate />
        <p className="eyebrow">Your event style</p>
        <h1 className="profile-name">
          <span className="youre">{firstName ? `${firstName}, you're` : "You're"}</span>
          {/^[AEIOU]/.test(style.name) ? "an" : "a"} {style.name}
        </h1>
        <p className="tagline">{style.tagline}</p>
        <ul className="chips strengths" aria-label="Your strengths">
          {style.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="profile-desc">{style.description}</p>
        {neighbour && (
          <p className="neighbour-line">
            With a touch of{" "}
            <Link href={`/styles/${styleSlug(neighbour.id)}?you=${row.style}`}>
              <strong>{neighbour.name}</strong>
            </Link>
            : {neighbour.tagline}
          </p>
        )}
        {(planning || motivation) && (
          <ul className="badges" aria-label="Your badges">
            {planning && <li className="badge planning">{planning.label}</li>}
            {motivation && <li className="badge motivation">{motivation}</li>}
          </ul>
        )}
        {planning && <p className="muted badge-copy">{planning.copy}</p>}
        <ResultsActions shareTitle={shareTitle} />
      </section>

      <section className="card reveal-on-scroll" id="your-map">
        <h2 className="section-title">Your style map</h2>
        <p className="muted">
          Nine event styles, based on how you like to connect with people and how you like to engage with ideas.
        </p>
        <StyleGrid mode="personal" style={row.style} neighbour={row.styleNeighbour} />
        <h2 className="section-title">Where you sit</h2>
        <p className="muted">
          The marker shows where your answers place you. The shaded band shows the range you could fall in on another
          day.
        </p>
        <div className="continua">
          <Continuum axis="connecting" score={row.axes.connecting.score} scales={[row.scaleScores.SE, row.scaleScores.SI]} />
          <Continuum axis="ideas" score={row.axes.ideas.score} scales={[row.scaleScores.DP, row.scaleScores.NO]} />
        </div>
      </section>

      <section className="reveal-on-scroll" id="your-tips" aria-labelledby="tips-heading">
        <h2 className="section-title tips-title" id="tips-heading">
          How you like to experience events
        </h2>
        <div className="tips">
          <article className="card tip">
            <MeetingIcon />
            <h3>Meeting people</h3>
            <p className="muted small">Formats that work for you</p>
            {recs.formats.length ? (
              <ul className="chips formats">
                {recs.formats.map((f) => (
                  <li key={f.id}>{f.label}</li>
                ))}
              </ul>
            ) : (
              <p>Ask organisers about smaller, more flexible ways to meet people.</p>
            )}
          </article>
          <article className="card tip">
            <TakePartIcon />
            <h3>Taking part</h3>
            {recs.takePart.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </article>
          <article className="card tip">
            <ContentIcon />
            <h3>Content</h3>
            <p className="muted small">What convinces you</p>
            <p>{recs.convinces}</p>
            <p className="muted small">Content depth</p>
            {recs.depth.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </article>
          <article className="card tip">
            <CommunicationIcon />
            <h3>Communication</h3>
            <ul className="ticks">
              {recs.communicate.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </article>
          {recs.pace && (
            <article className="card tip">
              <PaceIcon />
              <h3>Pace</h3>
              <p>{recs.pace}</p>
            </article>
          )}
        </div>
      </section>

      <section className="card explore reveal-on-scroll" id="explore">
        <h2 className="section-title">Explore the other styles</h2>
        <p className="muted">See what each style gets from events, and how it compares with yours.</p>
        <StyleExplorerGrid you={row.style} compact />
        <p>
          <Link href={`/styles?you=${row.style}`}>See all nine styles</Link>
        </p>
      </section>

      <section className="card reveal-on-scroll" id="your-preferences">
        <h2 className="section-title">Your preferences</h2>
        <PreferencesPanel id={row.id} preferences={row.preferences} p2Order={p2Order} />
      </section>

      <section className="card about-style reveal-on-scroll">
        <h2 className="section-title">About your style</h2>
        <p>{ABOUT_YOUR_STYLE}</p>
      </section>

      <p className="muted small center">Bookmark this page to come back to your results any time.</p>
    </div>
  );
}
