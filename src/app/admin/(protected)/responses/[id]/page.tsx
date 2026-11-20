import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatDate, industryLabel } from "@/lib/format";
import { getResponse } from "@/lib/responses";
import {
  C2,
  C3,
  FREE_TEXT,
  P1,
  P2,
  P3,
  P4,
  P5,
  P6,
  P7,
  P8,
  PILOT_ITEMS,
  SCALES,
  SCALE_IDS,
  TRAIT_ITEMS,
  labelFor,
} from "@/lib/v3/items";
import { itemValue } from "@/lib/v3/scoring";
import { LEVEL_NAMES, PLANNING_BADGES, STYLES, motivationLabel } from "@/lib/v3/styles";
import { removeResponse } from "../../../actions";

export default async function ResponseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getResponse(id);
  if (!row) notFound();

  const p = row.preferences;
  const m = row.meta;
  const seconds =
    m.part2StartedAt && m.part2EndedAt ? Math.round((Date.parse(m.part2EndedAt) - Date.parse(m.part2StartedAt)) / 1000) : null;

  const prefRows: [string, string][] = [
    [P1.question, p.P1.map((x) => labelFor(P1.options, x)).join("; ")],
    [P2.question, P2.rows.map((r) => `${r.label}: ${p.P2[r.id]}`).join("; ")],
    [P3.question, p.P3.map((x) => labelFor(P3.options, x)).join("; ")],
    [P4.question, p.P4.map((x) => labelFor(P4.options, x)).join("; ")],
    [P5.question, labelFor(P5.options, p.P5)],
    [P6.question, `${p.P6}: ${P6.points.find((x) => x.value === p.P6)!.label}`],
    [P7.question, labelFor(P7.options, p.P7)],
    [P8.question, labelFor(P8.options, p.P8)],
  ];

  return (
    <>
      <p>
        <Link href="/admin">← All responses</Link>
      </p>
      <section className="card">
        <div className="admin-head">
          <div>
            <h1>{row.anonymisedAt ? "Anonymised response" : row.name}</h1>
            {row.anonymisedAt && (
              <p className="notice subtle">
                Personal details deleted under the retention policy on {formatDate(row.anonymisedAt)}.
              </p>
            )}
            <p className="muted">
              {row.email} · {industryLabel(row)}
              {row.event && <> · Event: {row.event}</>}
              {row.wave && <> · Wave: {row.wave}</>}
              {row.attendeeRef && <> · Attendee ref: {row.attendeeRef}</>}
            </p>
          </div>
          <div className="profile-chip">
            <strong>{STYLES[row.style].name}</strong>
            {row.styleNeighbour && <span> + {STYLES[row.styleNeighbour].name}</span>}
          </div>
        </div>
        <dl className="meta">
          <Meta label="Submitted" value={formatDate(row.createdAt)} />
          <Meta label="Version / norms" value={`${row.questionnaireVersion} / ${row.normsVersion}`} />
          <Meta label="Source" value={row.source === "import" ? `Import${row.consentSource ? `: ${row.consentSource}` : ""}` : "Web"} />
          <Meta label="Consent version" value={row.consentVersion ?? "-"} />
          <Meta label="Role" value={labelFor(C2.options, row.context.role)} />
          <Meta label="Events in past 12 months" value={labelFor(C3.options, row.context.eventsAttended)} />
          <Meta label="Planning badge" value={row.badges.planning ? PLANNING_BADGES[row.badges.planning].label : "None"} />
          <Meta label="Motivation" value={motivationLabel(row.badges.motivation) ?? "None"} />
          <Meta label="Quality flags" value={row.qualityFlags.length ? row.qualityFlags.join(", ") : "None"} />
          <Meta label="Device" value={m.userAgentClass} />
          <div>
            <dt>Results link</dt>
            <dd>
              <Link href={`/results/${row.id}`}>Respondent view</Link>
            </dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="section-title">Scores</h2>
        <div className="table-wrap flat">
          <table>
            <thead>
              <tr>
                <th>Axis</th>
                <th>Score (1-5)</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {(["connecting", "ideas"] as const).map((a) => (
                <tr key={a}>
                  <td>{a === "connecting" ? "Connecting" : "Ideas"}</td>
                  <td>{row.axes[a].score.toFixed(2)}</td>
                  <td>{LEVEL_NAMES[a][row.axes[a].level]}</td>
                </tr>
              ))}
              {SCALE_IDS.map((s) => (
                <tr key={s}>
                  <td className="muted">
                    {s}: {SCALES[s].name}
                  </td>
                  <td>{row.scaleScores[s].toFixed(2)}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Part 2 answers</h2>
        <div className="table-wrap flat">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Key</th>
                <th>Statement</th>
                <th>Answer</th>
                <th>Scored</th>
              </tr>
            </thead>
            <tbody>
              {TRAIT_ITEMS.map((it) => {
                const a = row.answers[it.id];
                return (
                  <tr key={it.id}>
                    <td className="nowrap">{it.id}</td>
                    <td>{it.key === 1 ? "+1" : "-1"}</td>
                    <td>{it.text}</td>
                    <td>{a ?? "-"}</td>
                    <td>{a ? itemValue(it, a) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Preferences</h2>
        <dl className="pref-list">
          {prefRows.map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
          <div>
            <dt>{FREE_TEXT.question}</dt>
            <dd>{row.freeText ?? <span className="muted">No answer</span>}</dd>
          </div>
        </dl>
        {m.preferencesEditedAt && (
          <p className="muted small">
            Edited by the respondent {m.preferencesEditCount ?? 1} time(s), last on {formatDate(new Date(m.preferencesEditedAt))}.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">Timings and order</h2>
        <dl className="meta">
          <Meta label="Started" value={m.startedAt ?? "-"} />
          <Meta label="Part 2 started" value={m.part2StartedAt ?? "-"} />
          <Meta label="Part 2 ended" value={m.part2EndedAt ?? "-"} />
          <Meta label="Part 2 duration" value={seconds !== null ? `${seconds} seconds` : "-"} />
          <Meta label="Submitted" value={m.submittedAt} />
        </dl>
        <p className="small">
          <strong>Presented order:</strong> {m.presentedOrder.join(", ") || "-"}
        </p>
        {row.pilotAnswers && (
          <p className="small">
            <strong>Pilot markers:</strong>{" "}
            {PILOT_ITEMS.map((it) => `${it.id} ${row.pilotAnswers?.[it.id] ?? "-"}`).join(", ")}
          </p>
        )}
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
