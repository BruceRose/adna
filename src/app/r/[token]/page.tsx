import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AudienceReportView } from "@/components/AudienceReportView";
import { PrintButton } from "@/components/ReportTools";
import { buildAudienceReport } from "@/lib/insights";
import { getAudienceReportByToken, reportScores } from "@/lib/reports";

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

  const report = buildAudienceReport(await reportScores(saved.responseIds));
  if (!report) notFound();

  return (
    <div className="client-report">
      <div className="report-actions no-print">
        <PrintButton />
      </div>
      <AudienceReportView
        report={report}
        title={saved.name}
        note={saved.note}
        meta={new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(saved.createdAt)}
      />
    </div>
  );
}
