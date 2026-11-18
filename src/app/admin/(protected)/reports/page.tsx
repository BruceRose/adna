import Link from "next/link";
import { formatDate } from "@/lib/format";
import { listAudienceReports } from "@/lib/reports";

export default async function ReportsPage() {
  const reports = await listAudienceReports();

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Audience reports</h1>
          <p className="muted">
            Group people into an audience and see how best to connect with them. Each report has a read-only link
            you can share with clients and colleagues.
          </p>
        </div>
        <div className="actions">
          <Link className="button primary-outline" href="/admin">
            + New report from responses
          </Link>
        </div>
      </div>

      {reports.length === 0 ? (
        <section className="card empty-state">
          <h2 className="section-title">No audience reports yet</h2>
          <ol>
            <li>
              Go to <Link href="/admin">Responses</Link> and filter by event, industry or profile if you like.
            </li>
            <li>Tick the people in your audience, or use everyone who matches.</li>
            <li>Give the report a name and create it.</li>
          </ol>
        </section>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>People</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/reports/${r.id}`}>
                      <strong>{r.name}</strong>
                    </Link>
                    {r.note && <div className="muted small">{r.note}</div>}
                  </td>
                  <td>{r.responseIds.length}</td>
                  <td className="nowrap">{formatDate(r.createdAt)}</td>
                  <td className="nowrap">
                    <Link href={`/r/${r.shareToken}`} target="_blank">
                      Client view ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
