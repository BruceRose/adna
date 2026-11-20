import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareButton } from "@/components/ShareButton";
import { Continuum } from "@/components/v3/Continuum";
import { PreferencesPanel } from "@/components/v3/PreferencesPanel";
import { StyleGrid } from "@/components/v3/StyleGrid";
import { getResponse } from "@/lib/responses";
import { P2_ROW_IDS, type P2RowId } from "@/lib/v3/items";
import { buildRecommendations } from "@/lib/v3/recommendations";
import { ABOUT_YOUR_STYLE, PLANNING_BADGES, STYLES, motivationLabel } from "@/lib/v3/styles";

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

  return (
    <div className="report">
      <section className="card hero">
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
            With a touch of <strong>{neighbour.name}</strong>: {neighbour.tagline}
          </p>
        )}
        {(planning || motivation) && (
          <ul className="badges" aria-label="Your badges">
            {planning && <li className="badge planning">{planning.label}</li>}
            {motivation && <li className="badge motivation">{motivation}</li>}
          </ul>
        )}
        {planning && <p className="muted badge-copy">{planning.copy}</p>}
        <div className="hero-actions">
          <ShareButton title={`My event style is ${style.name}. What's yours?`} />
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Your style map</h2>
        <p className="muted">
          Nine event styles, based on how you like to connect with people and how you like to engage with ideas.
        </p>
        <StyleGrid mode="personal" style={row.style} neighbour={row.styleNeighbour} />
      </section>

      <section className="card">
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

      <section className="card">
        <h2 className="section-title">How you like to experience events</h2>
        <div className="grid-2 recs-grid">
          <div className="rec-block">
            <h3>Formats that work for you</h3>
            {recs.formats.length ? (
              <ul className="chips formats">
                {recs.formats.map((f) => (
                  <li key={f.id}>{f.label}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">Ask organisers about smaller, more flexible ways to meet people.</p>
            )}
          </div>
          <div className="rec-block">
            <h3>How you like to take part</h3>
            {recs.takePart.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
          <div className="rec-block">
            <h3>What convinces you</h3>
            <p>{recs.convinces}</p>
          </div>
          <div className="rec-block">
            <h3>How to communicate with you</h3>
            <ul className="ticks">
              {recs.communicate.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="rec-block">
            <h3>Content depth</h3>
            {recs.depth.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
          {recs.pace && (
            <div className="rec-block">
              <h3>Pace</h3>
              <p>{recs.pace}</p>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Your preferences</h2>
        <PreferencesPanel id={row.id} preferences={row.preferences} p2Order={p2Order} />
      </section>

      <section className="card about-style">
        <h2 className="section-title">About your style</h2>
        <p>{ABOUT_YOUR_STYLE}</p>
      </section>

      <p className="muted small center">Bookmark this page to come back to your results any time.</p>
    </div>
  );
}
