import { notFound } from "next/navigation";
import Link from "next/link";
import { DimensionBars } from "@/components/DimensionBars";
import { PROFILES } from "@/lib/questionnaire";
import { getResponse } from "@/lib/responses";
import { dimensionsFromScores } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your profile · Audience DNA", robots: { index: false } };

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getResponse(id);
  if (!row) notFound();

  const profile = PROFILES.find((p) => p.code === row.code);
  const dimensions = dimensionsFromScores(row.scores);

  return (
    <section className="card result">
      <p className="eyebrow">Your Audience DNA profile</p>
      <h1 className="profile-name">{row.profile}</h1>
      <p className="code" aria-label={`Code ${row.code}`}>
        {row.code.split("").map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </p>
      {profile?.description && <p className="lede">{profile.description}</p>}

      <h2 className="section-title">How you scored</h2>
      <p className="muted">
        Each pair is scored from your answers. The side with more points gives you that letter of your code.
      </p>
      <DimensionBars dimensions={dimensions} />

      <p className="muted small">
        Thanks for taking part. You can come back to this page using its link. <Link href="/">Start again</Link>
      </p>
    </section>
  );
}
