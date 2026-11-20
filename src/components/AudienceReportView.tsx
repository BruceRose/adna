import { StyleGrid } from "@/components/v3/StyleGrid";
import { AUDIENCE_COPY, type AudienceReport, type AxisSummary, type Share } from "@/lib/v3/audience";
import { P3, P4, P5, P7, P8 } from "@/lib/v3/items";
import { AXIS_NAMES, LEVEL_NAMES, type AxisId } from "@/lib/v3/styles";

/**
 * The v3 audience report: used by saved reports (admin), the read-only
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
  const header = (n?: number) => (
    <>
      <p className="eyebrow">Audience DNA report</p>
      <h1 className="report-title">{title}</h1>
      {note && <p className="muted report-note">{note}</p>}
      <p className="report-meta">
        {n !== undefined && (
          <strong>
            {n} {n === 1 ? "person" : "people"}
          </strong>
        )}
        {n !== undefined && meta && " · "}
        {meta}
      </p>
    </>
  );

  const notices = (
    <>
      {report.excluded > 0 && <p className="notice subtle">{AUDIENCE_COPY.excluded(report.excluded)}</p>}
      {report.legacy > 0 && <p className="notice subtle">{AUDIENCE_COPY.legacy(report.legacy)}</p>}
    </>
  );

  if (report.state === "too_small") {
    return (
      <div className="report audience-report">
        <section className="card hero">
          {header()}
          <p className="too-small">{AUDIENCE_COPY.tooSmall}</p>
          {notices}
        </section>
      </div>
    );
  }

  return (
    <div className="report audience-report">
      <section className="card hero">
        {header(report.n)}
        <p className="report-headline">{report.headline}</p>
        {report.motivationLine && <p className="motivation-line">{report.motivationLine}</p>}
        {report.indicative && <p className="notice">{AUDIENCE_COPY.indicative}</p>}
        {notices}
      </section>

      <section className="card">
        <h2 className="section-title">Style map</h2>
        <p className="muted">How many people have each event style, with row and column totals.</p>
        <StyleGrid mode="audience" {...report.styleMap} n={report.n} />
      </section>

      <section className="card">
        <h2 className="section-title">How this audience leans</h2>
        <p className="muted">
          Each dot is one person. The marker shows the audience average and the shaded band its 95% confidence interval.
        </p>
        <div className="axis-strips">
          <AxisStrip a={report.axes.connecting} />
          <AxisStrip a={report.axes.ideas} />
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">What this audience wants</h2>
        <h3 className="sub">Ways of meeting people</h3>
        <p className="muted small">Ranked by how many say it works well for them, minus how many say it&apos;s not for them.</p>
        <div className="table-wrap flat">
          <table className="wants-table">
            <thead>
              <tr>
                <th>Format</th>
                <th>Works well</th>
                <th>Not for me</th>
              </tr>
            </thead>
            <tbody>
              {report.wants.p2.map((r) => (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td className="nowrap"><Pct s={r.worksWell} /></td>
                  <td className="nowrap"><Pct s={r.notForMe} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid-2 wants-grid">
          <ShareList title="How they like to take part" items={report.wants.p3} note={P3.question} />
          <ShareList title="What convinces them" items={report.wants.p4} note="Top two choices" />
          <ShareList title="Session length" items={report.wants.p5} note={P5.question} />
          <ShareList title="Information before the event" items={report.wants.p7} note={P7.question} />
          <ShareList title="Pace on the day" items={report.wants.p8} note={P8.question} />
          <div className="share-block">
            <h3 className="sub">Planning</h3>
            <ul className="share-list">
              <ShareRow label="Planners" s={report.planning.planner} />
              <ShareRow label="Free-roamers" s={report.planning.freeRoamer} />
            </ul>
            {report.planning.sendAgendasEarly && <p className="callout">Send agendas early.</p>}
          </div>
        </div>
        <p className="muted small">± figures are 95% margins of error, in percentage points.</p>
      </section>

      <section className="card">
        <h2 className="section-title">How to connect with this audience</h2>
        <p className="muted">Advice by role, starting with the axis where this audience agrees most.</p>
        <div className="playbook">
          <PlaybookColumn icon="🗓️" title="Designing the experience" who="For event planners" items={report.playbook.planners} />
          <PlaybookColumn icon="✍️" title="Writing for them" who="For content and comms teams" items={report.playbook.content} />
          <PlaybookColumn icon="🎤" title="Presenting and hosting" who="For speakers, hosts and clients" items={report.playbook.presenters} />
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2 className="section-title">What to avoid</h2>
          <p className="muted small">Ways of meeting people that at least 30% say are not for them.</p>
          {report.avoid.length ? (
            <ul className="avoid-list">
              {report.avoid.map((a) => (
                <li key={a.id}>
                  <span className="avoid-n">{a.notForMe.pct}%</span>
                  <span>{a.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nothing stands out as unpopular with this audience.</p>
          )}
        </section>

        <section className="card">
          <h2 className="section-title">Don&apos;t forget</h2>
          <p className="muted small">Groups of 20% or more who need something different from the main advice.</p>
          {report.dontForget.length ? (
            <ul className="watch-list">
              {report.dontForget.map((w) => (
                <li key={`${w.axis}-${w.level}`} className={`axis-${w.axis}`}>
                  <strong>
                    {w.label} ({w.share.pct}%):
                  </strong>{" "}
                  {w.text}
                </li>
              ))}
            </ul>
          ) : (
            <p>This audience is fairly consistent: the main advice covers almost everyone.</p>
          )}
        </section>
      </div>

      <p className="muted small center">
        Based on {report.n} Audience DNA responses. Styles describe preferences at events, not abilities.
      </p>
    </div>
  );
}

function Pct({ s }: { s: Share }) {
  return (
    <>
      <strong>{s.pct}%</strong> <span className="moe">±{s.moe}</span>
    </>
  );
}

function ShareRow({ label, s }: { label: string; s: Share }) {
  return (
    <li>
      <span className="share-label">{label}</span>
      <span className="share-bar" aria-hidden>
        <span style={{ width: `${s.pct}%` }} />
      </span>
      <span className="share-n">
        <Pct s={s} />
      </span>
    </li>
  );
}

function ShareList({ title, items, note }: { title: string; items: ({ id: string; label: string } & Share)[]; note: string }) {
  return (
    <div className="share-block">
      <h3 className="sub">{title}</h3>
      <p className="muted small">{note}</p>
      <ul className="share-list">
        {items.map((i) => (
          <ShareRow key={i.id} label={i.label} s={i} />
        ))}
      </ul>
    </div>
  );
}

/** Position on a 1-5 scale as a percentage of the track. */
const pos = (v: number) => ((Math.min(5, Math.max(1, v)) - 1) / 4) * 100;

