import Link from "next/link";
import { headers } from "next/headers";
import { AudienceReportView } from "@/components/AudienceReportView";
import { buildAudienceReport } from "@/lib/v3/audience";
import { INDUSTRIES, OTHER_INDUSTRY } from "@/lib/v3/items";
import { audienceRows, filtersFromParams, listEvents } from "@/lib/responses";
import { createReport } from "../../actions";

/** Explore any slice of responses as an audience, then save it as a report. */
export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { event, industry } = filtersFromParams(params);
  const filters = { event, industry };

  const [rows, events] = await Promise.all([audienceRows(filters), listEvents()]);
  const report = buildAudienceReport(rows);

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const sliceName = [event, industry].filter(Boolean).join(" · ") || "Everyone";

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Insights explorer</h1>
          <p className="muted">See any event or industry as one audience. Save it as a report to share it.</p>
        </div>
      </div>

      <form className="filters" method="get">
        <select name="event" defaultValue={event ?? ""} aria-label="Event">
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e.value} value={e.value}>
              {e.value} ({e.n})
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

      {rows.length > 0 && (
        <form action={createReport} className="save-slice card">
          <input type="hidden" name="scope" value="all" />
          {event && <input type="hidden" name="event" value={event} />}
          {industry && <input type="hidden" name="industry" value={industry} />}
          <div>
            <strong>Save this audience as a report</strong>
            <p className="muted small">
              Freezes these {rows.length} people into a named report with a shareable client link.
            </p>
          </div>
          <input name="name" defaultValue={`${sliceName} audience`} aria-label="Report name" maxLength={120} />
          <button className="primary small">Save report</button>
        </form>
      )}

      {rows.length > 0 ? (
        <AudienceReportView report={report} title={sliceName} meta="Live view" />
      ) : (
        <p className="card muted">No responses yet{event || industry ? " for this selection" : ""}.</p>
      )}

      <section className="card event-link">
        <h2 className="section-title">Collect responses for an event</h2>
        <p className="muted small">
          Add <code>?event=</code> and a short name to the questionnaire link. Everyone who uses that link is tagged
          with the event, and you can filter by it here and on the Responses page.
        </p>
        <p className="link-example">
          <code>
            {origin}/?event={event ?? "your-event-name"}
          </code>
        </p>
      </section>
    </>
  );
}
