"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePreferences } from "@/app/actions";
import { P2, P3, P4, P5, P6, P7, P8, labelFor, type P2RowId, type Preferences } from "@/lib/v3/items";
import { PreferenceQuestion, isAnswered, type DraftPreferences, type PrefKey } from "./PreferenceInputs";

const EDITABLE: PrefKey[] = ["P2", "P3", "P4", "P5", "P6", "P7", "P8"];
const P2_COLUMN_LABEL = (v: number) => P2.columns.find((c) => c.value === v)!.label;

/** Summary of P2-P8, with an editor. Trait answers are not editable. */
export function PreferencesPanel({ id, preferences, p2Order }: { id: string; preferences: Preferences; p2Order: P2RowId[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftPreferences>(preferences as unknown as DraftPreferences);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const complete = EDITABLE.every((k) => isAnswered(k, draft));

  if (!editing) {
    const rows: [string, React.ReactNode][] = [
      [
        P2.question,
        <ul key="p2" className="p2-summary">
          {P2.rows.map((r) => (
            <li key={r.id}>
              <span>{r.label}</span>
              <strong>{P2_COLUMN_LABEL(preferences.P2[r.id])}</strong>
            </li>
          ))}
        </ul>,
      ],
      [P3.question, preferences.P3.map((x) => labelFor(P3.options, x)).join("; ")],
      [P4.question, preferences.P4.map((x) => labelFor(P4.options, x)).join("; ")],
      [P5.question, labelFor(P5.options, preferences.P5)],
      [P6.question, P6.points.find((p) => p.value === preferences.P6)!.label],
      [P7.question, labelFor(P7.options, preferences.P7)],
      [P8.question, labelFor(P8.options, preferences.P8)],
    ];
    return (
      <div className="prefs">
        <dl className="pref-list">
          {rows.map(([q, a]) => (
            <div key={q}>
              <dt>{q.replace(/ Choose .*$/, "")}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
        {message && <p className="notice">{message}</p>}
        <button type="button" className="small" onClick={() => { setEditing(true); setMessage(null); }}>
          Edit my preferences
        </button>
      </div>
    );
  }

  return (
    <form
      className="prefs-editor"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await updatePreferences(id, draft as unknown as Preferences);
          if (res.ok) {
            setEditing(false);
            setMessage("Saved. Your recommendations have been updated.");
            router.refresh();
          } else setMessage(res.message);
        });
      }}
    >
      {EDITABLE.map((k) => (
        <div key={k} className="pref-edit-block">
          <PreferenceQuestion qkey={k} draft={draft} onChange={setDraft} p2Order={p2Order} headingLevel={3} />
        </div>
      ))}
      {message && <p className="error banner">{message}</p>}
      <div className="nav">
        <button type="button" className="ghost" onClick={() => { setEditing(false); setDraft(preferences as unknown as DraftPreferences); }}>
          Cancel
        </button>
        <button className="primary" disabled={!complete || pending}>
          {pending ? "Saving…" : "Save my preferences"}
        </button>
      </div>
    </form>
  );
}
