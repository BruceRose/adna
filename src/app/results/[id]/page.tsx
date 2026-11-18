import { notFound } from "next/navigation";
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
  const name = profile?.name ?? row.profile;

  return (
    <section className="card result">
      <p className="eyebrow">Your Audience DNA</p>
      <h1 className="profile-name">
        <span className="youre">You&apos;re {/^[AEIOU]/.test(name) ? "an" : "a"}</span>
        {name}
      </h1>
      <p className="code" aria-label={`Code ${row.code}`}>
        {row.code.split("").map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </p>
      {profile?.description && <p className="profile-desc">{profile.description}</p>}

      <h2 className="section-title">How your answers balanced out</h2>
      <p className="muted">
        Your profile comes from four pairs of traits. Whichever side of each pair you leaned towards gives you
        that letter.
      </p>
      <DimensionBars dimensions={dimensions} />

      <p className="muted small">
        Thanks for taking part! Bookmark this page to come back to your results any time.
      </p>
    </section>
  );
}
