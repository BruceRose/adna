import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AudienceReportView } from "@/components/AudienceReportView";
import { PrintButton } from "@/components/ReportTools";
import { buildAudienceReport } from "@/lib/v3/audience";
import { getAudienceReportByToken, reportRows } from "@/lib/reports";

/**
 * Read-only client view of an audience report. Anyone with the link can
 * open it, so it shows only aggregate results: no names, emails or industries.
 */

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const saved = await getAudienceReportByToken((await params).token);
  return {
    title: saved ? `${saved.name} · Audience DNA report` : "Audience DNA report",
    robots: { index: false, follow: false },
  };
}

export default async function ClientReportPage({ params }: Props) {
  const saved = await getAudienceReportByToken((await params).token);
  if (!saved) notFound();

  // The minimum audience size is enforced here on the server: a too-small
  // report renders only the "too small" message, with no statistics.
  const report = buildAudienceReport(await reportRows(saved.responseIds));

  return (
    <div className="client-report">
      {report.state === "ok" && (
        <div className="report-actions no-print">
          <PrintButton />
        </div>
      )}
      <AudienceReportView
        report={report}
        title={saved.name}
        note={saved.note}
        meta={new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(saved.createdAt)}
      />
    </div>
  );
}
