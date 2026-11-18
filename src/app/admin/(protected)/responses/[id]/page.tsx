import Link from "next/link";
import { notFound } from "next/navigation";
import { DimensionBars } from "@/components/DimensionBars";
import { formatDate, industryLabel } from "@/lib/format";
import { POLE_INFO, versionDef } from "@/lib/questionnaire";
import { getResponse } from "@/lib/responses";
import { dimensionsFromScores, maxNetFor, pointsFor } from "@/lib/scoring";
import { oppositePole } from "@/lib/questionnaire";
import { removeResponse } from "../../../actions";
import { ConfirmButton } from "./ConfirmButton";

export default async function ResponseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getResponse(id);
  if (!row) notFound();
  const { statements, weights } = versionDef(row.questionnaireVersion);

  return (
    <>
      <p>
        <Link href="/admin">← All responses</Link>
      </p>
      <section className="card">
        <div className="admin-head">
          <div>
            <h1>{row.name}</h1>
            <p className="muted">
              {row.email} · {industryLabel(row)}
              {row.event && <> · Event: {row.event}</>}
            </p>
          </div>
          <div className="profile-chip">
            <strong>{row.profile}</strong> <span>{row.code}</span>
          </div>
        </div>
        <dl className="meta">
          <div>
            <dt>Submitted</dt>
            <dd>{formatDate(row.createdAt)}</dd>
          </div>
          <div>
            <dt>Consent given</dt>
            <dd>{formatDate(row.consentAt)}</dd>
          </div>
          <div>
            <dt>Questionnaire version</dt>
            <dd>{row.questionnaireVersion}</dd>
          </div>
          <div>
            <dt>Results link</dt>
            <dd>
              <Link href={`/results/${row.id}`}>Respondent view</Link>
            </dd>
          </div>
        </dl>
        <DimensionBars dimensions={dimensionsFromScores(row.scores, maxNetFor(row.questionnaireVersion))} />
      </section>

      <section className="card">
        <h2 className="section-title">Answers</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Statement</th>
                <th>Answer</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {statements.map((s, i) => {
                const a = row.answers[s.id];
                const p = a ? pointsFor(a, weights) : null;
                return (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td>{s.text}</td>
                    <td className="nowrap">
                      {a ? <>{a} <span className="muted">/ 6</span></> : "–"}
                    </td>
                    <td className="nowrap">
                      {p &&
                        `+${p.points} ${POLE_INFO[p.towardsAgreePole ? s.agreePole : oppositePole(s.agreePole)].label}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <form action={removeResponse} className="danger-zone">
        <input type="hidden" name="id" value={row.id} />
        <ConfirmButton message={`Permanently delete ${row.name}'s response? This can't be undone.`}>
          Delete this response
        </ConfirmButton>
      </form>
    </>
  );
}
