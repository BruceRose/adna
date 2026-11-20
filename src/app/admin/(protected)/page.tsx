import Link from "next/link";
import { SelectAll, SelectionBar } from "@/components/ReportTools";
import { formatDate, industryLabel } from "@/lib/format";
import { filtersFromParams, listEvents, listResponses, listWaves, styleCounts } from "@/lib/responses";
import { INDUSTRIES, OTHER_INDUSTRY } from "@/lib/v3/items";
import { STYLES, STYLE_IDS } from "@/lib/v3/styles";
import { createReport } from "../actions";

const PAGE_SIZE = 50;

export default async function AdminResponses({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = filtersFromParams(params);
  const page = Math.max(1, Number(params.page) || 1);

  const [{ rows, total }, counts, events, waves] = await Promise.all([
    listResponses(filters, page, PAGE_SIZE),
    styleCounts(filters),
    listEvents(),
    listWaves(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const maxCount = Math.max(1, ...counts.map((c) => c.n));

  const qs = (extra: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, ...extra })) if (v) sp.set(k, String(v));
    const s = sp.toString();
    return s ? `?${s}` : "";
  };
  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Responses</h1>
          <p className="muted">
            {total} {filtered ? "matching" : "in total"}
          </p>
        </div>
        <div className="actions">
          <a className="button" href={`/admin/export${qs({ format: "xlsx" })}`}>
            Export Excel
          </a>
          <a className="button" href={`/admin/export${qs({ format: "csv" })}`}>
            Export CSV
          </a>
          <a className="button" href={`/admin/export${qs({ format: "research" })}`}>
            Research export (item-level, no names or emails)
          </a>
        </div>
      </div>

      <form className="filters" method="get">
        <input name="q" placeholder="Search name or email" defaultValue={filters.q} aria-label="Search" />
        <select name="event" defaultValue={filters.event ?? ""} aria-label="Event">
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e.value} value={e.value}>
              {e.value} ({e.n})
            </option>
          ))}
        </select>
        <select name="industry" defaultValue={filters.industry ?? ""} aria-label="Industry">
          <option value="">All industries</option>
          {[...INDUSTRIES, OTHER_INDUSTRY].map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
        <select name="style" defaultValue={filters.style ?? ""} aria-label="Style">
          <option value="">All styles</option>
          {STYLE_IDS.map((s) => (
            <option key={s} value={s}>
              {STYLES[s].name}
            </option>
          ))}
        </select>
        <select name="wave" defaultValue={filters.wave ?? ""} aria-label="Wave">
          <option value="">All waves</option>
          {waves.map((w) => (
            <option key={w.value} value={w.value}>
              {w.value} ({w.n})
            </option>
          ))}
        </select>
        <select name="quality" defaultValue={filters.quality ?? ""} aria-label="Quality">
          <option value="">Any quality</option>
          <option value="clean">Clean</option>
          <option value="flagged">Flagged</option>
        </select>
        <button className="primary small">Filter</button>
        {filtered && (
          <Link href="/admin" className="small">
            Clear
          </Link>
        )}
      </form>

      {counts.length > 0 && (
        <section className="card dist">
          <h2 className="section-title">Style mix</h2>
          <ul>
            {counts.map((c) => (
              <li key={c.style}>
                <Link href={`/admin${qs({ style: c.style, page: undefined })}`} className="dist-label">
                  {STYLES[c.style].name}
                </Link>
                <span className="dist-bar">
                  <span style={{ width: `${(c.n / maxCount) * 100}%` }} />
                </span>
                <span className="dist-n">{c.n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows.length === 0 ? (
        <p className="card muted">No responses yet{filtered ? " match these filters" : ""}.</p>
      ) : (
        <form id="report-form" action={createReport}>
          <SelectionBar
            formId="report-form"
            matching={total}
            suggestedName={filters.event ? `${filters.event} audience` : `Audience report ${new Date().toLocaleDateString("en-GB")}`}
          />
          {Object.entries(filters).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="check-col">
                    <SelectAll formId="report-form" />
                  </th>
                  <th>Submitted</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Industry</th>
                  <th>Event</th>
                  <th>Wave</th>
                  <th>Version</th>
                  <th>Style</th>
                  <th>Quality</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="check-col">
                      <input type="checkbox" name="ids" value={r.id} aria-label={`Select ${r.name}`} />
                    </td>
                    <td className="nowrap">{formatDate(r.createdAt)}</td>
                    <td>
                      <Link href={`/admin/responses/${r.id}`}>{r.name}</Link>
                    </td>
                    <td>{r.email}</td>
                    <td>{industryLabel(r)}</td>
                    <td>{r.event ?? <span className="muted">-</span>}</td>
                    <td>{r.wave ?? <span className="muted">-</span>}</td>
                    <td>{r.questionnaireVersion}</td>
                    <td className="nowrap">{STYLES[r.style].name}</td>
                    <td>
                      {r.qualityFlags.length ? (
                        <span className="flag">{r.qualityFlags.join(", ")}</span>
                      ) : (
                        <span className="muted">Clean</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      )}

      {pages > 1 && (
        <nav className="pager">
          {page > 1 && <Link href={`/admin${qs({ page: page - 1 })}`}>← Newer</Link>}
          <span className="muted">
            Page {page} of {pages}
          </span>
          {page < pages && <Link href={`/admin${qs({ page: page + 1 })}`}>Older →</Link>}
        </nav>
      )}
    </>
  );
}
