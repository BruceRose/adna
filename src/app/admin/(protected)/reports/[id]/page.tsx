import Link from "next/link";
import { notFound } from "next/navigation";
import { AudienceReportView } from "@/components/AudienceReportView";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyLinkButton, PrintButton } from "@/components/ReportTools";
import { formatDate, industryLabel } from "@/lib/format";
import { buildAudienceReport } from "@/lib/insights";
import { getAudienceReport, reportMembers } from "@/lib/reports";
import { removeReport, resetReportLink } from "../../../actions";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saved = await getAudienceReport(id);
  if (!saved) notFound();

  const members = await reportMembers(saved.responseIds);
  const report = buildAudienceReport(members.map((m) => ({ scores: m.scores, version: m.questionnaireVersion })));
  const missing = saved.responseIds.length - members.length;
  const clientPath = `/r/${saved.shareToken}`;

  return (
    <>
      <p className="no-print">
        <Link href="/admin/reports">← All audience reports</Link>
      </p>

      <div className="report-actions no-print">
        <CopyLinkButton path={clientPath} />
        <Link className="button small" href={clientPath} target="_blank">
          Open client view ↗
        </Link>
        <PrintButton />
        <form action={resetReportLink}>
          <input type="hidden" name="id" value={saved.id} />
          <ConfirmButton
            className="small"
            message="Create a new client link? Anyone with the old link will no longer be able to open this report."
          >
            Reset client link
          </ConfirmButton>
        </form>
        <form action={removeReport}>
          <input type="hidden" name="id" value={saved.id} />
          <ConfirmButton message={`Delete the report "${saved.name}"? The responses themselves are kept.`} className="danger small">
            Delete report
          </ConfirmButton>
        </form>
      </div>

      {missing > 0 && (
        <p className="notice no-print">
          {missing} {missing === 1 ? "person has" : "people have"} been deleted since this report was created and{" "}
          {missing === 1 ? "is" : "are"} no longer included.
        </p>
      )}

      {report ? (
        <AudienceReportView report={report} title={saved.name} note={saved.note} meta={`Created ${formatDate(saved.createdAt)}`} />
      ) : (
        <p className="card muted">Everyone in this report has since been deleted.</p>
      )}

      {members.length > 0 && (
        <details className="card members no-print">
          <summary>
            <strong>Who&apos;s in this audience</strong> <span className="muted">({members.length})</span>
            <span className="muted small"> · only visible to admins, not on the client link</span>
          </summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Industry</th>
                  <th>Profile</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link href={`/admin/responses/${m.id}`}>{m.name}</Link>
                    </td>
                    <td>{m.email}</td>
                    <td>{industryLabel(m)}</td>
                    <td className="nowrap">
                      {m.profile} <span className="muted">{m.code}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </>
  );
}
