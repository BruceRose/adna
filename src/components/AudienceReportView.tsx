import { DnaHelix } from "@/components/DnaHelix";
import type { AudienceDimension, AudienceReport } from "@/lib/insights";
import { POLE_INFO, PROFILES, type Pole } from "@/lib/questionnaire";

/**
 * The full audience report: used by saved reports (admin), the read-only
 * client link and the insights explorer. Contains no personal details.
 */
export function AudienceReportView({
  report,
  title,
  note,
  meta,
}: {
  report: AudienceReport;
  title: string;
  note?: string | null;
  meta?: string;
}) {
  const typical = PROFILES.find((p) => p.code === report.typicalCode)!;
  const helixDims = report.dimensions.map((d, i) => ({
    key: d.key,
    letter: report.typicalCode[i],
    percent: Math.max(d.avgPosition, 100 - d.avgPosition),
  }));
  const topFormats = report.formats.slice(0, 6);

  return (
    <div className="report audience-report">
      <section className="card hero">
        <p className="eyebrow">Audience DNA report</p>
        <h1 className="report-title">{title}</h1>
        {note && <p className="muted report-note">{note}</p>}
        <p className="report-meta">
          <strong>
            {report.total} {report.total === 1 ? "person" : "people"}
          </strong>
          {meta && <> · {meta}</>}
        </p>
        <p className="report-headline">{report.headline}</p>
        <ul className="chips trait-chips">
          {report.dimensions.map((d) => (
            <li key={d.key} style={{ ["--c" as string]: `var(--strand-${d.key})` }}>
              {d.majority
                ? `${d.share[d.poles.indexOf(d.majority)]}% ${POLE_INFO[d.majority].friendly}`
                : `Mixed ${d.name.toLowerCase()}`}
            </li>
          ))}
        </ul>
        <DnaHelix dimensions={helixDims} code={report.typicalCode} label="This audience's combined DNA strand" />
        <div className="typical">
          <span className="muted small">If this audience were one person, they&apos;d be</span>
          <span className="typical-name">
            {/^[AEIOU]/.test(typical.name) ? "an" : "a"} {typical.name} <span className="muted">{typical.code}</span>
          </span>
          <span className="muted small">{typical.tagline}</span>
        </div>
        {report.smallSample && (
          <p className="notice">
            This is a small group, so treat the patterns as indicative. They become more reliable with 10 or more people.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">How this audience leans</h2>
        <p className="muted">Each dot is one person. The marker shows the audience average.</p>
        <ul className="swarms">
          {report.dimensions.map((d) => (
            <Swarm key={d.key} d={d} total={report.total} />
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="section-title">Profile map</h2>
        <p className="muted">
          The audience&apos;s fingerprint: how many people have each of the 16 profiles. The outlined profile is the
          audience&apos;s typical profile.
        </p>
        <ProfileMap counts={report.profileCounts} typical={report.typicalCode} />
      </section>

      <section className="card">
        <h2 className="section-title">How to connect with this audience</h2>
        <p className="muted">Advice by role, starting with what matters most for this group.</p>
        <div className="playbook">
          <PlaybookColumn icon="🗓️" title="Designing the experience" who="For event planners" items={report.playbook.planners} />
          <PlaybookColumn icon="✍️" title="Writing for them" who="For content and comms teams" items={report.playbook.content} />
          <PlaybookColumn icon="🎤" title="Presenting and hosting" who="For speakers, hosts and clients" items={report.playbook.presenters} />
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2 className="section-title">Formats that will land</h2>
          <p className="muted small">Share of this audience each format suits best.</p>
          <ul className="fit-list">
            {topFormats.map((f) => (
              <li key={f.name} style={{ ["--c" as string]: `var(--strand-${f.key})` }}>
                <span className="fit-name">{f.name}</span>
                <span className="fit-bar">
                  <span style={{ width: `${f.fit}%` }} />
                </span>
                <span className="fit-n">{f.fit}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="section-title">What to avoid</h2>
          <p className="muted small">What would drain a large part of this audience.</p>
          <ul className="avoid-list">
            {report.avoid.slice(0, 4).map((a) => (
              <li key={a.text}>
                <span className="avoid-n">{a.share}%</span>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {report.watchOuts.length > 0 && (
        <section className="card">
          <h2 className="section-title">Don&apos;t forget</h2>
          <p className="muted small">Significant minorities who will need something different.</p>
          <ul className="watch-list">
            {report.watchOuts.map((w) => (
              <li key={w.key} style={{ ["--c" as string]: `var(--strand-${w.key})` }}>
                {w.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="muted small center">
        Based on {report.total} Audience DNA {report.total === 1 ? "response" : "responses"}. Profiles describe
        preferences, not abilities.
      </p>
    </div>
  );
}

function Swarm({ d, total }: { d: AudienceDimension; total: number }) {
  const [a, b] = d.poles;
  const size = total <= 40 ? 14 : total <= 120 ? 9 : 6;
  const binWidth = total <= 40 ? 4 : 3;
  const stacks = new Map<number, number>();
  const dots = d.positions.map((pos) => {
    const bin = Math.round(pos / binWidth) * binWidth;
    const level = stacks.get(bin) ?? 0;
    stacks.set(bin, level + 1);
    return { x: Math.max(1.5, Math.min(98.5, bin)), level, right: pos > 50 };
  });
  const maxStack = Math.max(1, ...stacks.values());
  const step = Math.min(size + 2, 120 / maxStack);
  const height = Math.max(40, maxStack * step + size + 10);

  const label = (pole: Pole, share: number) => (
    <span className={d.majority === pole ? "win" : ""}>
      {share}% {POLE_INFO[pole].friendly}
    </span>
  );

  return (
    <li className="swarm-row" style={{ ["--c" as string]: `var(--strand-${d.key})` }}>
      <div className="strand-head">
        <h3>{d.name}</h3>
        <span className="muted small">{d.label}</span>
      </div>
      <div
        className="swarm"
        style={{ height }}
        role="img"
        aria-label={`${d.name}: ${d.share[0]}% ${POLE_INFO[a].friendly}, ${d.share[1]}% ${POLE_INFO[b].friendly}`}
      >
        <div className="swarm-axis" />
        <div className="swarm-mid" />
        {dots.map((dot, i) => (
          <span
            key={i}
            className={`swarm-dot${dot.right ? " right" : ""}`}
            style={{ left: `${dot.x}%`, bottom: 8 + dot.level * step, width: size, height: size, marginLeft: -size / 2 }}
          />
        ))}
        <div className="swarm-avg" style={{ left: `${d.avgPosition}%` }}>
          <span>avg</span>
        </div>
      </div>
      <div className="spectrum-ends">
        {label(a, d.share[0])}
        {label(b, d.share[1])}
      </div>
    </li>
  );
}

const MAP_ROWS = [
  { prefix: "TE", label: "Logic · Outgoing" },
  { prefix: "TI", label: "Logic · Reflective" },
  { prefix: "FE", label: "Empathy · Outgoing" },
  { prefix: "FI", label: "Empathy · Reflective" },
];
const MAP_COLS = [
  { suffix: "JS", label: "Planned · Practical" },
  { suffix: "JI", label: "Planned · Big-picture" },
  { suffix: "PS", label: "Flexible · Practical" },
  { suffix: "PI", label: "Flexible · Big-picture" },
];

function ProfileMap({ counts, typical }: { counts: Record<string, number>; typical: string }) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="pmap" role="table" aria-label="Profile map">
      <div className="pmap-corner" />
      {MAP_COLS.map((c) => (
        <div key={c.suffix} className="pmap-col" role="columnheader">
          {c.label}
        </div>
      ))}
      {MAP_ROWS.map((r) => (
        <div key={r.prefix} className="pmap-rowgroup" role="row">
          <div className="pmap-row" role="rowheader">
            {r.label}
          </div>
          {MAP_COLS.map((c) => {
            const code = r.prefix + c.suffix;
            const profile = PROFILES.find((p) => p.code === code)!;
            const n = counts[code] ?? 0;
            const intensity = n === 0 ? 0 : 18 + Math.round((n / max) * 72);
            return (
              <div
                key={code}
                role="cell"
                className={`pmap-cell${n === 0 ? " empty" : ""}${intensity > 55 ? " dark" : ""}${code === typical ? " typical" : ""}`}
                style={{ ["--i" as string]: `${intensity}%` }}
                title={`${profile.name} (${code}): ${n}`}
              >
                <span className="pmap-name">{profile.name}</span>
                <span className="pmap-n">{n}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PlaybookColumn({
  icon,
  title,
  who,
  items,
}: {
  icon: string;
  title: string;
  who: string;
  items: AudienceReport["playbook"]["planners"];
}) {
  return (
    <article className="play-col">
      <span className="tile-icon" aria-hidden>
        {icon}
      </span>
      <h3>{title}</h3>
      <p className="muted small">{who}</p>
      <ul>
        {items.map((it) => (
          <li key={it.key} style={{ ["--c" as string]: `var(--strand-${it.key})` }}>
            {it.text}
          </li>
        ))}
      </ul>
    </article>
  );
}
