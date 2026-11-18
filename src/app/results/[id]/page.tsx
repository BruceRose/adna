import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DnaHelix } from "@/components/DnaHelix";
import { ShareButton } from "@/components/ShareButton";
import { Spectrum } from "@/components/Spectrum";
import { buildPersonalReport } from "@/lib/insights";
import { getResponse } from "@/lib/responses";
import { maxNetFor } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const article = (name: string) => (/^[AEIOU]/.test(name) ? "an" : "a");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getResponse((await params).id);
  if (!row) return { title: "Audience DNA" };
  const title = `I'm ${article(row.profile)} ${row.profile} · Audience DNA`;
  return {
    title,
    description: "Discover your Audience DNA: your profile and how you like to connect.",
    robots: { index: false },
    openGraph: { title, description: "Discover your Audience DNA and how you like to connect." },
  };
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const row = await getResponse(id);
  if (!row) notFound();

  const report = buildPersonalReport(row.code, row.scores, maxNetFor(row.questionnaireVersion));
  const { profile } = report;
  const firstName = row.name.trim().split(/\s+/)[0];

  return (
    <div className="report">
      <section className="card hero">
        <p className="eyebrow">Your Audience DNA</p>
        <h1 className="profile-name">
          <span className="youre">
            {firstName}, you&apos;re {article(profile.name)}
          </span>
          {profile.name}
        </h1>
        <p className="tagline">{profile.tagline}</p>
        <ul className="chips strengths" aria-label="Your strengths">
          {profile.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <DnaHelix dimensions={report.dimensions} code={row.code} />
        <p className="profile-desc">{profile.description}</p>
        <div className="hero-actions">
          <ShareButton title={`I'm ${article(profile.name)} ${profile.name}. What's your Audience DNA?`} />
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Your four strands</h2>
        <p className="muted">
          Your profile is made of four pairs of traits. Here&apos;s where you sit on each, and how strongly.
        </p>
        <Spectrum dimensions={report.dimensions} />
      </section>

      <div className="grid-2">
        <section className="card tile">
          <span className="tile-icon" aria-hidden>
            🤝
          </span>
          <h2 className="section-title">How you like to connect</h2>
          <ul className="ticks">
            {report.connect.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <section className="card tile">
          <span className="tile-icon" aria-hidden>
            🎟️
          </span>
          <h2 className="section-title">Where you&apos;ll shine at events</h2>
          <p className="muted small">The formats you&apos;re likely to get the most from:</p>
          <ul className="chips formats">
            {report.formats.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>

        <section className="card tile">
          <span className="tile-icon" aria-hidden>
            💬
          </span>
          <h2 className="section-title">How to get through to you</h2>
          <ul className="quotes">
            {report.talkToMe.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <section className="card tile">
          <span className="tile-icon" aria-hidden>
            🔋
          </span>
          <h2 className="section-title">What drains your battery</h2>
          <ul className="dashes">
            {report.drains.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <h2 className="section-title">Find your people</h2>
        <p className="muted">
          At your next event, look out for these profiles. You&apos;ll click easily with the first four, and learn the
          most from the last.
        </p>
        <ul className="people">
          {report.allies.map((a) => (
            <li key={a.profile.code} className="person">
              <strong>{a.profile.name}</strong>
              <span className="person-tag">{a.profile.tagline}</span>
              <span className="person-reason">{a.reason}</span>
            </li>
          ))}
          <li className="person stretch">
            <span className="person-label">Your stretch connection</span>
            <strong>{report.stretch.profile.name}</strong>
            <span className="person-tag">{report.stretch.profile.tagline}</span>
            <span className="person-reason">{report.stretch.reason}</span>
          </li>
        </ul>
      </section>

      <p className="muted small center">
        Bookmark this page to come back to your results any time. Your profile describes preferences, not abilities.
        Everyone can flex.
      </p>
    </div>
  );
}
