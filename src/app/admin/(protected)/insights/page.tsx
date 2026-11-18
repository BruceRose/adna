import Link from "next/link";
import { headers } from "next/headers";
import { buildAudienceReport } from "@/lib/insights";
import { INDUSTRIES, OTHER_INDUSTRY, POLE_INFO, PROFILES } from "@/lib/questionnaire";
import { audienceRows, filtersFromParams, listEvents, profileCounts } from "@/lib/responses";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { event, industry } = filtersFromParams(params);
  const filters = { event, industry };

  const [rows, counts, events] = await Promise.all([audienceRows(filters), profileCounts(filters), listEvents()]);
  const report = buildAudienceReport(rows);
  const typical = report && PROFILES.find((p) => p.code === report.typicalCode);
  const maxCount = Math.max(1, ...counts.map((c) => c.n));

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Audience insights</h1>
          <p className="muted">
            What this audience is like, and how to design and communicate for them.
          </p>
        </div>
        <div className="actions">
          <Link className="button" href={`/admin${qs ? `?${qs}` : ""}`}>
            View responses
          </Link>
        </div>
      </div>

      <form className="filters" method="get">
        <select name="event" defaultValue={event ?? ""} aria-label="Event">
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e.event} value={e.event!}>
              {e.event} ({e.n})
            </option>
          ))}
        </select>
        <select name="industry" defaultValue={industry ?? ""} aria-label="Industry">
          <option value="">All industries</option>
          {[...INDUSTRIES, OTHER_INDUSTRY].map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
        <button className="primary small">Show</button>
        {(event || industry) && (
          <Link href="/admin/insights" className="small">
            Clear
          </Link>
        )}
      </form>

      <section className="card event-link">
        <h2 className="section-title">Collect responses for an event</h2>
        <p className="muted small">
          Add <code>?event=</code> and a short name to the questionnaire link. Everyone who uses that link is tagged
          with the event, and you can filter by it here.
        </p>
        <p className="link-example">
          <code>
            {origin}/?event={event ?? "your-event-name"}
          </code>
        </p>
      </section>

      {!report ? (
        <p className="card muted">No responses yet{event || industry ? " for this selection" : ""}.</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="card stat">
              <span className="stat-n">{report.total}</span>
              <span className="muted">responses</span>
            </div>
            <div className="card stat wide">
              <span className="muted small">If this audience were one person, they&apos;d be</span>
              <span className="stat-profile">
                {typical?.name} <span className="muted">{report.typicalCode}</span>
              </span>
              <span className="muted small">{typical?.tagline}</span>
            </div>
          </div>

          <section className="card">
            <h2 className="section-title">The audience on each strand</h2>
            <ul className="aud-dims">
              {report.dimensions.map((d) => {
                const [a, b] = d.poles;
                return (
                  <li key={d.key} style={{ ["--c" as string]: `var(--strand-${d.key})` }}>
                    <div className="aud-dim-head">
                      <h3>{d.name}</h3>
                      <span className="muted small">{d.label}</span>
                    </div>
                    <div className="split" role="img" aria-label={`${d.share[0]}% ${POLE_INFO[a].friendly}, ${d.share[1]}% ${POLE_INFO[b].friendly}`}>
                      <div className="split-a" style={{ width: `${d.share[0]}%` }}>
                        {d.share[0] >= 12 && `${d.share[0]}%`}
                      </div>
                      <div className="split-b" style={{ width: `${d.share[1]}%` }}>
                        {d.share[1] >= 12 && `${d.share[1]}%`}
                      </div>
                    </div>
                    <div className="spectrum-ends">
                      <span className={d.lean === "first" ? "win" : ""}>{POLE_INFO[a].friendly}</span>
                      <span className={d.lean === "second" ? "win" : ""}>{POLE_INFO[b].friendly}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card">
            <h2 className="section-title">Recommendations for this audience</h2>
            <div className="recs">
              {report.recommendations.map((r, i) => (
                <article key={r.dimension} className="rec" style={{ ["--c" as string]: `var(--strand-${report.dimensions[i].key})` }}>
                  <p className="rec-dim">{r.dimension}</p>
                  <h3>{r.heading}</h3>
                  <p>
                    <strong>Event design:</strong> {r.design}
                  </p>
                  <p>
                    <strong>Comms:</strong> {r.comms}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="card dist">
            <h2 className="section-title">Profile mix</h2>
            <ul>
              {counts.map((c) => (
                <li key={c.code}>
                  <span className="dist-label">
                    {c.profile} <span className="muted">{c.code}</span>
                  </span>
                  <span className="dist-bar">
                    <span style={{ width: `${(c.n / maxCount) * 100}%` }} />
                  </span>
                  <span className="dist-n">{Math.round((c.n / report.total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