function AxisStrip({ a }: { a: AxisSummary }) {
  const n = a.scores.length;
  const size = n <= 40 ? 12 : n <= 150 ? 8 : 5;
  const stacks = new Map<number, number>();
  const dots = a.scores.map((score) => {
    const bin = Math.round(score * 8) / 8;
    const level = stacks.get(bin) ?? 0;
    stacks.set(bin, level + 1);
    return { x: pos(bin), level };
  });
  const maxStack = Math.max(1, ...stacks.values());
  const step = Math.min(size + 2, 110 / maxStack);
  const height = Math.max(40, maxStack * step + size + 10);
  const levelNames = LEVEL_NAMES[a.axis as AxisId];

  return (
    <div className={`axis-strip axis-${a.axis}`}>
      <div className="strand-head">
        <h3>{AXIS_NAMES[a.axis]}</h3>
        <span className="muted small">
          Average {a.mean.toFixed(2)} (95% CI {a.ciLow.toFixed(2)} to {a.ciHigh.toFixed(2)}) on a 1-5 scale
        </span>
      </div>
      <div className="strip" style={{ height }} role="img" aria-label={`${AXIS_NAMES[a.axis]}: ${n} people, average ${a.mean.toFixed(2)}`}>
        <div className="strip-axis" />
        <div className="strip-ci" style={{ left: `${pos(a.ciLow)}%`, width: `${pos(a.ciHigh) - pos(a.ciLow)}%` }} />
        {a.cuts.map((c) => (
          <div key={c} className="strip-cut" style={{ left: `${pos(c)}%` }} />
        ))}
        {dots.map((d, i) => (
          <span key={i} className="strip-dot" style={{ left: `${d.x}%`, bottom: 8 + d.level * step, width: size, height: size, marginLeft: -size / 2 }} />
        ))}
        <div className="strip-mean" style={{ left: `${pos(a.mean)}%` }}>
          <span>avg</span>
        </div>
      </div>
      <div className="strip-levels">
        {(["low", "mid", "high"] as const).map((l) => (
          <span key={l} className={a.dominant === l ? "win" : ""}>
            {levelNames[l]} <Pct s={a.levels[l]} />
          </span>
        ))}
      </div>
    </div>
  );
}

function PlaybookColumn({ icon, title, who, items }: { icon: string; title: string; who: string; items: { axis: AxisId; text: string }[] }) {
  return (
    <article className="play-col">
      <span className="tile-icon" aria-hidden>
        {icon}
      </span>
      <h3>{title}</h3>
      <p className="muted small">{who}</p>
      <ul>
        {items.map((it) => (
          <li key={it.axis} className={`axis-${it.axis}`}>
            {it.text}
          </li>
        ))}
      </ul>
    </article>
  );
}
